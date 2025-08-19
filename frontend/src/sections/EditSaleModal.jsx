// frontend/src/sections/EditSaleModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import api from '../api';

function parseBRFloat(s){
  if (s == null) return NaN;
  return parseFloat(String(s).replace(/\./g,'').replace(',', '.'));
}
function fmtPct(n){
  if (n == null || isNaN(n)) return '';
  return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
}

export default function EditSaleModal({ sale, onClose, onSaved }){
  const [cliente_nome, setCliente] = useState(sale?.cliente_nome || '');
  const [cliente_documento, setDoc] = useState(sale?.cliente_documento || '');
  const [valor, setValor] = useState(String(sale?.valor ?? ''));
  const [status, setStatus] = useState(sale?.status || 'enviada');
  const [banco_id, setBancoId] = useState(sale?.banco_id || '');
  const [loja_id, setLojaId] = useState(sale?.loja_parceira_id || '');
  const [observacoes, setObs] = useState(sale?.observacoes || '');

  const [percComissao, setPercComissao] = useState(
    sale?.perc_comissao_aplicado != null ? String(sale.perc_comissao_aplicado) : ''
  );

  const [banks, setBanks] = useState([]);
  const [stores, setStores] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    async function loadRefs(){
      try{
        const [b, s] = await Promise.all([ api.get('/banks'), api.get('/stores') ]);
        setBanks(b.data || []);
        setStores(s.data || []);
      }catch(e){}
    }
    loadRefs();
  }, []);

  const bankCommissions = useMemo(() => {
    const b = (banks || []).find(x => String(x.id) === String(banco_id));
    const list = (b?.comissoes || []).filter(n => n != null && isFinite(n));
    return list.sort((a,b)=>a-b);
  }, [banks, banco_id]);

  useEffect(() => {
    if (percComissao === '' || bankCommissions.length === 0) return;
    const n = parseBRFloat(percComissao);
    if (!isFinite(n)) { setPercComissao(''); return; }
    const exists = bankCommissions.some(p => Math.abs(p - n) < 0.0001);
    if (!exists) setPercComissao('');
    // eslint-disable-next-line
  }, [bankCommissions]);

  const commissionValueBRL = useMemo(() => {
    const v = parseBRFloat(valor);
    const p = parseBRFloat(percComissao);
    if (!isFinite(v) || !isFinite(p)) return '';
    const money = Math.round((v * p / 100) * 100) / 100;
    return money.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
  }, [valor, percComissao]);

  async function save(e){
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try{
      const payload = {
        cliente_nome,
        cliente_documento,
        valor,
        status,
        observacoes
      };
      if (banco_id) payload.banco_id = banco_id;
      if (loja_id) payload.loja_parceira_id = loja_id;
      if (percComissao !== '') {
        const p = parseBRFloat(percComissao);
        if (isFinite(p)) payload.perc_comissao_aplicado = p;
      }

      await api.put(`/sales/${sale.id}`, payload);
      onSaved?.();
      onClose?.();
    }catch(err){
      setMsg(err?.response?.data?.msg || 'Erro ao salvar');
    }finally{
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" style={{position:'fixed', inset:0, background:'rgba(0,0,0,.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1050}}>
      <div className="card shadow" style={{width:'min(760px, 95vw)'}}>
        <div className="card-header d-flex align-items-center">
          <strong>Alterar venda #{sale.id}</strong>
          <button className="btn btn-sm btn-outline-secondary ms-auto" onClick={onClose}>Fechar</button>
        </div>
        <div className="card-body">
          <form onSubmit={save}>
            <div className="row g-2">

              <div className="col-md-6">
                <label className="form-label mb-1">Nome do cliente</label>
                <input className="form-control" value={cliente_nome} onChange={e=>setCliente(e.target.value)} required/>
              </div>

              <div className="col-md-6">
                <label className="form-label mb-1">CPF/CNPJ</label>
                <input className="form-control" value={cliente_documento} onChange={e=>setDoc(e.target.value)} required/>
              </div>

              <div className="col-md-4">
                <label className="form-label mb-1">Valor da venda</label>
                <input className="form-control" value={valor} onChange={e=>setValor(e.target.value)} required/>
              </div>

              <div className="col-md-4">
                <label className="form-label mb-1">Banco</label>
                <select className="form-select" value={banco_id} onChange={e=>setBancoId(e.target.value)}>
                  <option value="">Banco (texto atual: {sale.banco || '—'})</option>
                  {banks.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
                </select>
              </div>

              <div className="col-md-4">
                <label className="form-label mb-1">Status</label>
                <select className="form-select" value={status} onChange={e=>setStatus(e.target.value)}>
                  <option value="enviada">Enviada</option>
                  <option value="aceita">Aceita</option>
                  <option value="recusada">Recusada</option>
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label mb-1">Loja parceira</label>
                <select className="form-select" value={loja_id} onChange={e=>setLojaId(e.target.value)}>
                  <option value="">Loja (texto atual: {sale.loja_parceira || '—'})</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label mb-1">Comissão (%)</label>
                <select
                  className="form-select"
                  value={percComissao === '' ? '' : String(parseBRFloat(percComissao))}
                  onChange={e => setPercComissao(e.target.value)}
                  disabled={bankCommissions.length === 0}
                >
                  <option value="">— selecione —</option>
                  {bankCommissions.map((p,i)=>(
                    <option key={i} value={p}>{fmtPct(p)}</option>
                  ))}
                </select>
                {percComissao !== '' && (
                  <div className="mt-1 small text-muted">
                    Previsto: <strong>{commissionValueBRL}</strong>
                  </div>
                )}
              </div>

              <div className="col-12">
                <label className="form-label mb-1">Observações</label>
                <input className="form-control" value={observacoes} onChange={e=>setObs(e.target.value)} />
              </div>
            </div>

            {msg && <div className="alert alert-danger mt-3">{msg}</div>}
            <button className="btn btn-primary mt-3" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
