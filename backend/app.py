import os
from datetime import datetime, date
from functools import wraps

from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
)
from werkzeug.security import check_password_hash, generate_password_hash
from sqlalchemy import text, func
from dotenv import load_dotenv

# Para tokens de redefinição de senha (mantido, pois você já usa /auth/forgot e /auth/reset)
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

load_dotenv()

app = Flask(__name__)

# ====== CONEXÃO COM O POSTGRES ======
app.config['SQLALCHEMY_DATABASE_URI'] = (
    os.getenv('DATABASE_URL')
    or 'postgresql+psycopg2://postgres:Aj8%24teste@localhost:5432/postgres'
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'dev-secret')
# ====================================

db = SQLAlchemy(app)
CORS(app)
JWTManager(app)

# ===================== MODELOS =====================
class Vendedor(db.Model):
    __tablename__ = 'vendedores'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    senha_hash = db.Column(db.String(255), nullable=False)
    loja_parceira = db.Column(db.String(255))
    role = db.Column(db.String(20), nullable=False, default='vendedor')  # vendedor | admin
    tipo = db.Column(db.String(20), nullable=True)  # interno | parceiro
    inicio_vigencia = db.Column(db.Date, nullable=True)
    fim_vigencia = db.Column(db.Date, nullable=True)

class RegraComissao(db.Model):
    __tablename__ = 'regras_comissao'
    id = db.Column(db.Integer, primary_key=True)
    vendedor_id = db.Column(db.Integer, db.ForeignKey('vendedores.id'), nullable=True)  # nulo = global
    valor_min = db.Column(db.Float, nullable=False)
    valor_max = db.Column(db.Float, nullable=True)
    percentual = db.Column(db.Float, nullable=False)

class Venda(db.Model):
    __tablename__ = 'vendas'
    id = db.Column(db.Integer, primary_key=True)
    vendedor_id = db.Column(db.Integer, db.ForeignKey('vendedores.id'), nullable=False)
    cliente_nome = db.Column(db.String(255), nullable=False)
    cliente_documento = db.Column(db.String(30), nullable=False)
    valor = db.Column(db.Float, nullable=False)
    banco = db.Column(db.String(150), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='enviada')
    data_venda = db.Column(db.DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    loja_parceira = db.Column(db.String(255))
    observacoes = db.Column(db.Text)
    # referências opcionais
    banco_id = db.Column(db.Integer, nullable=True)
    loja_parceira_id = db.Column(db.Integer, nullable=True)

class Banco(db.Model):
    __tablename__ = 'bancos'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(150), nullable=False)
    codigo = db.Column(db.String(20))
    ativo = db.Column(db.Boolean, nullable=False, default=True)

class LojaParceira(db.Model):
    __tablename__ = 'lojas_parceiras'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(150), nullable=False)
    cnpj = db.Column(db.String(20))
    cidade = db.Column(db.String(120))
    ativo = db.Column(db.Boolean, nullable=False, default=True)

# ============== UTIL CPF/CNPJ ==============
def apenas_digitos(s: str) -> str:
    return ''.join(ch for ch in (s or '') if ch.isdigit())

def valida_cpf(cpf: str) -> bool:
    cpf = apenas_digitos(cpf)
    if len(cpf) != 11 or cpf == cpf[0]*11:
        return False
    soma = sum(int(cpf[i])*(10-i) for i in range(9))
    d1 = (soma*10) % 11
    d1 = 0 if d1 == 10 else d1
    soma = sum(int(cpf[i])*(11-i) for i in range(10))
    d2 = (soma*10) % 11
    d2 = 0 if d2 == 10 else d2
    return cpf[-2:] == f"{d1}{d2}"

def valida_cnpj(cnpj: str) -> bool:
    cnpj = apenas_digitos(cnpj)
    if len(cnpj) != 14 or cnpj == cnpj[0]*14:
        return False
    pesos1 = [5,4,3,2,9,8,7,6,5,4,3,2]
    pesos2 = [6] + pesos1
    soma = sum(int(cnpj[i])*pesos1[i] for i in range(12))
    d1 = 11 - (soma % 11); d1 = 0 if d1 >= 10 else d1
    soma = sum(int(cnpj[i])*pesos2[i] for i in range(13))
    d2 = 11 - (soma % 11); d2 = 0 if d2 >= 10 else d2
    return cnpj[-2:] == f"{d1}{d2}"

