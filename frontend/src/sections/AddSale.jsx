// frontend/src/sections/AddSale.jsx
import React, { useEffect, useMemo, useState } from 'react';
import api from '../api';

function onlyDigits(s=''){ return s.replace(/\D/g,''); }
function maskCpfCnpj(v=''){
  const d = onlyDigits(v);
  if(d.length <= 11){ // CPF: 000.000.000-00
    return d
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})$/, '$1.$2.$3-$4');
  }
  // CNPJ: 00.000.000/0000-00
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d{1,2})$/, '$1.$2.$3/$4-$5');
}
function fmtPct(n){
  if (n == null) return '';
  const v = Number(n);
  return Number.isFinite(v)
    ? v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'
    : '';
}

export default function AddSale({ onCreated, onBankChange }){
  const [cliente_nome,setCliente] = useState('');
  const [cliente_documento,setDoc] = useState('');
  const [valor,setValor] = useState('');
  const [status,setStatus] = useState('enviada');
  const [observacoes,setObs] = useState('');

  const [bancos, setBancos] = useState([]);
  const [lojas, setLojas] = useState([]);

  const [banco_id, setBancoId] = useState('');
  const [loja_parceira_id, setLojaId] = useState('');

  // comissão escolhida (em %)
  const [percComissao, setPercComissao] = useState('');

  const [msg,setMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [rb, rl] = await Promise.all([api.get('/banks'), api.get('/stores')]);
        setBancos((rb.data || []).filter(b=>b.ativo));
        setLojas((rl.data || []).filter(l=>l.ativo));
      } catch {}
    })();
  },[]);

  // lista de comissões do banco selecionado (para preencher o select)
  const commissions = useMemo(() => {
    const b = bancos.find(x => String(x.id) === String(banco_id));
    const list = Array.isArray(b?.comissoes) ? b.comissoes : [];
    return [...list].map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
  }, [bancos, banco_id]);

  // ao trocar o banco: limpa a comissão e (opcional) avisa o pai
  useEffect(() => {
    setPercComissao('');
    if (onBankChange) {
      const bank = bancos.find(b => String(b.id) === String(banco_id));
      if (bank) {
        const raw = Array.isArray(bank.comissoes) ? bank.comissoes : [];
        const norm = [...raw].map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
        onBankChange({
          bankId: bank.id,
          bankName: bank.nome,
          commissions: norm
        });
      } else {
        onBankChange(null);
      }
    }
  }, [banco_id, bancos, onBankChange]);

  function onChangeDoc(e){
    const value = e.target.value || '';
    setDoc(maskCpfCnpj(value));
  }

  async function submit(e){
    e.preventDefault();
    setMsg('');

    const payload = {
      cliente_nome,
      cliente_documento: onlyDigits(cliente_documento),
      valor: parseFloat((valor||'').toString().replace(',','.')),
      status,
      observacoes,
      banco_id: banco_id || undefined,
      loja_parceira_id: loja_parceira_id || undefined,
      // envia a comissão escolhida (em %)
      perc_comissao_aplicado: percComissao ? Number(percComissao) : undefined,
    };

    try{
      const { data } = await api.post('/sales', payload);
      setMsg(`Venda #${data.id} salva.`);
      // limpa
      setCliente(''); setDoc(''); setValor(''); setStatus('enviada'); setObs('');
      setBancoId(''); setLojaId(''); setPercComissao('');
      onCreated?.();
      onBankChange?.(null);
    }catch(err){
      setMsg(err?.response?.data?.msg || 'Erro ao salvar');
    }
  }

  // loja atualmente selecionada (para exibir repasse, se quiser)
  const lojaSelecionada = useMemo(
    () => lojas.find(l => String(l.id) === String(loja_parceira_id)),
    [lojas, loja_parceira_id]
  );

  return (
    <form onSubmit={submit} className="mb-4" style={{maxWidth: 720}}>
      <h4 className="mb-3">Cadastrar venda</h4>
      <div className="row g-2">
        <div className="col-md-6">
          <input className="form-control" placeholder="Nome do cliente"
                 value={cliente_nome} onChange={e=>setCliente(e.target.value)} required/>
        </div>
        <div className="col-md-6">
          <input className="form-control" placeholder="CPF/CNPJ"
                 value={cliente_documento} onChange={onChangeDoc} required/>
        </div>

        <div className="col-md-4">
          <input className="form-control" placeholder="Valor (ex: 35000)"
                 value={valor} onChange={e=>setValor(e.target.value)} required/>
        </div>

        {/* Banco */}
        <div className="col-md-4">
          <select
            className="form-select"
            name="banco_id"
            id="banco_id"
            value={banco_id}
            onChange={e=>setBancoId(e.target.value)}
          >
            <option value="">Selecione o banco</option>
            {bancos.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
          </select>
        </div>

        {/* Loja parceira (novo campo) */}
        <div className="col-md-4">
          <select
            className="form-select"
            name="loja_parceira_id"
            id="loja_parceira_id"
            value={loja_parceira_id}
            onChange={e=>setLojaId(e.target.value)}
          >
            <option value="">Selecione a loja (opcional)</option>
            {lojas.map(l => (
              <option key={l.id} value={l.id}>
                {l.nome}
                {l.repasse != null ? ` — repasse ${Number(l.repasse).toLocaleString('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:2})}%` : ''}
              </option>
            ))}
          </select>
          {/* dica pequena abaixo do select, se a loja tiver repasse */}
          {lojaSelecionada?.repasse != null && (
            <small className="text-muted">
              Repasse da loja: {Number(lojaSelecionada.repasse).toLocaleString('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:2})}%{/* vigência opcional */}
              {lojaSelecionada.data_inicio ? ` • início ${new Date(lojaSelecionada.data_inicio).toLocaleDateString('pt-BR')}` : ''}
              {lojaSelecionada.data_fim ? ` • fim ${new Date(lojaSelecionada.data_fim).toLocaleDateString('pt-BR')}` : ''}
            </small>
          )}
        </div>

        {/* Comissão dependente do banco */}
        <div className="col-md-4">
          <select
            className="form-select"
            name="perc_comissao"
            id="perc_comissao"
            value={percComissao}
            onChange={e=>setPercComissao(e.target.value)}
            disabled={!commissions.length}
            title={commissions.length ? 'Escolha a comissão' : 'Este banco não possui comissões cadastradas'}
          >
            <option value="">{commissions.length ? 'Comissão' : 'Sem comissões'}</option>
            {commissions.map((v, i) => (
              <option key={i} value={v}>{fmtPct(v)}</option>
            ))}
          </select>
        </div>

        <div className="col-md-4">
          <select className="form-select" value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="enviada">Enviada</option>
            <option value="aceita">Aceita</option>
            <option value="recusada">Recusada</option>
          </select>
        </div>

        <div className="col-md-8">
          <input className="form-control" placeholder="Observações"
                 value={observacoes} onChange={e=>setObs(e.target.value)}/>
        </div>
      </div>
      <button className="btn btn-primary mt-3">Salvar</button>
      {msg && <div className="alert alert-info mt-3 mb-0">{msg}</div>}
    </form>
  );
}
