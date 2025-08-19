// frontend/src/sections/ManageBanks.jsx
import React, { useEffect, useRef, useState } from 'react';
import api from '../api';

/* ----------------- helpers ----------------- */
// Aceita "0,5", "0.5", "1", "1.0", "2,00" e retorna número entre 0..100 com até 4 casas
function parsePct(token) {
  if (token == null) return null;
  const s = String(token).trim().replace(/\s+/g, '');
  if (!s) return null;
  const n = Number(s.replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > 100) return null;
  // preserva até 4 casas
  return Math.round(n * 10000) / 10000;
}

// Exibe no padrão pt-BR com 1..4 casas
function fmtPct(n) {
  if (n == null) return '';
  return (
    n.toLocaleString('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 4,
    }) + '%'
  );
}

// Normaliza lista de comissões vindas de várias formas
function normalizeComissoes(val) {
  try {
    if (Array.isArray(val)) {
      return [...new Set(val.map(parsePct).filter(v => v != null))].sort((a, b) => a - b);
    }
    if (typeof val === 'string') {
      // tenta JSON primeiro
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) {
          return [...new Set(parsed.map(parsePct).filter(v => v != null))].sort((a, b) => a - b);
        }
      } catch {}
      // ATENÇÃO: NÃO dividir por vírgula, pois vírgula é separador decimal em pt-BR.
      // Divide somente por ponto-e-vírgula ou quebra de linha.
      const tokens = val.split(/[;\n]+/).map(t => t.trim()).filter(Boolean);
      return [...new Set(tokens.map(parsePct).filter(v => v != null))].sort((a, b) => a - b);
    }
    if (val != null && typeof val === 'object') {
      // pode vir como { values:[...] } de algum backend — tentamos extrair
      const maybe = val.values ?? val.list ?? val.data ?? val.comissoes ?? val.faixas ?? val.commission_values;
      if (Array.isArray(maybe)) {
        return [...new Set(maybe.map(parsePct).filter(v => v != null))].sort((a, b) => a - b);
      }
    }
    return [];
  } catch {
    return [];
  }
}

// Monta string para o input (separados por '; ')
function joinForInput(arr) {
  const list = normalizeComissoes(arr);
  return list
    .map(n => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 4 }))
    .join('; ');
}

// lê comissões aceitando várias chaves possíveis do backend
function readCommissionsFromBank(b) {
  return b?.comissoes ?? b?.faixas ?? b?.commission_values ?? b?.commissionRates ?? [];
}