def valida_documento(doc: str) -> bool:
    d = apenas_digitos(doc or '')
    if len(d) == 11: return valida_cpf(d)
    if len(d) == 14: return valida_cnpj(d)
    return False

# ============ COMISSÃO POR FAIXAS ============
def calcular_comissao(vendedor_id: int, valor_venda: float) -> float:
    regras = (RegraComissao.query
              .filter((RegraComissao.vendedor_id == vendedor_id) | (RegraComissao.vendedor_id.is_(None)))
              .order_by(RegraComissao.valor_min.asc())
              .all())
    faixa = None
    for r in regras:
        if r.valor_max is None and valor_venda >= r.valor_min:
            faixa = r
        elif r.valor_max is not None and r.valor_min <= valor_venda <= r.valor_max:
            faixa = r
    return round(valor_venda * (faixa.percentual/100.0), 2) if faixa else 0.0

# ================ HELPERS AUTH/ROLE =================
def dentro_vigencia(u: Vendedor) -> bool:
    hoje = date.today()
    if u.inicio_vigencia and hoje < u.inicio_vigencia: return False
    if u.fim_vigencia and hoje > u.fim_vigencia: return False
    return True

def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get('role') != 'admin':
            return jsonify({'msg': 'Acesso restrito a administradores'}), 403
        return fn(*args, **kwargs)
    return wrapper

def parse_date(s):
    if not s: return None
    try:
        return datetime.strptime(s, '%Y-%m-%d').date()
    except Exception:
        return None

def parse_month(s: str):
    if not s: return None
    try:
        y, m = s.split('-'); y = int(y); m = int(m)
        return y, m
    except Exception:
        return None

# ======== TOKEN DE RESET (para /auth/forgot e /auth/reset) ========
def _pwd_reset_serializer():
    secret = app.config.get('JWT_SECRET_KEY', 'dev-secret')
    return URLSafeTimedSerializer(secret_key=secret, salt='pwd-reset')

# ===================== AUTH =====================
@app.post('/auth/login')
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    raw_pwd = data.get('password') if 'password' in data else data.get('senha')
    senha = raw_pwd.strip() if isinstance(raw_pwd, str) else None

    if not email or not senha:
        return jsonify({'msg': 'Email e senha são obrigatórios'}), 400

    user = Vendedor.query.filter(func.lower(Vendedor.email) == email).first()
    if not user or not check_password_hash(user.senha_hash, senha):
        return jsonify({'msg': 'Credenciais inválidas'}), 401

    if not dentro_vigencia(user):
        return jsonify({'msg': 'Usuário fora de vigência'}), 403

    token = create_access_token(identity=str(user.id), additional_claims={'role': user.role})
    return jsonify({
        'access_token': token,
        'user': {
            'id': user.id, 'nome': user.nome, 'role': user.role,
            'loja_parceira': user.loja_parceira, 'tipo': user.tipo,
            'inicio_vigencia': (user.inicio_vigencia.isoformat() if user.inicio_vigencia else None),
            'fim_vigencia': (user.fim_vigencia.isoformat() if user.fim_vigencia else None),
        }
    })

# ======== NOVOS ENDPOINTS usados pelo fluxo direto no front ========

@app.post('/auth/check-email')
def check_email():
    """
    Recebe: { "email": "..." }
    Retorna: { "exists": true|false }
    """
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    if not email:
        return jsonify({'exists': False, 'msg': 'E-mail obrigatório'}), 200

    user = Vendedor.query.filter(func.lower(Vendedor.email) == email).first()
    return jsonify({'exists': bool(user)}), 200

@app.post('/auth/reset-password')
def reset_password_direct():
    """
    Recebe: { "email": "...", "password": "..." }
    Troca a senha diretamente pelo e-mail (sem token).
    """
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    nova = (data.get('password') or data.get('nova_senha') or '').strip()

    if not email or not nova:
        return jsonify({'msg': 'Email e nova senha são obrigatórios'}), 400
    if len(nova) < 6:
        return jsonify({'msg': 'A nova senha deve ter pelo menos 6 caracteres'}), 400

    user = Vendedor.query.filter(func.lower(Vendedor.email) == email).first()
    if not user:
        return jsonify({'msg': 'E-mail não encontrado'}), 404

    user.senha_hash = generate_password_hash(nova, method='pbkdf2:sha256', salt_length=16)
    db.session.commit()
    return jsonify({'msg': 'Senha redefinida com sucesso'}), 200

