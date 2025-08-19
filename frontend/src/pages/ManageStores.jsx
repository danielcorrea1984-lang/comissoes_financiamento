// frontend/src/sections/ManageStores.jsx
import React, { useEffect, useRef, useState } from 'react';
import api from '../api';

// Converte para YYYY-MM-DD sem sofrer com timezone.
// - Se já vier "YYYY-MM-DD", retorna como está (não cria Date).
// - Se vier Date, formata no timezone local.
function fmtDateISO(val){
  if (!val) return '';
  try{
    if (typeof val === 'string'){
      // "2025-08-01" -> retorna igual (evita UTC shift dos browsers)
      const m = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) return val;
      // outras strings de data: tenta criar Date
      const d = new Date(val);
      if (isNaN(d)) return '';
      const y = d.getFullYear();
      const mth = String(d.getMonth()+1).padStart(2,'0');
      const day = String(d.getDate()).padStart(2,'0');
      return `${y}-${mth}-${day}`;
    }else{
      const d = val;
      const y = d.getFullYear();
      const mth = String(d.getMonth()+1).padStart(2,'0');
      const day = String(d.getDate()).padStart(2,'0');
      return `${y}-${mth}-${day}`;
    }
  }catch{
    return '';
  }
}

// Exibição BR "DD/MM/AAAA" sem timezone:
// aceita "YYYY-MM-DD" e retorna "DD/MM/AAAA".
function fmtDateBR(val){
  if (!val) return '';
  if (typeof val === 'string'){
    const m = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  // fallback para qualquer outra coisa
  const iso = fmtDateISO(val);
  if (!iso) return '';
  const [y, mm, dd] = iso.split('-');
  return `${dd}/${mm}/${y}`;
}

// Aceita "1,50" ou "1.50" e também "1" -> número (float) ou null
function parsePercentToNumberOrNull(v){
  if(v === undefined || v === null) return null;
  const s = String(v).trim();
  if(s === '') return null;
  const normalized = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

// ---------- Modal de Edição ----------
function EditStoreModal({open, onClose, item, onSaved}){
  const [nome,setNome] = useState('');
  const [cnpj,setCnpj] = useState('');
  const [cidade,setCidade] = useState('');
  const [ativo,setAtivo] = useState(true);
  const [repasse,setRepasse] = useState('');
  const [dataInicio,setDataInicio] = useState('');
  const [dataFim,setDataFim] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(()=>{
    if(open && item){
      setNome(item.nome || '');
      setCnpj(item.cnpj || '');
      setCidade(item.cidade || '');
      setAtivo(!!item.ativo);
      setRepasse(item.repasse != null ? String(item.repasse) : '');
      setDataInicio(item.data_inicio ? fmtDateISO(item.data_inicio) : '');
      setDataFim(item.data_fim ? fmtDateISO(item.data_fim) : '');
      setMsg('');
    }
  }, [open, item]);

  async function save(){
    setMsg('');
    setSaving(true);
    try{
      const payload = {
        nome,
        cnpj: cnpj || null,
        cidade: cidade || null,
        ativo,
        repasse: parsePercentToNumberOrNull(repasse),
        data_inicio: dataInicio || null,
        data_fim: dataFim || null,
      };
      await api.put(`/stores/${item.id}`, payload);
      onSaved?.();
      onClose?.();
    }catch(err){
      if (err?.response?.status !== 401) {
        setMsg(err?.response?.data?.msg || 'Erro ao salvar');
      }
    }finally{
      setSaving(false);
    }
  }

  if(!open) return null;

  return (
    <div className="aj-modal-backdrop" onClick={onClose}>
      <div className="card shadow aj-modal-card" onClick={e=>e.stopPropagation()}>
        <div className="card-header d-flex align-items-center">
          <strong>Editar loja #{item?.id}</strong>
          <button className="btn btn-sm btn-light ms-auto" onClick={onClose}>Fechar</button>
        </div>
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-5">
              <label className="form-label mb-1">Nome *</label>
              <input className="form-control" value={nome} onChange={e=>setNome(e.target.value)} required />
            </div>

            <div className="col-md-3">
              <label className="form-label mb-1">% Repasse *</label>
              <div className="input-group">
                <input
                  type="text"
                  inputMode="decimal"
                  className="form-control"
                  placeholder="0,00"
                  value={repasse}
                  onChange={e=>setRepasse(e.target.value)}
                  required
                />
                <span className="input-group-text">%</span>
              </div>
            </div>

            <div className="col-md-2">
              <label className="form-label mb-1">Data início</label>
              <input type="date" className="form-control" value={dataInicio} onChange={e=>setDataInicio(e.target.value)} />
            </div>

            <div className="col-md-2">
              <label className="form-label mb-1">Data fim</label>
              <input type="date" className="form-control" value={dataFim} onChange={e=>setDataFim(e.target.value)} />
            </div>

            <div className="col-md-4">
              <label className="form-label mb-1">CNPJ (opcional)</label>
              <input className="form-control" value={cnpj} onChange={e=>setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
            </div>

            <div className="col-md-4">
              <label className="form-label mb-1">Cidade</label>
              <input className="form-control" value={cidade} onChange={e=>setCidade(e.target.value)} />
            </div>

            <div className="col-md-4 d-flex align-items-end">
              <div className="form-check">
                <input className="form-check-input" type="checkbox" checked={ativo} onChange={e=>setAtivo(e.target.checked)} id="ativo_store_edit" />
                <label className="form-check-label ms-1" htmlFor="ativo_store_edit">Ativo</label>
              </div>
            </div>
          </div>

          {msg && <div className="alert alert-info py-2 my-2">{msg}</div>}

          <div className="d-flex justify-content-end gap-2 mt-2">
            <button className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ManageStores(){
  const [items,setItems] = useState([]);

  // formulário (criação)
  const [nome,setNome] = useState('');
  const [cnpj,setCnpj] = useState('');
  const [cidade,setCidade] = useState('');
  const [ativo,setAtivo] = useState(true);

  // novos campos
  const [repasse,setRepasse] = useState('');
  const [dataInicio,setDataInicio] = useState(fmtDateISO(new Date()));
  const [dataFim,setDataFim] = useState('');

  const [msg,setMsg] = useState('');

  // visualização e edição
  const [viewing, setViewing] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  const formRef = useRef(null);

  async function load(){
    try{
      const { data } = await api.get('/stores');
      setItems(data || []);
    }catch(err){
      if (err?.response?.status !== 401) {
        setMsg(err?.response?.data?.msg || 'Erro ao carregar lojas');
      }
    }
  }
  useEffect(()=>{ load(); },[]);

  function clearForm(){
    setNome('');
    setCnpj('');
    setCidade('');
    setAtivo(true);
    setRepasse('');
    setDataInicio(fmtDateISO(new Date()));
    setDataFim('');
  }

  async function save(e){
    e.preventDefault();
    setMsg('');
    try{
      const payload = {
        nome,
        cnpj: cnpj || null,
        cidade: cidade || null,
        ativo,
        repasse: parsePercentToNumberOrNull(repasse),
        data_inicio: dataInicio || null,
        data_fim: dataFim || null,
      };

      await api.post('/stores', payload);
      setMsg('Loja cadastrada.');
    }catch(err){
      if (err?.response?.status !== 401) {
        setMsg(err?.response?.data?.msg || 'Erro ao salvar');
      }
    }finally{
      clearForm();
      load();
    }
  }

  async function toggle(item){
    try{
      await api.put(`/stores/${item.id}`, { ativo: !item.ativo });
      load();
    }catch(err){
      if (err?.response?.status !== 401) {
        setMsg(err?.response?.data?.msg || 'Erro ao alterar status');
      }
    }
  }

  function onEdit(item){
    setEditingItem(item);
    setEditOpen(true);
  }

  return (
    <div>
      {/* FORM - Criação */}
      <form ref={formRef} onSubmit={save} className="mb-3">
        {/* Linha 1 */}
        <div className="row g-2" style={{maxWidth: 1100}}>
          <div className="col-md-4">
            <label className="form-label mb-1">Nome *</label>
            <input
              className="form-control"
              placeholder="Nome da loja"
              value={nome}
              onChange={e=>setNome(e.target.value)}
              required
            />
          </div>

          <div className="col-md-3">
            <label className="form-label mb-1">% Repasse *</label>
            <div className="input-group">
              <input
                type="text"
                inputMode="decimal"
                className="form-control"
                placeholder="0,00"
                value={repasse}
                onChange={e=>setRepasse(e.target.value)}
                required
              />
              <span className="input-group-text">%</span>
            </div>
          </div>

          <div className="col-md-2">
            <label className="form-label mb-1">Data início</label>
            <input
              type="date"
              className="form-control"
              value={dataInicio}
              onChange={e=>setDataInicio(e.target.value)}
            />
          </div>

          <div className="col-md-2">
            <label className="form-label mb-1">Data fim</label>
            <input
              type="date"
              className="form-control"
              value={dataFim}
              onChange={e=>setDataFim(e.target.value)}
            />
          </div>
        </div>

        {/* Linha 2 */}
        <div className="row g-2 mt-2 align-items-end" style={{maxWidth: 1100}}>
          <div className="col-md-3 col-sm-6">
            <label className="form-label mb-1">CNPJ (opcional)</label>
            <input
              className="form-control"
              placeholder="00.000.000/0000-00"
              value={cnpj}
              onChange={e=>setCnpj(e.target.value)}
            />
          </div>

          <div className="col-md-3 col-sm-6">
            <label className="form-label mb-1">Cidade</label>
            <input
              className="form-control"
              placeholder="Cidade"
              value={cidade}
              onChange={e=>setCidade(e.target.value)}
            />
          </div>

          <div className="col-auto d-flex align-items-center">
            <div className="form-check mt-4 mb-0">
              <input
                className="form-check-input"
                type="checkbox"
                checked={ativo}
                onChange={e=>setAtivo(e.target.checked)}
                id="ativo_store_new"
              />
              <label className="form-check-label ms-1" htmlFor="ativo_store_new">Ativo</label>
            </div>
          </div>

          <div className="col-auto">
            <label className="form-label mb-1 invisible">Ações</label>
            <div className="d-flex gap-2">
              <button
                type="submit"
                className="btn btn-primary btn-sm px-3"
                style={{ minWidth: 96, overflow: 'visible' }}
              >
                Salvar
              </button>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={clearForm}>
                Limpar
              </button>
            </div>
          </div>
        </div>

        {msg && <div className="alert alert-info py-2 my-2" style={{maxWidth: 1100}}>{msg}</div>}
      </form>

      {/* TABELA */}
      <div className="table-responsive">
        <table className="table table-striped align-middle">
          <thead className="table-dark">
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>% Repasse</th>
              <th>Início</th>
              <th>Fim</th>
              <th>CNPJ</th>
              <th>Cidade</th>
              <th>Ativo</th>
              <th style={{width:110}}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map(it=>(
              <tr key={it.id}>
                <td>{it.id}</td>
                <td>{it.nome}</td>
                <td>
                  {it.repasse != null
                    ? `${Number(it.repasse).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}%`
                    : '-'}
                </td>
                <td>{it.data_inicio ? fmtDateBR(it.data_inicio) : '-'}</td>
                <td>{it.data_fim ? fmtDateBR(it.data_fim) : '-'}</td>
                <td>{it.cnpj || '-'}</td>
                <td>{it.cidade || '-'}</td>
                <td>
                  <div className="form-check form-switch m-0">
                    <input className="form-check-input" type="checkbox" checked={!!it.ativo} onChange={()=>toggle(it)} />
                  </div>
                </td>
                <td>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-outline-secondary btn-sm btn-square"
                      title="Visualizar"
                      onClick={()=>setViewing(it)}
                    >
                      <i className="bi bi-eye"></i>
                    </button>
                    <button
                      className="btn btn-primary btn-sm btn-square"
                      title="Editar"
                      onClick={()=>onEdit(it)}
                    >
                      <i className="bi bi-pencil-square"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-muted py-4">Nenhuma loja cadastrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Visualização */}
      {viewing && (
        <div className="aj-modal-backdrop" onClick={()=>setViewing(null)}>
          <div className="card shadow aj-modal-card" onClick={e=>e.stopPropagation()}>
            <div className="card-header d-flex align-items-center">
              <strong>Detalhes da loja #{viewing.id}</strong>
              <button className="btn btn-sm btn-light ms-auto" onClick={()=>setViewing(null)}>Fechar</button>
            </div>
            <div className="card-body">
              <div className="row g-2">
                <div className="col-md-6"><b>Nome:</b> {viewing.nome}</div>
                <div className="col-md-3">
                  <b>% Repasse:</b>{' '}
                  {viewing.repasse != null
                    ? `${Number(viewing.repasse).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}%`
                    : '-'}
                </div>
                <div className="col-md-3"><b>Ativo:</b> {viewing.ativo ? 'Sim' : 'Não'}</div>
                <div className="col-md-4"><b>Início:</b> {viewing.data_inicio ? fmtDateBR(viewing.data_inicio) : '-'}</div>
                <div className="col-md-4"><b>Fim:</b> {viewing.data_fim ? fmtDateBR(viewing.data_fim) : '-'}</div>
                <div className="col-md-4"><b>Cidade:</b> {viewing.cidade || '-'}</div>
                <div className="col-md-12"><b>CNPJ:</b> {viewing.cnpj || '-'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      <EditStoreModal
        open={editOpen}
        onClose={()=>setEditOpen(false)}
        item={editingItem}
        onSaved={load}
      />

      {/* estilos locais */}
      <style>{`
        .btn-square{
          width:34px; height:34px; padding:0;
          display:inline-flex; align-items:center; justify-content:center;
        }
        .aj-modal-backdrop{
          position:fixed; inset:0; background:rgba(0,0,0,.35);
          display:flex; align-items:center; justify-content:center; z-index:1050;
        }
        .aj-modal-card{ width:min(820px, calc(100% - 24px)); }
        .btn{ overflow:visible; }
      `}</style>
    </div>
  );
}
