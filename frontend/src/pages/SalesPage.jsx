// frontend/src/pages/SalesPage.jsx
import React, { useEffect, useState } from 'react';
import SalesList from '../sections/SalesList';
import { getUserInfo } from '../api';

export default function SalesPage() {
  const user = getUserInfo();
  const isAdmin = user?.role === 'admin';

  const [refreshKey, setRefreshKey] = useState(0);

  function openNewSale() {
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

    const win = window.open('/sales/new', 'AJ7NovaVenda', features);
    if (!win) {
      // fallback para abrir na mesma aba
      window.location.href = '/sales/new';
    }
  }

  // Atualiza lista quando a janela de cadastro sinalizar
  useEffect(() => {
    function onStorage(e) {
      if (e.key === 'sales_refresh') {
        setRefreshKey(k => k + 1);
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <div>
      {/*<div className="d-flex align-items-center mb-3">
        <h4 className="m-0">Vendas</h4>
        <div className="ms-auto">
          <button className="btn btn-primary" onClick={openNewSale}>
            Nova venda
          </button>
        </div>
      </div>

      
      <hr className="mb-3" />*/}

      <SalesList key={refreshKey} />
    </div>
  );
}
