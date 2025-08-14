from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token
from models import db, User

bp = Blueprint('auth', __name__)

@bp.route('/register', methods=['POST'])
def register():
    data = request.json
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'msg': 'Email já cadastrado'}), 400
    user = User(
        name=data['name'],
        email=data['email'],
        password_hash=generate_password_hash(data['password']),
        role=data.get('role','vendedor'),
        loja_parceira=data.get('loja_parceira')
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({'msg':'Usuario criado'}), 201

@bp.route('/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(email=data['email']).first()
    if not user or not check_password_hash(user.password_hash, data['password']):
        return jsonify({'msg':'Credenciais inválidas'}), 401
    token = create_access_token(identity={'id': user.id, 'role': user.role})
    return jsonify({'access_token': token, 'user': {'id': user.id, 'name': user.name, 'role': user.role, 'loja_parceira': user.loja_parceira}})