/* ----------------- componente ----------------- */
export default function ManageBanks() {
  const [items, setItems] = useState([]);

  // formulário
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [ativo, setAtivo] = useState(true); // mantido no payload

  // comissões (string única no input; salva junto com "Salvar")
  const [comissoesText, setComissoesText] = useState(''); // ex.: "0,5; 1,0; 1,5"

  const [msg, setMsg] = useState('');
  const [editingId, setEditingId] = useState(null); // null = criando
  const [viewing, setViewing] = useState(null);

  const formRef = useRef(null);

  async function load() {
    try {
      const { data } = await api.get('/banks');
      const norm = (data || []).map(b => {
        const list = normalizeComissoes(readCommissionsFromBank(b));
        return { ...b, _comissoesNormalized: list };
      });
      setItems(norm);
    } catch (err) {
      if (err?.response?.status !== 401) {
        setMsg(err?.response?.data?.msg || 'Erro ao carregar bancos');
      }
    }
  }
  useEffect(() => {
    load();
  }, []);

  function clearForm() {
    setNome('');
    setCodigo('');
    setAtivo(true);
    setComissoesText('');
    setEditingId(null);
  }

  async function save(e) {
    e.preventDefault();
    setMsg('');
    try {
      const lista = normalizeComissoes(comissoesText); // [0.5, 1, 1.5, 3.125, ...]

      // payload compatível com vários backends
      const payload = {
        nome,
        codigo: codigo || null,
        ativo,
        comissoes: lista, // pt-BR
        faixas: lista, // alguns backends antigos
        commission_values: lista, // snake_en
      };

      if (editingId) {
        await api.put(`/banks/${editingId}`, payload);
        setMsg('Banco atualizado.');
      } else {
        await api.post('/banks', payload);
        setMsg('Banco cadastrado.');
      }
      clearForm();
      await load();
    } catch (err) {
      if (err?.response?.status !== 401) {
        setMsg(err?.response?.data?.msg || 'Erro ao salvar');
      }
    }
  }

  async function toggle(item) {
    try {
      await api.put(`/banks/${item.id}`, { ativo: !item.ativo });
      load();
    } catch (err) {
      if (err?.response?.status !== 401) {
        setMsg(err?.response?.data?.msg || 'Erro ao alterar status');
      }
    }
  }

  function onEdit(item) {
    setEditingId(item.id);
    setNome(item.nome || '');
    setCodigo(item.codigo || '');
    setAtivo(!!item.ativo);

    // preenche input a partir de QUALQUER chave suportada
    const list = normalizeComissoes(readCommissionsFromBank(item));
    setComissoesText(joinForInput(list));

    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  function renderComissoesCompact(list) {
    const arr = normalizeComissoes(list);
    if (arr.length === 0) return <span className="text-muted">—</span>;
    const shown = arr.slice(0, 4).map(fmtPct);
    const more = arr.length > 4 ? ` (+${arr.length - 4})` : '';
    return shown.join(', ') + more;
  }

  return (
    <div>
      {/* FORM */}
      <form ref={formRef} onSubmit={save} className="mb-3">
        {/* Linha 1 */}
        <div className="row g-2" style={{ maxWidth: 1100 }}>
          <div className="col-md-5">
            <label className="form-label mb-1">Nome *</label>
            <input
              className="form-control"
              placeholder="Nome do banco"
              value={nome}
              onChange={e => setNome(e.target.value)}
              required
            />
          </div>

          <div className="col-md-3">
            <label className="form-label mb-1">Código</label>
            <input
              className="form-control"
              placeholder="Código interno ou FEBRABAN"
              value={codigo}
              onChange={e => setCodigo(e.target.value)}
            />
          </div>
        </div>

        {/* Linha 2 — Comissões + Salvar à esquerda */}
        <div className="row g-2 mt-2 align-items-end" style={{ maxWidth: 1100 }}>
          <div className="col-md-6">
            <label className="form-label mb-1">
              Comissões (%) <small className="text-muted">— separe por “;”</small>
            </label>
            <input
              className="form-control form-control-sm"
              placeholder="Ex.: 0,5; 1; 1,5; 2,25; 3,125"
              value={comissoesText}
              onChange={e => setComissoesText(e.target.value)}
            />
          </div>

          <div className="col-auto d-flex align-items-end">
            <button
              type="submit"
              className="btn btn-primary btn-sm px-3"
              style={{ minWidth: 96, overflow: 'visible' }}
            >
              Salvar
            </button>
            {editingId && (
              <button type="button" className="btn btn-outline-secondary btn-sm ms-2" onClick={clearForm}>
                Cancelar
              </button>
            )}
          </div>
        </div>

        {msg && (
          <div className="alert alert-info py-2 my-2" style={{ maxWidth: 1100 }}>
            {msg}
          </div>
        )}
      </form>

      {/* TABELA */}
      <div className="table-responsive">
        <table className="table table-striped align-middle">
          <thead className="table-dark">
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>Código</th>
              <th>Comissões (%)</th>
              <th>Ativo</th>
              <th style={{ width: 110 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => {
              const list = it._comissoesNormalized ?? normalizeComissoes(readCommissionsFromBank(it));
              return (
                <tr key={it.id}>
                  <td>{it.id}</td>
                  <td>{it.nome}</td>
                  <td>{it.codigo || '-'}</td>
                  <td>{renderComissoesCompact(list)}</td>
                  <td>
                    <div className="form-check form-switch m-0">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={!!it.ativo}
                        onChange={() => toggle(it)}
                      />
                    </div>
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm btn-square"
                        title="Visualizar"
                        onClick={() => setViewing({ ...it, _comissoesNormalized: list })}
                      >
                        <i className="bi bi-eye"></i>
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm btn-square"
                        title="Editar"
                        onClick={() => onEdit({ ...it, _comissoesNormalized: list })}
                      >
                        <i className="bi bi-pencil-square"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-muted py-4">
                  Nenhum banco cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Visualização */}
      {viewing && (
        <div className="aj-modal-backdrop" onClick={() => setViewing(null)}>
          <div className="card shadow aj-modal-card" onClick={e => e.stopPropagation()}>
            <div className="card-header d-flex align-items-center">
              <strong>Detalhes do banco #{viewing.id}</strong>
              <button type="button" className="btn btn-sm btn-light ms-auto" onClick={() => setViewing(null)}>
                Fechar
              </button>
            </div>
            <div className="card-body">
              <div className="row g-2">
                <div className="col-md-6">
                  <b>Nome:</b> {viewing.nome}
                </div>
                <div className="col-md-3">
                  <b>Código:</b> {viewing.codigo || '-'}
                </div>
                <div className="col-md-3">
                  <b>Ativo:</b> {viewing.ativo ? 'Sim' : 'Não'}
                </div>
                <div className="col-12">
                  <b>Comissões (%):</b>{' '}
                  {normalizeComissoes(viewing._comissoesNormalized ?? readCommissionsFromBank(viewing)).length
                    ? normalizeComissoes(viewing._comissoesNormalized ?? readCommissionsFromBank(viewing)).map(
                        (v, i) => (
                          <span key={i} className="badge text-bg-light me-1">
                            {fmtPct(v)}
                          </span>
                        )
                      )
                    : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
        .aj-modal-card{ width:min(720px, calc(100% - 24px)); }
        .btn{ overflow:visible; }
      `}</style>
    </div>
  );
}
