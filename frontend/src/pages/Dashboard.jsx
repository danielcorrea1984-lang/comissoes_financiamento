import React, { useEffect, useMemo, useState } from 'react';
import api, { getUserInfo } from '../api';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, BarElement, ArcElement, CategoryScale, LinearScale, Tooltip, Legend
} from 'chart.js';

ChartJS.register(BarElement, ArcElement, CategoryScale, LinearScale, Tooltip, Legend);

function firstDayOfCurrentMonthISO(){
  const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
}
function todayISO(){
  const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function toYearMonth(s){
  if(!s) return '';
  return s.slice(0,7);
}

// Paleta AJ7
const PALETTE = ['#0f5fa5','#f2b705','#0b2a4a','#1385d8','#198754','#dc3545','#6610f2','#6c757d','#20c997','#fd7e14'];

export default function Dashboard(){
  const user = getUserInfo();
  const isAdmin = user?.role === 'admin';

  // período padrão = mês corrente (1º dia até hoje)
  const [startDate, setStartDate] = useState(firstDayOfCurrentMonthISO());
  const [endDate, setEndDate] = useState(todayISO());

  // filtros
  const [status, setStatus] = useState('');
  const [bancoId, setBancoId] = useState('');
  const [lojaId, setLojaId] = useState('');
  const [vendedorId, setVendedorId] = useState(''); // admin

  // listas
  const [banks, setBanks] = useState([]);
  const [stores, setStores] = useState([]);
  const [sellers, setSellers] = useState([]);

  // meta (local)
  const [meta, setMeta] = useState(() => {
    const m = localStorage.getItem('meta_mensal_br');
    return m ? Number(m) : 100000;
  });

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  function saveMeta(v){
    const n = Number((v||'').toString().replace(/\./g,'').replace(',','.'));
    if(!isNaN(n)){
      setMeta(n);
      localStorage.setItem('meta_mensal_br', String(n));
    }
  }

  async function loadFilters(){
    try{
      const [b, s] = await Promise.all([api.get('/banks'), api.get('/stores')]);
      setBanks(b.data || []);
      setStores(s.data || []);
      if(isAdmin){
        const r = await api.get('/sellers');
        setSellers(r.data || []);
      }
    }catch{}
  }

  async function fetchStats(){
    setLoading(true); setErr('');
    try{
      const params = { start: toYearMonth(startDate), end: toYearMonth(endDate) };
      if(status) params.status = status;
      if(bancoId) params.banco_id = bancoId;
      if(lojaId) params.loja_id = lojaId;
      if(isAdmin && vendedorId) params.vendedor_id = vendedorId;
      const { data } = await api.get('/stats/summary', { params });
      setData(data);
    }catch(e){
      setErr(e?.response?.data?.msg || 'Erro ao carregar estatísticas');
    }finally{
      setLoading(false);
    }
  }

  // limpar filtros (e recarregar)
  function clearFilters(){
    setStatus('');
    setBancoId('');
    setLojaId('');
    setVendedorId('');
    setStartDate(firstDayOfCurrentMonthISO());
    setEndDate(todayISO());
    // recarrega com filtros limpos
    setTimeout(fetchStats, 0);
  }

  useEffect(()=>{ loadFilters(); fetchStats(); /* eslint-disable-next-line */ },[]);

  // Totais
  const totals = useMemo(() => {
    const t = data?.totals || { count: 0, sum: 0 };
    return { count: t.count||0, sum: t.sum||0 };
  }, [data]);

  const conversao = useMemo(() => {
    const c = data?.conversion || { accepted: 0, rate: 0 };
    return { accepted: c.accepted||0, rate: c.rate||0 };
  }, [data]);

  // Atingimento
  const atingimento = useMemo(() => {
    const s = totals.sum || 0;
    const m = meta || 0;
    const perc = m ? (s/m)*100 : 0;
    return { soma: s, meta: m, perc };
  }, [totals, meta]);

  // Charts (com paleta)
  const chartMonth = useMemo(() => {
    const months = data?.by_month || [];
    return {
      labels: months.map(m => m.month),
      datasets: [{
        label: 'Valor total (R$)',
        data: months.map(m => m.sum || 0),
        backgroundColor: PALETTE[0],
        borderColor: PALETTE[0]
      }]
    };
  }, [data]);

  const chartStatus = useMemo(() => {
    const rows = data?.by_status || [];
    const colors = rows.map((_,i)=> PALETTE[i % PALETTE.length]);
    return {
      labels: rows.map(r => r.status || '—'),
      datasets: [{
        label: 'Qtd',
        data: rows.map(r => r.count || 0),
        backgroundColor: colors,
        borderColor: colors
      }]
    };
  }, [data]);

  const chartBank = useMemo(() => {
    const rows = data?.by_bank || [];
    const colors = rows.map((_,i)=> PALETTE[i % PALETTE.length]);
    return {
      labels: rows.map(r => r.banco || '—'),
      datasets: [{
        label: 'Valor total (R$)',
        data: rows.map(r => r.sum || 0),
        backgroundColor: colors,
        borderColor: colors
      }]
    };
  }, [data]);

  const chartStore = useMemo(() => {
    const rows = data?.by_store || [];
    const colors = rows.map((_,i)=> PALETTE[i % PALETTE.length]);
    return {
      labels: rows.map(r => r.loja || '—'),
      datasets: [{
        label: 'Valor total (R$)',
        data: rows.map(r => r.sum || 0),
        backgroundColor: colors,
        borderColor: colors
      }]
    };
  }, [data]);

  const chartSeller = useMemo(() => {
    if(!isAdmin) return null;
    const rows = data?.by_seller || [];
    const colors = rows.map((_,i)=> PALETTE[i % PALETTE.length]);
    return {
      labels: rows.map(r => r.vendedor_nome || r.vendedor_id),
      datasets: [{
        label: 'Valor total (R$)',
        data: rows.map(r => r.sum || 0),
        backgroundColor: colors,
        borderColor: colors
      }]
    };
  }, [data, isAdmin]);

  return (
    <div>
      {/* Título pequeno + separador antes dos filtros */}
      <div className="text-left">
        <h6 className="mb-2">Filtros</h6>
      </div>
      <hr className="mt-0 mb-3" />

      {/* Filtros */}
      <div className="mb-3">
        <div className="row g-2">
          <div className="col-12 col-md-6 col-lg-3">
            <label className="form-label small mb-1">Banco</label>
            <select className="form-select form-select-sm" value={bancoId} onChange={e=>setBancoId(e.target.value)}>
              <option value="">{'...'}</option>
              {banks.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </select>
          </div>

          <div className="col-12 col-md-6 col-lg-3">
            <label className="form-label small mb-1">Loja</label>
            <select className="form-select form-select-sm" value={lojaId} onChange={e=>setLojaId(e.target.value)}>
              <option value="">{'...'}</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>

          {/* Só admin enxerga o filtro de vendedor */}
          {isAdmin && (
            <div className="col-12 col-md-6 col-lg-3">
              <label className="form-label small mb-1">Vendedor</label>
              <select className="form-select form-select-sm" value={vendedorId} onChange={e=>setVendedorId(e.target.value)}>
                <option value="">{'...'}</option>
                {sellers.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
          )}

          <div className="col-12 col-md-6 col-lg-3">
            <label className="form-label small mb-1">Status</label>
            <select className="form-select form-select-sm" value={status} onChange={e=>setStatus(e.target.value)}>
              <option value="">{'...'}</option>
              <option value="enviada">Enviada</option>
              <option value="aceita">Aceita</option>
              <option value="recusada">Recusada</option>
            </select>
          </div>

          {/* Período */}
          <div className="col-12 col-md-8 col-lg-6">
            <label className="form-label small mb-1">Período</label>
            <div className="d-flex align-items-center gap-2">
              <input
                type="date"
                className="form-control form-control-sm"
                value={startDate}
                onChange={e=>setStartDate(e.target.value)}
                style={{ minWidth: 0 }}
              />
              <span className="text-muted small">até</span>
              <input
                type="date"
                className="form-control form-control-sm"
                value={endDate}
                onChange={e=>setEndDate(e.target.value)}
                style={{ minWidth: 0 }}
              />
            </div>
          </div>

          {/* Botões: mesma proporção */}
          <div className="col-12 col-md-4 col-lg-3 d-flex align-items-end">
            <div className="d-flex w-100 gap-2">
              <button
                className="btn btn-primary btn-sm flex-fill"
                onClick={fetchStats}
                disabled={loading}
              >
                {loading ? 'Carregando...' : 'Aplicar filtro'}
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary btn-sm flex-fill"
                onClick={clearFilters}
                disabled={loading}
                title="Limpar todos os filtros e voltar ao mês corrente"
              >
                Limpar filtro
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Separador */}
      <hr className="my-3" />

      {err && <div className="alert alert-danger">{err}</div>}

      {/* KPIs */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="text-muted">Quantidade de vendas</div>
              <div className="fs-3 fw-bold">{totals.count?.toLocaleString('pt-BR')}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="text-muted">Valor total</div>
              <div className="fs-3 fw-bold">
                {Number(totals.sum||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })}
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="text-muted">Taxa de conversão</div>
              <div className="fs-3 fw-bold">{conversao.rate?.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%</div>
              <div className="text-muted small">{conversao.accepted} aceitas de {totals.count}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div className="text-muted">Meta do período (R$)</div>
                <button className="btn btn-sm btn-outline-secondary" onClick={()=>{
                  const v = prompt('Defina a meta do período em R$', String(meta));
                  if(v !== null) saveMeta(v);
                }}>Editar</button>
              </div>
              <div className="fs-6 fw-bold mt-1">
                {Number(meta||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })}
              </div>
              <div className="mt-2">
                <div className="text-muted">Atingido</div>
                <div className="fw-bold">
                  {Number(atingimento.soma||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })}
                  {' '}({atingimento.perc.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%)
                </div>
                <div className="progress mt-2" role="progressbar" aria-valuenow={atingimento.perc} aria-valuemin="0" aria-valuemax="100">
                  <div className="progress-bar" style={{ width: `${Math.min(100, atingimento.perc)}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="row g-3">
        <div className="col-lg-6">
          <div className="card shadow-sm">
            <div className="card-header fw-bold">Valor por mês</div>
            <div className="card-body">
              <Bar data={chartMonth} options={{responsive:true, plugins:{legend:{display:false}}}} />
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card shadow-sm">
            <div className="card-header fw-bold">Distribuição por status (qtd)</div>
            <div className="card-body">
              <Doughnut data={chartStatus} />
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card shadow-sm">
            <div className="card-header fw-bold">Top bancos (valor)</div>
            <div className="card-body">
              <Bar data={chartBank} options={{indexAxis:'y', responsive:true, plugins:{legend:{display:false}}}} />
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card shadow-sm">
            <div className="card-header fw-bold">Top lojas (valor)</div>
            <div className="card-body">
              <Bar data={chartStore} options={{indexAxis:'y', responsive:true, plugins:{legend:{display:false}}}} />
            </div>
          </div>
        </div>

        {isAdmin && chartSeller && (
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-header fw-bold">Ranking de vendedores (valor)</div>
              <div className="card-body">
                <Bar data={chartSeller} options={{indexAxis:'y', responsive:true, plugins:{legend:{display:false}}}} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
