import React, { useEffect, useState } from 'react';
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

export default function AddSale({ onCreated }){
  const [cliente_nome,setCliente] = useState('');
  const [cliente_documento,setDoc] = useState('');
  const [valor,setValor] = useState('');
  const [status,setStatus] = useState('enviada');
  const [observacoes,setObs] = useState('');

  const [bancos, setBancos] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [banco_id, setBancoId] = useState('');
  const [loja_parceira_id, setLojaId] = useState('');

  const [msg,setMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [rb, rl] = await Promise.all([api.get('/banks'), api.get('/stores')]);
        setBancos(rb.data.filter(b=>b.ativo));
        setLojas(rl.data.filter(l=>l.ativo));
      } catch {}
    })();
  },[]);

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
      loja_parceira_id: loja_parceira_id || undefined
    };

    try{
      const { data } = await api.post('/sales', payload);
      setMsg(`Venda #${data.id} salva. Comissão: R$ ${data.comissao?.toFixed?.(2) ?? '—'}`);
      setCliente(''); setDoc(''); setValor(''); setStatus('enviada'); setObs('');
      setBancoId(''); setLojaId('');
      onCreated?.();
    }catch(err){
      setMsg(err?.response?.data?.msg || 'Erro ao salvar');
    }
  }

  return (
    <form onSubmit={submit} className="mb-4" style={{maxWidth: 720}}>
      <h4 className="mb-3">Cadastrar venda</h4>
      <div className="row g-2">
        <div className="col-md-6"><input className="form-control" placeholder="Nome do cliente" value={cliente_nome} onChange={e=>setCliente(e.target.value)} required/></div>
        <div className="col-md-6"><input className="form-control" placeholder="CPF/CNPJ" value={cliente_documento} onChange={onChangeDoc} required/></div>

        <div className="col-md-4"><input className="form-control" placeholder="Valor (ex: 35000)" value={valor} onChange={e=>setValor(e.target.value)} required/></div>

        <div className="col-md-4">
          <select className="form-select" value={banco_id} onChange={e=>setBancoId(e.target.value)}>
            <option value="">Selecione o banco</option>
            {bancos.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
          </select>
        </div>

        <div className="col-md-4">
          <select className="form-select" value={loja_parceira_id} onChange={e=>setLojaId(e.target.value)}>
            <option value="">Selecione a loja parceira</option>
            {lojas.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
        </div>

        <div className="col-md-4">
          <select className="form-select" value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="enviada">Enviada</option>
            <option value="aceita">Aceita</option>
            <option value="recusada">Recusada</option>
          </select>
        </div>

        <div className="col-md-8"><input className="form-control" placeholder="Observações" value={observacoes} onChange={e=>setObs(e.target.value)}/></div>
      </div>
      <button className="btn btn-primary mt-3">Salvar</button>
      {msg && <div className="alert alert-info mt-3 mb-0">{msg}</div>}
    </form>
  );
}