# ======== ESQUECI MINHA SENHA (atualizado para devolver token/url) ========
@app.post('/auth/forgot')
def forgot_password():
    """
    Recebe: { "email": "..." }
    - 400 se e-mail vazio
    - 404 se e-mail não cadastrado
    - 200 com { token, url } se cadastrado
    """
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    if not email:
        return jsonify({'msg': 'Informe um e-mail'}), 400

    user = Vendedor.query.filter(func.lower(Vendedor.email) == email).first()
    if not user:
        return jsonify({'msg': 'E-mail não encontrado'}), 404

    s = _pwd_reset_serializer()
    reset_token = s.dumps({'uid': user.id, 'email': user.email})

    base = os.getenv('FRONTEND_BASE_URL', 'http://localhost:3000')
    reset_url = f'{base}/reset?token={reset_token}'

    app.logger.info('*** RESET DE SENHA ***')
    app.logger.info('Usuário: %s (%s)', user.nome, user.email)
    app.logger.info('URL: %s', reset_url)

    return jsonify({'msg': 'OK', 'token': reset_token, 'url': reset_url}), 200

@app.post('/auth/reset')
def reset_password():
    """
    Recebe: { "token": "...", "nova_senha": "..." }
    Valida o token (expira em 3600s = 1h), troca a senha do usuário.
    """
    data = request.get_json(silent=True) or {}
    token = (data.get('token') or '').strip()
    nova = (data.get('nova_senha') or '').strip()

    if not token or not nova:
        return jsonify({'msg': 'Token e nova senha são obrigatórios'}), 400
    if len(nova) < 6:
        return jsonify({'msg': 'A nova senha deve ter pelo menos 6 caracteres'}), 400

    s = _pwd_reset_serializer()
    try:
        payload = s.loads(token, max_age=3600)  # 1 hora
        uid = int(payload.get('uid'))
    except SignatureExpired:
        return jsonify({'msg': 'Token expirado. Solicite novamente.'}), 400
    except (BadSignature, Exception):
        return jsonify({'msg': 'Token inválido'}), 400

    user = Vendedor.query.get(uid)
    if not user:
        return jsonify({'msg': 'Usuário não encontrado'}), 404

    user.senha_hash = generate_password_hash(nova, method='pbkdf2:sha256', salt_length=16)
    db.session.commit()
    return jsonify({'msg': 'Senha redefinida com sucesso'}), 200

# ===================== BANCOS =====================
@app.get('/banks')
@jwt_required()
def list_banks():
    rows = Banco.query.order_by(Banco.nome.asc()).all()
    return jsonify([{'id': r.id, 'nome': r.nome, 'codigo': r.codigo, 'ativo': r.ativo} for r in rows])

@app.post('/banks')
@jwt_required()
@admin_required
def create_bank():
    data = request.get_json(silent=True) or {}
    nome = (data.get('nome') or '').strip()
    if not nome:
        return jsonify({'msg': 'Nome é obrigatório'}), 400
    b = Banco(nome=nome, codigo=(data.get('codigo') or '').strip() or None, ativo=bool(data.get('ativo', True)))
    db.session.add(b)
    db.session.commit()
    return jsonify({'id': b.id}), 201

@app.put('/banks/<int:bank_id>')
@jwt_required()
@admin_required
def update_bank(bank_id):
    b = Banco.query.get_or_404(bank_id)
    data = request.get_json(silent=True) or {}
    if 'nome' in data:
        nome = (data.get('nome') or '').strip()
        if not nome: return jsonify({'msg': 'Nome inválido'}), 400
        b.nome = nome
    if 'codigo' in data:
        b.codigo = (data.get('codigo') or '').strip() or None
    if 'ativo' in data:
        b.ativo = bool(data.get('ativo'))
    db.session.commit()
    return jsonify({'ok': True})

# ===================== LOJAS =====================
@app.get('/stores')
@jwt_required()
def list_stores():
    rows = LojaParceira.query.order_by(LojaParceira.nome.asc()).all()
    return jsonify([{'id': r.id, 'nome': r.nome, 'cnpj': r.cnpj, 'cidade': r.cidade, 'ativo': r.ativo} for r in rows])

