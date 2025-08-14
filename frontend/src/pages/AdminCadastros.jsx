import React, { useState } from 'react';
import ManageBanks from './ManageBanks';
import ManageStores from './ManageStores';
import ManageSellers from './ManageSellers';

export default function AdminCadastros(){
  const [tab, setTab] = useState('banks'); // banks | stores | sellers

  return (
    <div>
      <h3 className="mb-3">Cadastro (Admin)</h3>

      <ul className="nav nav-tabs tabs-dark mb-3">
        <li className="nav-item">
          <button className={`nav-link ${tab==='banks'?'active':''}`} onClick={()=>setTab('banks')}>Bancos</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab==='stores'?'active':''}`} onClick={()=>setTab('stores')}>Lojas Parceiras</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab==='sellers'?'active':''}`} onClick={()=>setTab('sellers')}>Vendedores</button>
        </li>
      </ul>

      {tab === 'banks' && <ManageBanks />}
      {tab === 'stores' && <ManageStores />}
      {tab === 'sellers' && <ManageSellers />}
    </div>
  );
}
