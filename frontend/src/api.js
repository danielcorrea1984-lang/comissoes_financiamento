import axios from 'axios';

const api = axios.create({ baseURL: 'http://127.0.0.1:5000' });

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