@app.post('/stores')
@jwt_required()
@admin_required
def create_store():
    data = request.get_json(silent=True) or {}
    nome = (data.get('nome') or '').strip()
    if not nome:
        return jsonify({'msg': 'Nome é obrigatório'}), 400
    l = LojaParceira(
        nome=nome,
        cnpj=(data.get('cnpj') or '').strip() or None,
        cidade=(data.get('cidade') or '').strip() or None,
        ativo=bool(data.get('ativo', True))
    )
    db.session.add(l)
    db.session.commit()
    return jsonify({'id': l.id}), 201

@app.put('/stores/<int:store_id>')
@jwt_required()
@admin_required
def update_store(store_id):
    l = LojaParceira.query.get_or_404(store_id)
    data = request.get_json(silent=True) or {}
    if 'nome' in data:
        nome = (data.get('nome') or '').strip()
        if not nome: return jsonify({'msg': 'Nome inválido'}), 400
        l.nome = nome
    if 'cnpj' in data:
        cnpj = (data.get('cnpj') or '').strip()
        if cnpj and not valida_cnpj(cnpj):
            return jsonify({'msg': 'CNPJ inválido'}), 400
        l.cnpj = cnpj or None
    if 'cidade' in data:
        l.cidade = (data.get('cidade') or '').strip() or None
    if 'ativo' in data:
        l.ativo = bool(data.get('ativo'))
    db.session.commit()
    return jsonify({'ok': True})

# ===================== VENDEDORES (ADMIN) =====================
@app.get('/sellers')
@jwt_required()
@admin_required
def list_sellers():
    rows = Vendedor.query.order_by(Vendedor.nome.asc()).all()
    return jsonify([{
        'id': r.id, 'nome': r.nome, 'email': r.email, 'role': r.role,
        'loja_parceira': r.loja_parceira, 'tipo': r.tipo,
        'inicio_vigencia': (r.inicio_vigencia.isoformat() if r.inicio_vigencia else None),
        'fim_vigencia': (r.fim_vigencia.isoformat() if r.fim_vigencia else None),
    } for r in rows])

@app.post('/sellers')
@jwt_required()
@admin_required
def create_seller():
    data = request.get_json(silent=True) or {}
    nome = (data.get('nome') or '').strip()
    email = (data.get('email') or '').strip().lower()
    senha = (data.get('senha') or '').strip()
    role = (data.get('role') or 'vendedor').strip()
    tipo = (data.get('tipo') or 'interno').strip()
    loja_parceira = (data.get('loja_parceira') or '').strip() or ('AJ8' if tipo == 'interno' else None)
    inicio = parse_date(data.get('inicio_vigencia'))
    fim = parse_date(data.get('fim_vigencia'))

    if not nome or not email or not senha:
        return jsonify({'msg': 'Nome, email e senha são obrigatórios'}), 400
    if role not in ('vendedor', 'admin'):
        return jsonify({'msg': 'Role inválida'}), 400
    if tipo not in ('interno', 'parceiro'):
        return jsonify({'msg': 'Tipo inválida'}), 400
    if Vendedor.query.filter(func.lower(Vendedor.email) == email).first():
        return jsonify({'msg': 'E-mail já cadastrado'}), 409

    u = Vendedor(
        nome=nome,
        email=email,
        senha_hash=generate_password_hash(senha, method='pbkdf2:sha256', salt_length=16),
        role=role,
        tipo=tipo,
        loja_parceira=loja_parceira,
        inicio_vigencia=inicio,
        fim_vigencia=fim
    )
    db.session.add(u)
    db.session.commit()
    return jsonify({'id': u.id}), 201

