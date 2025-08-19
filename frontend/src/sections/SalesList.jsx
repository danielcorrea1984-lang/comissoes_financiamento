// frontend/src/sections/SalesList.jsx
import React, { useEffect, useMemo, useState } from 'react';
import api, { getUserInfo } from '../api';
import EditSaleModal from './EditSaleModal';

// Paginação compacta
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

  // refs
  const [banks, setBanks] = useState([]);
  const [stores, setStores] = useState([]);
  const [sellers, setSellers] = useState([]);

  // edição
  const [editing, setEditing] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // paginação
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    async function loadRefs(){
      try{
        const [b, s] = await Promise.all([ api.get('/banks'), api.get('/stores') ]);
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
    setPage(1);
  }

  useEffect(()=>{ fetch(); /* eslint-disable-next-line */ },[refreshKey]);

  const totalPages = Math.max(1, Math.ceil((items?.length || 0) / pageSize));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return (items || []).slice(start, start + pageSize);
  }, [items, page]);

  // ===== EXIBIÇÃO DA COMISSÃO =====
  // Admin: comissão total da venda (comissao_real -> comissao)
  // Vendedor: SOMENTE comissao_vendedor (se ausente, mostra —)
  function renderCommissionCell(v){
    if (isAdmin){
      const total = (v.comissao_real != null ? v.comissao_real : v.comissao);
      const n = Number(total);
      return Number.isFinite(n)
        ? n.toLocaleString('pt-BR',{ minimumFractionDigits:2, maximumFractionDigits:2 })
        : '—';
    }
    const seller = Number(v.comissao_vendedor);
    return Number.isFinite(seller)
      ? seller.toLocaleString('pt-BR',{ minimumFractionDigits:2, maximumFractionDigits:2 })
      : '—';
  }

  // CSV
  const csvContent = useMemo(() => {
    const header = [
      'ID',
      ...(isAdmin ? ['Vendedor'] : []),
      'Cliente','Documento','Valor','Banco','Status',
      (isAdmin ? 'ComissaoTotal' : 'ComissaoVendedor'),
      ...(isAdmin ? ['RepasseLojaValor','ComissaoVendedor','Empresa'] : []),
      'Data','Loja'
    ];
    const rows = (items || []).map(v => {
      const val = isAdmin
        ? (v.comissao_real ?? v.comissao)
        : (v.comissao_vendedor ?? null);
      const lojaRepasseValor = (v.loja_repasse_valor != null ? v.loja_repasse_valor : '');
      const comissaoVendedor = (v.comissao_vendedor != null ? v.comissao_vendedor : '');
      const empresa = (v.empresa_liquida ?? v.empresa_bruta ?? '');
      return ([
        v.id,
        ...(isAdmin ? [v.vendedor_nome || v.vendedor_id] : []),
        v.cliente_nome,
        v.cliente_documento,
        String(Number(v.valor).toFixed(2)).replace('.', ','),
        v.banco,
        v.status,
        val == null ? '' : String(Number(val).toFixed(2)).replace('.', ','),
        ...(isAdmin ? [
          lojaRepasseValor === '' ? '' : String(Number(lojaRepasseValor).toFixed(2)).replace('.', ','),
          comissaoVendedor === '' ? '' : String(Number(comissaoVendedor).toFixed(2)).replace('.', ','),
          empresa === '' ? '' : String(Number(empresa).toFixed(2)).replace('.', ',')
        ] : []),
        v.data_venda ? new Date(v.data_venda).toLocaleDateString('pt-BR') : '',
        v.loja_parceira || ''
      ]);
    });
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

  // UI handlers
  function applyFilters(){ fetch(); }
  function refresh(){ setRefreshKey(k => k + 1); }
  function clearFilters(){
    setCliente(''); setDoc(''); setStatus('');
    setBancoId(''); setLojaId(''); setVendedorId('');
    setRefreshKey(k => k + 1);
  }

  const emptyColspan = (isAdmin ? 14 : 10);

  return (
    <div>
      {/* Barra de filtros */}
      <div className="filters-bar mb-2">
        {isAdmin && (
          <select
            className="form-select form-select-sm"
            value={vendedorId}
            onChange={e=>setVendedorId(e.target.value)}
            style={{width: 220}}
          >
            <option value="">Todos os vendedores</option>
            {sellers.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        )}

        <select
          className="form-select form-select-sm"
          value={bancoId}
          onChange={e=>setBancoId(e.target.value)}
          style={{width: 180}}
        >
          <option value="">Todos os bancos</option>
          {banks.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
        </select>

        <select
          className="form-select form-select-sm"
          value={lojaId}
          onChange={e=>setLojaId(e.target.value)}
          style={{width: 220}}
        >
          <option value="">Todas as lojas</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>

        <select
          className="form-select form-select-sm"
          value={status}
          onChange={e=>setStatus(e.target.value)}
          style={{width: 140}}
        >
          <option value="">Status</option>
          <option value="enviada">Enviada</option>
          <option value="aceita">Aceita</option>
          <option value="recusada">Recusada</option>
        </select>

        <button className="btn btn-primary btn-sm" onClick={applyFilters}>Aplicar filtros</button>
        <button className="btn btn-outline-secondary btn-sm" onClick={clearFilters}>Limpar filtros</button>

        <div className="filters-actions">
          <button
            className="btn btn-outline-secondary btn-sm btn-square"
            title="Atualizar"
            onClick={refresh}
            aria-label="Atualizar"
          >
            <i className="bi bi-arrow-clockwise"></i>
          </button>
          <button
            className="btn btn-success btn-sm btn-square"
            title="Baixar CSV"
            onClick={downloadCsv}
            aria-label="Baixar CSV"
          >
            <i className="bi bi-file-earmark-spreadsheet"></i>
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-striped align-middle">
          <thead className="table-head-primary">
            <tr>
              <th className="text-center">ID</th>
              {isAdmin && <th className="text-center">Vendedor</th>}
              <th className="text-center">Cliente</th>
              <th className="text-center">Documento</th>
              <th className="text-center">Valor (R$)</th>
              <th className="text-center">Banco</th>
              <th className="text-center">Status</th>
              <th className="text-center">{isAdmin ? 'Comissão (R$)' : 'Comissão vendedor (R$)'}</th>
              {isAdmin && <th className="text-center">Repasse loja (R$)</th>}
              {isAdmin && <th className="text-center">Comissão vendedor (R$)</th>}
              {isAdmin && <th className="text-center">Empresa (R$)</th>}
              <th className="text-center">Data</th>
              <th className="text-center">Loja</th>
              <th className="text-center" style={{width: 110}}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {pagedItems.map(v => (
              <tr key={v.id}>
                <td>{v.id}</td>
                {isAdmin && <td>{v.vendedor_nome || v.vendedor_id}</td>}
                <td>{v.cliente_nome}</td>
                <td>{v.cliente_documento}</td>
                {/* Valor sem símbolo R$ (apenas número formatado) */}
                <td>{Number(v.valor).toLocaleString('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                <td>{v.banco}</td>
                <td>{v.status}</td>
                {/* Comissão conforme perfil */}
                <td>{renderCommissionCell(v)}</td>
                {isAdmin && (
                  <>
                    <td>{(v.loja_repasse_valor != null)
                      ? Number(v.loja_repasse_valor).toLocaleString('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:2})
                      : '—'}</td>
                    <td>{(v.comissao_vendedor != null)
                      ? Number(v.comissao_vendedor).toLocaleString('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:2})
                      : '—'}</td>
                    <td>{(v.empresa_liquida ?? v.empresa_bruta) != null
                      ? Number(v.empresa_liquida ?? v.empresa_bruta).toLocaleString('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:2})
                      : '—'}</td>
                  </>
                )}
                <td>{v.data_venda ? new Date(v.data_venda).toLocaleDateString('pt-BR') : ''}</td>
                <td>{v.loja_parceira || ''}</td>
                <td>
                  <div className="d-flex gap-2 justify-content-center">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm btn-square"
                      title="Editar"
                      onClick={() => setEditing(v)}
                    >
                      <i className="bi bi-pencil-square"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {pagedItems.length === 0 && (
              <tr>
                <td colSpan={emptyColspan} className="text-center text-muted py-4">
                  Nenhuma venda encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
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

      {/* modal */}
      {editing && (
        <EditSaleModal
          sale={editing}
          onClose={()=>setEditing(null)}
          onSaved={()=>setRefreshKey(k => k+1)}
        />
      )}

      {/* estilos locais */}
      <style>{`
        .btn-square{
          width:34px; height:34px; padding:0;
          display:inline-flex; align-items:center; justify-content:center;
        }
        .filters-bar{
          display:flex; align-items:center; gap:8px; flex-wrap: nowrap;
        }
        .filters-actions{
          margin-left:auto; display:flex; align-items:center; gap:8px;
        }
        @media (max-width: 992px){
          .filters-bar{ flex-wrap: wrap; }
          .filters-actions{ width:100%; margin-left:0; }
        }

        /* Cabeçalho da tabela — azul escuro centralizado */
        :root { --aj-deep-blue: #0d3b66; }
        .table-head-primary th,
        .table-head-primary {
          background-color: var(--aj-deep-blue) !important;
          color: #fff !important;
        }
        .table-head-primary th {
          text-align: center;
          vertical-align: middle;
        }
      `}</style>
    </div>
  );
}
