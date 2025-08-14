import React from 'react';
import { Navigate } from 'react-router-dom';

export default function SellerRoute({ children }){
  const token = localStorage.getItem('token_v2');
  let role = null;
  try{
    const u = JSON.parse(localStorage.getItem('user_info_v1') || 'null');
    role = u?.role || null;
  }catch{}
  if(!token) return <Navigate to="/login" replace />;
  if(role === 'admin') return <Navigate to="/app" replace />;
  return children;
}