@app.put('/sellers/<int:seller_id>')
@jwt_required()
@admin_required
def update_seller(seller_id):
    u = Vendedor.query.get_or_404(seller_id)
    data = request.get_json(silent=True) or {}
    if 'nome' in data:
        n = (data.get('nome') or '').strip()
        if not n: return jsonify({'msg': 'Nome inválido'}), 400
        u.nome = n
    if 'email' in data:
        e = (data.get('email') or '').strip().lower()
        if not e: return jsonify({'msg': 'Email inválido'}), 400
        if Vendedor.query.filter(func.lower(Vendedor.email) == e, Vendedor.id != u.id).first():
            return jsonify({'msg': 'E-mail já em uso'}), 409
        u.email = e
    if 'senha' in data and (data.get('senha') or '').strip():
        u.senha_hash = generate_password_hash((data.get('senha') or '').strip(), method='pbkdf2:sha256', salt_length=16)
    if 'role' in data:
        r = (data.get('role') or '').strip()
        if r not in ('vendedor', 'admin'): return jsonify({'msg': 'Role inválida'}), 400
        u.role = r
    if 'tipo' in data:
        t = (data.get('tipo') or '').strip()
        if t not in ('interno', 'parceiro'): return jsonify({'msg': 'Tipo inválido'}), 400
        u.tipo = t
        if t == 'interno' and not data.get('loja_parceira'):
            u.loja_parceira = 'AJ8'
    if 'loja_parceira' in data:
        u.loja_parceira = (data.get('loja_parceira') or '').strip() or None
    if 'inicio_vigencia' in data:
        u.inicio_vigencia = parse_date(data.get('inicio_vigencia'))
    if 'fim_vigencia' in data:
        u.fim_vigencia = parse_date(data.get('fim_vigencia'))

    db.session.commit()
    return jsonify({'ok': True})

# ===================== VENDAS =====================
@app.get('/sales')
@jwt_required()
def list_sales():
    claims = get_jwt(); role = claims.get('role')
    uid = int(get_jwt_identity())

    q = db.session.query(Venda)

    # filtros básicos (texto)
    cliente = request.args.get('cliente_nome')
    doc = request.args.get('cliente_documento')
    status = request.args.get('status')

    if cliente:
        q = q.filter(Venda.cliente_nome.ilike(f'%{cliente}%'))
    if doc:
        q = q.filter(Venda.cliente_documento.ilike(f'%{doc}%'))
    if status:
        q = q.filter(Venda.status == status)

    # filtros por id de referência
    banco_id = request.args.get('banco_id', type=int)
    loja_id = request.args.get('loja_id', type=int)
    vendedor_id = request.args.get('vendedor_id', type=int) if role == 'admin' else None

    if banco_id:
        q = q.filter(Venda.banco_id == banco_id)
    if loja_id:
        q = q.filter(Venda.loja_parceira_id == loja_id)
    if role != 'admin':
        q = q.filter(Venda.vendedor_id == uid)
    elif vendedor_id:
        q = q.filter(Venda.vendedor_id == vendedor_id)

    vendas = q.order_by(Venda.data_venda.desc()).limit(1000).all()

    # map vendedor names (para admin)
    nomes = {}
    if role == 'admin' and vendas:
        vids = {v.vendedor_id for v in vendas}
        for r in Vendedor.query.filter(Vendedor.id.in_(vids)).all():
            nomes[r.id] = r.nome

    out = []
    for v in vendas:
        out.append({
            'id': v.id,
            'vendedor_id': v.vendedor_id,
            'vendedor_nome': nomes.get(v.vendedor_id),
            'cliente_nome': v.cliente_nome,
            'cliente_documento': v.cliente_documento,
            'valor': float(v.valor),
            'banco': v.banco,
            'status': v.status,
            'data_venda': v.data_venda.isoformat() if v.data_venda else None,
            'loja_parceira': v.loja_parceira,
            'banco_id': v.banco_id,
            'loja_parceira_id': v.loja_parceira_id,
            'comissao': calcular_comissao(v.vendedor_id, v.valor)
        })
    return jsonify(out)

