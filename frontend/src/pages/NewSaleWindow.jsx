// frontend/src/pages/NewSaleWindow.jsx
import React from 'react';
import AddSale from '../sections/AddSale';

export default function NewSaleWindow(){
  function handleSaved(){
    try{
      localStorage.setItem('sales_refresh', String(Date.now()));
    }catch{}
    window.close();
  }

  return (
    <div style={{maxWidth: 960, margin: '16px auto', padding: '0 12px'}}>
      <div className="d-flex align-items-center mb-3">
        <img src="/logo.png" alt="AJ7" style={{ height: 36, marginRight: 10 }} />
        <h4 className="m-0">Cadastrar venda</h4>
        <button className="btn btn-outline-secondary btn-sm ms-auto" onClick={()=>window.close()}>
          Fechar
        </button>
      </div>
      <div className="card shadow-sm">
        <div className="card-body">
          <AddSale onCreated={handleSaved} />
        </div>
      </div>
    </div>
  );
}
