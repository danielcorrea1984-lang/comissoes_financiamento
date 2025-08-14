import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sales from './pages/SalesPage';
import AdminCadastros from './pages/AdminCadastros';
import ManageBanks from './pages/ManageBanks';
import ManageStores from './pages/ManageStores';
import ManageSellers from './pages/ManageSellers';
import NewSaleWindow from './pages/NewSaleWindow';
import ForgotPasswordWindow from './pages/ForgotPasswordWindow'; // <-- NOVO
import ResetPassword from './pages/ResetPassword';

import Shell from './components/Shell';
import { setToken, getUserInfo } from './api';

// Helpers
function isAuth() {
  return !!localStorage.getItem('token');
}
function Private({ children }) {
  return isAuth() ? children : <Navigate to="/login" replace />;
}
function AdminOnly({ children }) {
  const user = getUserInfo();
  return isAuth() && user?.role === 'admin' ? children : <Navigate to="/login" replace />;
}

export default function App() {
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) setToken(token);
  }, []);

  const [bump, setBump] = React.useState(0);
  const handleLogout = () => setBump((x) => x + 1);

  return (
    <Routes key={bump}>
      <Route
        path="/"
        element={isAuth() ? <Navigate to="/app" replace /> : <Navigate to="/login" replace />}
      />

      {/* Login (sem Shell) */}
      <Route path="/login" element={<Login />} />

      {/* Popup de Esqueci minha senha (sem Shell) */}
      <Route
        path="/forgot"
        element={
          <ForgotPasswordWindow />
        }
      />
      <Route 
        path="/reset-password" 
        element={
          <ResetPassword />
        } 
      />
      {/* App autenticado */}
      <Route
        path="/app"
        element={
          <Private>
            <Shell onLogout={handleLogout}>
              <Dashboard />
            </Shell>
          </Private>
        }
      />
      <Route
        path="/sales"
        element={
          <Private>
            <Shell onLogout={handleLogout}>
              <Sales />
            </Shell>
          </Private>
        }
      />

      {/* Popup de Nova venda (sem Shell) */}
      <Route
        path="/sales/new"
        element={
          <Private>
            <NewSaleWindow />
          </Private>
        }
      />

      {/* Cadastros (admin) */}
      <Route
        path="/cadastros"
        element={
          <AdminOnly>
            <Shell onLogout={handleLogout}>
              <AdminCadastros />
            </Shell>
          </AdminOnly>
        }
      />
      <Route
        path="/cadastros/bancos"
        element={
          <AdminOnly>
            <Shell onLogout={handleLogout}>
              <ManageBanks />
            </Shell>
          </AdminOnly>
        }
      />
      <Route
        path="/cadastros/lojas"
        element={
          <AdminOnly>
            <Shell onLogout={handleLogout}>
              <ManageStores />
            </Shell>
          </AdminOnly>
        }
      />
      <Route
        path="/cadastros/vendedores"
        element={
          <AdminOnly>
            <Shell onLogout={handleLogout}>
              <ManageSellers />
            </Shell>
          </AdminOnly>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
