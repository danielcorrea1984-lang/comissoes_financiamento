import axios from 'axios';

// usa var de ambiente na build (Render) com fallback local
const API_BASE =
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BASE) ||
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) ||
  'http://127.0.0.1:5000';

const api = axios.create({ baseURL: API_BASE });

export function setToken(token){
  if(token){
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('token', token);
  } else {
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
  }
}

export function setUser(user){
  if(user){
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('user');
  }
}

export function getUserInfo(){
  try{
    return JSON.parse(localStorage.getItem('user') || 'null');
  }catch{
    return null;
  }
}

// reaplica token salvo ao recarregar
const saved = localStorage.getItem('token');
if(saved) setToken(saved);

export default api;
