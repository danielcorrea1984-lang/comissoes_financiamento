import React, { useEffect, useState } from 'react';
import axios from 'axios';

function TabelaComissoes() {
  const [comissoes, setComissoes] = useState([]);

  useEffect(() => {
    axios.get('http://127.0.0.1:5000/api/comissoes')
      .then(response => {
        setComissoes(response.data);
      })
      .catch(error => {
        console.error("Erro ao buscar dados:", error);
      });
  }, []);

  return (
    <div className="container mt-4">
      <h2>Comissões de Financiamento</h2>
      <table className="table table-bordered table-hover mt-3">
        <thead className="table-dark">
          <tr>
            <th>ID</th>
            <th>Vendedor</th>
            <th>Valor (R$)</th>
            <th>Mês</th>
          </tr>
        </thead>
        <tbody>
          {comissoes.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.vendedor}</td>
              <td>{item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
              <td>{item.mes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TabelaComissoes;