@app.post('/sales')
@jwt_required()
def create_sale():
    uid = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    try:
        cliente_nome = (data.get('cliente_nome') or '').strip()
        cliente_documento = apenas_digitos(data.get('cliente_documento') or '')
        valor = float(data.get('valor'))
        status = (data.get('status') or 'enviada').strip()
        observacoes = (data.get('observacoes') or '').strip() or None
        banco_id = data.get('banco_id')
        loja_id = data.get('loja_parceira_id')
    except Exception:
        return jsonify({'msg': 'Dados inválidos'}), 400

    if not cliente_nome or not cliente_documento or not valor:
        return jsonify({'msg': 'Cliente, documento e valor são obrigatórios'}), 400
    if not valida_documento(cliente_documento):
        return jsonify({'msg': 'CPF/CNPJ inválido'}), 400
    if status not in ('enviada','aceita','recusada'):
        return jsonify({'msg': 'Status inválido'}), 400

    # resolve nomes por id (se fornecidos)
    banco_nome = None
    loja_nome = None
    if banco_id:
        b = Banco.query.get(banco_id)
        if not b: return jsonify({'msg': 'Banco não encontrado'}), 404
        banco_nome = b.nome
    if loja_id:
        l = LojaParceira.query.get(loja_id)
        if not l: return jsonify({'msg': 'Loja parceira não encontrada'}), 404
        loja_nome = l.nome

    v = Venda(
        vendedor_id=uid,
        cliente_nome=cliente_nome,
        cliente_documento=cliente_documento,
        valor=valor,
        status=status,
        observacoes=observacoes,
        data_venda=datetime.utcnow(),
        banco=banco_nome or (data.get('banco') or '').strip() or '—',
        loja_parceira=loja_nome or (data.get('loja_parceira') or '').strip() or None,
        banco_id=banco_id,
        loja_parceira_id=loja_id
    )
    db.session.add(v)
    db.session.flush()  # pega id

    comissao = calcular_comissao(uid, valor)
    db.session.commit()
    return jsonify({'id': v.id, 'comissao': comissao}), 201

@app.put('/sales/<int:sale_id>')
@jwt_required()
def update_sale(sale_id):
    uid = int(get_jwt_identity())
    claims = get_jwt(); role = claims.get('role')
    v = Venda.query.get_or_404(sale_id)
    if role != 'admin' and v.vendedor_id != uid:
        return jsonify({'msg': 'Você não pode alterar esta venda'}), 403

    data = request.get_json(silent=True) or {}
    if 'cliente_nome' in data:
        n = (data.get('cliente_nome') or '').strip()
        if not n: return jsonify({'msg': 'Nome inválido'}), 400
        v.cliente_nome = n
    if 'cliente_documento' in data:
        d = apenas_digitos(data.get('cliente_documento') or '')
        if not valida_documento(d): return jsonify({'msg': 'CPF/CNPJ inválido'}), 400
        v.cliente_documento = d
    if 'valor' in data:
        try:
            v.valor = float(data.get('valor'))
        except Exception:
            return jsonify({'msg': 'Valor inválido'}), 400
    if 'status' in data:
        s = (data.get('status') or '').strip()
        if s not in ('enviada','aceita','recusada'):
            return jsonify({'msg': 'Status inválido'}), 400
        v.status = s
    if 'observacoes' in data:
        v.observacoes = (data.get('observacoes') or '').strip() or None

    # atualizar refs/nomes
    if 'banco_id' in data:
        bid = data.get('banco_id')
        if bid:
            b = Banco.query.get(bid)
            if not b: return jsonify({'msg': 'Banco não encontrado'}), 404
            v.banco_id = bid; v.banco = b.nome
        else:
            v.banco_id = None
    if 'loja_parceira_id' in data:
        lid = data.get('loja_parceira_id')
        if lid:
            l = LojaParceira.query.get(lid)
            if not l: return jsonify({'msg': 'Loja parceira não encontrada'}), 404
            v.loja_parceira_id = lid; v.loja_parceira = l.nome
        else:
            v.loja_parceira_id = None

    db.session.commit()
    return jsonify({'ok': True})

