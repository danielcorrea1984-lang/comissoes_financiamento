// frontend/src/sections/SalesList.jsx
function getVisiblePages(total, current, delta = 2){
  const s = new Set([1, total, current]);
  for(let i=1;i<=delta;i++){ s.add(current - i); s.add(current + i); }
  const arr = [...s].filter(n => n >= 1 && n <= total).sort((a,b)=>a-b);
  const out = [];
  for(let i=0;i<arr.length;i++){
    if(i>0 && arr[i] - arr[i-1] > 1) out.push('…');
    out.push(arr[i]);
  }
  return out;
}

import React, { useEffect, useMemo, useState } from 'react';
import api, { getUserInfo } from '../api';
import EditSaleModal from './EditSaleModal';

export default function SalesList(){
  const user = getUserInfo();
  const isAdmin = user?.role === 'admin';

  const [items,setItems] = useState([]);

  // filtros
  const [cliente_nome,setCliente] = useState('');
  const [cliente_documento,setDoc] = useState('');
  const [status,setStatus] = useState('');
  const [bancoId,setBancoId] = useState('');
  const [lojaId,setLojaId] = useState('');
  const [vendedorId,setVendedorId] = useState('');

  // refs para combos
  const [banks, setBanks] = useState([]);
  const [stores, setStores] = useState([]);
  const [sellers, setSellers] = useState([]);

  // modal de edição
  const [editing, setEditing] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // paginação
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    async function loadRefs(){
      try{
        const [b, s] = await Promise.all([
          api.get('/banks'),
          api.get('/stores')
        ]);
        setBanks(b.data || []);
        setStores(s.data || []);
      }catch(e){}
      if(isAdmin){
        try{
          const { data } = await api.get('/sellers');
          setSellers(data || []);
        }catch(e){}
      }
    }
    loadRefs();
  }, [isAdmin]);

  async function fetch(){
    const params = { cliente_nome, cliente_documento, status };
    if (bancoId) params.banco_id = bancoId;
    if (lojaId) params.loja_id = lojaId;
    if (isAdmin && vendedorId) params.vendedor_id = vendedorId;

    const { data } = await api.get('/sales', { params });
    setItems(data || []);
    setPage(1); // volta para a primeira página após nova busca
  }

  useEffect(()=>{ fetch(); /* eslint-disable-next-line */ },[refreshKey]);

  // ordenação já vem do backend (mais novos primeiro). Apenas fatiamos
  const totalPages = Math.max(1, Math.ceil((items?.length || 0) / pageSize));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return (items || []).slice(start, start + pageSize);
  }, [items, page]);

  // Exportar CSV (itens do resultado completo, não só da página)
  const csvContent = useMemo(() => {
    const header = [
      'ID',
      ...(isAdmin ? ['Vendedor'] : []),
      'Cliente','Documento','Valor','Banco','Status','Comissao','Data','Loja'
    ];
    const rows = (items || []).map(v => ([
      v.id,
      ...(isAdmin ? [v.vendedor_nome || v.vendedor_id] : []),
      v.cliente_nome,
      v.cliente_documento,
      String(Number(v.valor).toFixed(2)).replace('.', ','),
      v.banco,
      v.status,
      String(Number(v.comissao||0).toFixed(2)).replace('.', ','),
      v.data_venda ? new Date(v.data_venda).toLocaleString('pt-BR') : '',
      v.loja_parceira || ''
    ]));
    const all = [header, ...rows]
      .map(cols => cols.map(c => `"${String(c).replace(/"/g,'""')}"`).join(';'))
      .join('\r\n');
    return 'data:text/csv;charset=utf-8,' + encodeURIComponent(all);
  }, [items, isAdmin]);

  function downloadCsv(){
    const a = document.createElement('a');
    a.href = csvContent;
    a.download = 'vendas.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // Abrir popup de Nova venda (mesma lógica usada na SalesPage)
  function openNewSale(){
    const largura = 1000;
    const altura = 700;
    const esquerda = Math.max(0, Math.round((window.screen.width - largura) / 2));
    const topo = Math.max(0, Math.round((window.screen.height - altura) / 2));
    const features = [
      `width=${largura}`,
      `height=${altura}`,
      `left=${esquerda}`,
      `top=${topo}`,
      'menubar=no',
      'toolbar=no',
      'location=no',
      'status=no',
      'scrollbars=yes',
      'resizable=yes'
    ].join(',');
    const win = window.open(window.location.origin + '/sales/new', 'AJ7NovaVenda', features);
    if (!win) window.location.href = '/sales/new';
  }

  return (
    <div>

{/* Linha de título + botão "Nova venda" */}
<div className="d-flex align-items-end mb-1">
  <h6 className="m-0" style={{ paddingBottom: '2px' }}>Filtros</h6>
  <div className="ms-auto">
    <button className="btn btn-primary" onClick={openNewSale}>
      Nova venda
    </button>
  </div>
</div>
<hr className="mt-1 mb-2" />
      
      {/* Área de filtros */}
      <div className="row g-2 mb-2">
        {isAdmin && (
          <div className="col-md-3">
            <select className="form-select" value={vendedorId} onChange={e=>setVendedorId(e.target.value)}>
              <option value="">Todos os vendedores</option>
              {sellers.map(s => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>
        )}
        <div className="col-md-3">
          <select className="form-select" value={bancoId} onChange={e=>setBancoId(e.target.value)}>
            <option value="">Todos os bancos</option>
            {banks.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
          </select>
        </div>
        <div className="col-md-3">
          <select className="form-select" value={lojaId} onChange={e=>setLojaId(e.target.value)}>
            <option value="">Todas as lojas</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
        <div className="col-md-2">
          <select className="form-select" value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="">Status</option>
            <option value="enviada">Enviada</option>
            <option value="aceita">Aceita</option>
            <option value="recusada">Recusada</option>
          </select>
        </div>
        <div className="col-md-1 d-flex gap-2">
          {/* Ícones no lugar dos botões de texto */}
          <button className="btn btn-success d-flex align-items-center" onClick={downloadCsv}>
  <img src="/excel-icon.svg" alt="Excel" style={{ width: 20, height: 20, marginRight: 8 }} />
</button>
          <button className="btn btn-outline-secondary w-100" title="Atualizar" onClick={()=>setRefreshKey(k => k+1)} aria-label="Atualizar">
            <i className="bi bi-arrow-clockwise"></i>
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-striped align-middle">
          <thead className="table-dark">
            <tr>
              <th>ID</th>
              {isAdmin && <th>Vendedor</th>}
              <th>Cliente</th>
              <th>Documento</th>
              <th>Valor</th>
              <th>Banco</th>
              <th>Status</th>
              <th>Comissão</th>
              <th>Data</th>
              <th>Loja</th>
              {!isAdmin && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {pagedItems.map(v => (
              <tr key={v.id}>
                <td>{v.id}</td>
                {isAdmin && <td>{v.vendedor_nome || v.vendedor_id}</td>}
                <td>{v.cliente_nome}</td>
                <td>{v.cliente_documento}</td>
                <td>{Number(v.valor).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                <td>{v.banco}</td>
                <td>{v.status}</td>
                <td>{Number(v.comissao||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                <td>{v.data_venda ? new Date(v.data_venda).toLocaleString('pt-BR') : ''}</td>
                <td>{v.loja_parceira || ''}</td>
                {!isAdmin && (
                  <td>
                    {v.vendedor_id === user?.id ? (
                      <button className="btn btn-sm btn-outline-primary" onClick={()=>setEditing(v)}>
                        Alterar
                      </button>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {pagedItems.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 10 : 11} className="text-center text-muted py-4">
                  Nenhuma venda encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação compacta centralizada */}
      <nav aria-label="Paginação de vendas" className="mt-2 d-flex justify-content-center">
        <ul className="pagination flex-wrap">
          <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
            <button className="page-link" onClick={()=>setPage(p => Math.max(1, p-1))}>Anterior</button>
          </li>

          {getVisiblePages(totalPages, page, 2).map((n, idx) => (
            n === '…' ? (
              <li key={`gap-${idx}`} className="page-item disabled">
                <span className="page-link">…</span>
              </li>
            ) : (
              <li key={n} className={`page-item ${page===n ? 'active' : ''}`}>
                <button className="page-link" onClick={()=>setPage(n)}>{n}</button>
              </li>
            )
          ))}

          <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
            <button className="page-link" onClick={()=>setPage(p => Math.min(totalPages, p+1))}>Próxima</button>
          </li>
        </ul>
      </nav>

      {editing && (
        <EditSaleModal
          sale={editing}
          onClose={()=>setEditing(null)}
          onSaved={()=>setRefreshKey(k => k+1)}
        />
      )}
    </div>
  );
}
