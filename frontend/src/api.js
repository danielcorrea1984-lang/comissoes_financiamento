import axios from 'axios';

// Base da API: usa a variável de ambiente em produção (Render) e
// cai para localhost apenas no desenvolvimento local.
const API_BASE =
  (process.env.REACT_APP_API_BASE || 'http://127.0.0.1:5000').replace(/\/+$/, ''); // remove barra final

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000, // evita travar caso a API não responda
});

// Salva/limpa o token nos headers e no localStorage
export function setToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    localStorage.setItem('token', token);
  } else {
    delete api.defaults.headers.common.Authorization;
    localStorage.removeItem('token');
  }
}

// Salva/limpa o usuário no localStorage
export function setUser(user) {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('user');
  }
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
const saved = localStorage.getItem('token');
if (saved) setToken(saved);

// Opcional: exporta a BASE para facilitar debug no console
export { API_BASE };

export default api;
