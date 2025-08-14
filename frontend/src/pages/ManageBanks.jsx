import React, { useEffect, useState } from 'react';
import api from '../api';

export default function ManageBanks(){
  const [items,setItems] = useState([]);
  const [nome,setNome] = useState('');
  const [codigo,setCodigo] = useState('');
  const [ativo,setAtivo] = useState(true);
  const [msg,setMsg] = useState('');

  async function load(){
    const { data } = await api.get('/banks');
    setItems(data);
  }
  useEffect(()=>{ load(); },[]);

  async function add(e){
    e.preventDefault();
    setMsg('');
    try{
      await api.post('/banks', { nome, codigo, ativo });
      setNome(''); setCodigo(''); setAtivo(true);
      load();
      setMsg('Banco cadastrado.');
    }catch(err){
      setMsg(err?.response?.data?.msg || 'Erro ao cadastrar');
    }
  }

  async function toggle(item){
    await api.put(`/banks/${item.id}`, { ativo: !item.ativo });
    load();
  }

  return (
    <div>
      <h3 className="mb-3">Bancos</h3>

      <form onSubmit={add} className="row g-2 mb-4" style={{maxWidth: 600}}>
        <div className="col-md-5"><input className="form-control" placeholder="Nome" value={nome} onChange={e=>setNome(e.target.value)} required/></div>
        <div className="col-md-3"><input className="form-control" placeholder="Código" value={codigo} onChange={e=>setCodigo(e.target.value)} /></div>
        <div className="col-md-2 d-flex align-items-center">
          <div className="form-check">
            <input className="form-check-input" type="checkbox" checked={ativo} onChange={e=>setAtivo(e.target.checked)} id="ativo_bank" />
            <label className="form-check-label" htmlFor="ativo_bank">Ativo</label>
          </div>
        </div>
        <div className="col-md-2"><button className="btn btn-primary w-100">Salvar</button></div>
        {msg && <div className="col-12"><div className="alert alert-info py-2">{msg}</div></div>}
      </form>

      <div className="table-responsive">
        <table className="table table-striped align-middle">
          <thead className="table-dark">
            <tr><th>ID</th><th>Nome</th><th>Código</th><th>Ativo</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {items.map(it=>(
              <tr key={it.id}>
                <td>{it.id}</td>
                <td>{it.nome}</td>
                <td>{it.codigo || '-'}</td>
                <td>{it.ativo ? 'Sim' : 'Não'}</td>
                <td><button className="btn btn-sm btn-outline-secondary" onClick={()=>toggle(it)}>{it.ativo ? 'Desativar' : 'Ativar'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
