// frontend/src/api.js
import axios from 'axios';

// Base da API: usa a variável de ambiente em produção (Render) e
// cai para localhost apenas no desenvolvimento local.
// Também remove qualquer barra no final para evitar '//' nas URLs.
const API_BASE =
  (process.env.REACT_APP_API_BASE || 'http://127.0.0.1:5000').replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000, // evita travar caso a API não responda
});

// Salva/limpa o token nos headers e no localStorage
export function setToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    try { localStorage.setItem('token', token); } catch {}
  } else {
    delete api.defaults.headers.common.Authorization;
    try { localStorage.removeItem('token'); } catch {}
  }
}

// Salva/limpa o usuário no localStorage
export function setUser(user) {
  try {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  } catch {}
}

// Recupera o usuário salvo
export function getUserInfo() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

// Reaplica token salvo ao recarregar a página
try {
  const saved = localStorage.getItem('token');
  if (saved) setToken(saved);
} catch {}

// Interceptor global de respostas:
// - Se receber 401 (não autenticado), limpa sessão e leva para o login.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } catch {}
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login?expired=1';
      }
    }
    return Promise.reject(err);
  }
);

// Opcional: exporta a BASE para facilitar debug no console
export { API_BASE };

export default api;
