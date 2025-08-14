import React, { useEffect, useState } from 'react';
import api from '../api';

export default function ManageSellers(){
  const [items,setItems] = useState([]);

  const [nome,setNome] = useState('');
  const [email,setEmail] = useState('');
  const [senha,setSenha] = useState('');
  const [role,setRole] = useState('vendedor');
  const [tipo,setTipo] = useState('interno');
  const [loja_parceira,setLojaParceira] = useState('AJ8');
  const [inicio_vigencia,setInicio] = useState('');
  const [fim_vigencia,setFim] = useState('');
  const [lojas, setLojas] = useState([]);
  const [msg,setMsg] = useState('');

  async function load(){
    const [rsellers, rstores] = await Promise.all([ api.get('/sellers'), api.get('/stores') ]);
    setItems(rsellers.data);
    setLojas(rstores.data.filter(l => l.ativo));
  }
  useEffect(()=>{ load(); },[]);

  useEffect(()=>{
    if(tipo === 'interno'){ setLojaParceira('AJ8'); }
    else { setLojaParceira(''); }
  }, [tipo]);

  async function add(e){
    e.preventDefault();
    setMsg('');
    try{
      await api.post('/sellers', {
        nome, email, senha, role, tipo,
        loja_parceira: (tipo === 'parceiro' ? loja_parceira : 'AJ8'),
        inicio_vigencia: inicio_vigencia || null,
        fim_vigencia: fim_vigencia || null
      });
      setNome(''); setEmail(''); setSenha(''); setRole('vendedor');
      setTipo('interno'); setLojaParceira('AJ8'); setInicio(''); setFim('');
      load();
      setMsg('Vendedor cadastrado.');
    }catch(err){
      setMsg(err?.response?.data?.msg || 'Erro ao cadastrar');
    }
  }

  async function toggleRole(it){
    const newRole = it.role === 'admin' ? 'vendedor' : 'admin';
    await api.put(`/sellers/${it.id}`, { role: newRole });
    load();
  }

  async function toggleTipo(it){
    const newTipo = it.tipo === 'interno' ? 'parceiro' : 'interno';
    const body = { tipo: newTipo };
    if(newTipo === 'interno'){ body.loja_parceira = 'AJ8'; }
    await api.put(`/sellers/${it.id}`, body);
    load();
  }

  return (
    <div>
      <h3 className="mb-3">Vendedores</h3>

      <form onSubmit={add} className="row g-2 mb-4" style={{maxWidth: 1000}}>
        <div className="col-md-3"><input className="form-control" placeholder="Nome" value={nome} onChange={e=>setNome(e.target.value)} required/></div>
        <div className="col-md-3"><input className="form-control" type="email" placeholder="E-mail" value={email} onChange={e=>setEmail(e.target.value)} required/></div>
        <div className="col-md-2"><input className="form-control" type="password" placeholder="Senha" value={senha} onChange={e=>setSenha(e.target.value)} required/></div>
        <div className="col-md-2">
          <select className="form-select" value={role} onChange={e=>setRole(e.target.value)}>
            <option value="vendedor">Vendedor</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="col-md-2">
          <select className="form-select" value={tipo} onChange={e=>setTipo(e.target.value)}>
            <option value="interno">Interno</option>
            <option value="parceiro">Parceiro</option>
          </select>
        </div>

        {tipo === 'parceiro' ? (
          <div className="col-md-4">
            <select className="form-select" value={loja_parceira} onChange={e=>setLojaParceira(e.target.value)} required>
              <option value="">Selecione a loja parceira</option>
              {lojas.map(l => <option key={l.id} value={l.nome}>{l.nome}</option>)}
            </select>
          </div>
        ) : (
          <div className="col-md-4">
            <input className="form-control" value="AJ8" disabled readOnly />
          </div>
        )}

        <div className="col-md-2"><input className="form-control" type="date" value={inicio_vigencia} onChange={e=>setInicio(e.target.value)} placeholder="Início vigência" /></div>
        <div className="col-md-2"><input className="form-control" type="date" value={fim_vigencia} onChange={e=>setFim(e.target.value)} placeholder="Fim vigência (opcional)" /></div>

        <div className="col-md-2"><button className="btn btn-primary w-100">Salvar</button></div>
        {msg && <div className="col-12"><div className="alert alert-info py-2">{msg}</div></div>}
      </form>

      <div className="table-responsive">
        <table className="table table-striped align-middle">
          <thead className="table-dark">
            <tr><th>ID</th><th>Nome</th><th>E-mail</th><th>Role</th><th>Tipo</th><th>Loja Parceira</th><th>Início</th><th>Fim</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {items.map(it=>(
              <tr key={it.id}>
                <td>{it.id}</td>
                <td>{it.nome}</td>
                <td>{it.email}</td>
                <td>{it.role}</td>
                <td>{it.tipo || '-'}</td>
                <td>{it.loja_parceira || '-'}</td>
                <td>{it.inicio_vigencia ? new Date(it.inicio_vigencia).toLocaleDateString('pt-BR') : '-'}</td>
                <td>{it.fim_vigencia ? new Date(it.fim_vigencia).toLocaleDateString('pt-BR') : '-'}</td>
                <td className="d-flex gap-2">
                  <button className="btn btn-sm btn-outline-secondary" onClick={()=>toggleRole(it)}>
                    {it.role === 'admin' ? 'Tornar Vendedor' : 'Tornar Admin'}
                  </button>
                  <button className="btn btn-sm btn-outline-secondary" onClick={()=>toggleTipo(it)}>
                    {it.tipo === 'interno' ? 'Tornar Parceiro' : 'Tornar Interno'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