# ===================== STATS / DASHBOARD =====================
@app.get('/stats/summary')
@jwt_required()
def stats_summary():
    """
    Resumo para Dashboard com filtros:
      start=YYYY-MM, end=YYYY-MM
      status=enviada|aceita|recusada
      banco_id, loja_id
      vendedor_id (apenas admin)
    """
    claims = get_jwt()
    role = claims.get('role')
    uid = int(get_jwt_identity())

    start = request.args.get('start')
    end = request.args.get('end')
    status = request.args.get('status', type=str)
    banco_id = request.args.get('banco_id', type=int)
    loja_id = request.args.get('loja_id', type=int)
    vendedor_id = request.args.get('vendedor_id', type=int) if role == 'admin' else None

    today = datetime.utcnow().date()
    if not end:
        end_year, end_month = today.year, today.month
    else:
        y, m = parse_month(end) or (today.year, today.month)
        end_year, end_month = y, m
    if not start:
        mspan = (end_year*12 + end_month) - 5
        start_year, start_month = divmod(mspan-1, 12); start_year += 1; start_month += 1
    else:
        y, m = parse_month(start) or (today.year, today.month)
        start_year, start_month = y, m

    start_dt = datetime(start_year, start_month, 1)
    next_y = end_year + (1 if end_month == 12 else 0)
    next_m = 1 if end_month == 12 else end_month + 1
    end_dt = datetime(next_y, next_m, 1)

    q = db.session.query(Venda).filter(Venda.data_venda >= start_dt, Venda.data_venda < end_dt)
    if role != 'admin':
        q = q.filter(Venda.vendedor_id == uid)
    if status:
        q = q.filter(Venda.status == status)
    if banco_id:
        q = q.filter(Venda.banco_id == banco_id)
    if loja_id:
        q = q.filter(Venda.loja_parceira_id == loja_id)
    if vendedor_id:
        q = q.filter(Venda.vendedor_id == vendedor_id)

    total_count = q.count()
    total_sum = q.with_entities(func.coalesce(func.sum(Venda.valor), 0.0)).scalar() or 0.0

    q_aceitas = q.filter(Venda.status == 'aceita')
    aceitas_count = q_aceitas.count()
    conversion_rate = (aceitas_count / total_count) * 100.0 if total_count else 0.0

    month_col = func.date_trunc('month', Venda.data_venda).label('mes')
    by_month_rows = (
        q.with_entities(month_col, func.count(), func.coalesce(func.sum(Venda.valor), 0.0))
         .group_by(month_col).order_by(month_col).all()
    )
    by_month = [{'month': r[0].date().isoformat()[:7], 'count': int(r[1]), 'sum': float(r[2] or 0.0)} for r in by_month_rows]

    by_status_rows = q.with_entities(Venda.status, func.count(), func.coalesce(func.sum(Venda.valor), 0.0)).group_by(Venda.status).all()
    by_status = [{'status': s or '', 'count': int(c), 'sum': float(v or 0.0)} for (s,c,v) in by_status_rows]

    by_bank_rows = q.with_entities(Venda.banco, func.count(), func.coalesce(func.sum(Venda.valor), 0.0)).group_by(Venda.banco).order_by(func.count().desc()).limit(10).all()
    by_bank = [{'banco': b or '', 'count': int(c), 'sum': float(v or 0.0)} for (b,c,v) in by_bank_rows]

    by_store_rows = q.with_entities(Venda.loja_parceira, func.count(), func.coalesce(func.sum(Venda.valor), 0.0)).group_by(Venda.loja_parceira).order_by(func.count().desc()).limit(10).all()
    by_store = [{'loja': l or '', 'count': int(c), 'sum': float(v or 0.0)} for (l,c,v) in by_store_rows]

    by_seller = []
    if role == 'admin':
        by_seller_rows = (
            q.join(Vendedor, Vendedor.id == Venda.vendedor_id)
             .with_entities(Venda.vendedor_id, Vendedor.nome, func.count(), func.coalesce(func.sum(Venda.valor), 0.0))
             .group_by(Venda.vendedor_id, Vendedor.nome)
             .order_by(func.count().desc()).limit(20).all()
        )
        by_seller = [{'vendedor_id': int(vid), 'vendedor_nome': (vnome or ''), 'count': int(c), 'sum': float(v or 0.0)}
                     for (vid, vnome, c, v) in by_seller_rows]

    return jsonify({
        'range': {'start': start_dt.date().isoformat(), 'end_exclusive': end_dt.date().isoformat()},
        'filters_echo': {
            'status': status, 'banco_id': banco_id, 'loja_id': loja_id,
            'vendedor_id': vendedor_id if role=='admin' else None
        },
        'totals': {'count': int(total_count), 'sum': float(total_sum)},
        'conversion': {'accepted': int(aceitas_count), 'rate': round(conversion_rate, 2)},
        'by_month': by_month,
        'by_status': by_status,
        'by_bank': by_bank,
        'by_store': by_store,
        'by_seller': by_seller
    })

# ---------- Debug ----------
@app.get('/_debug/db')
def debug_db():
    dbname = db.session.execute(text('SELECT current_database();')).scalar()
    return jsonify({'current_database': dbname})

if __name__ == '__main__':
    app.run(debug=True)
