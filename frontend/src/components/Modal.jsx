import React, { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, width = 900, height = 520 }) {
  useEffect(() => {
    function onKey(e){
      if(e.key === 'Escape'){
        onClose?.();
      }
    }
    if(open){
      document.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden'; // trava scroll da página ao abrir modal
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if(!open) return null;

  // Dimensão fixa (mantém responsivo em telas menores)
  const maxW = Math.min(width, window.innerWidth - 32);   // margem 16px cada lado
  const maxH = Math.min(height, window.innerHeight - 32); // margem 16px topo/baixo

  return (
    <div
      aria-modal
      role="dialog"
      className="modal-backdrop fade show"
      style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,0.45)',
        display:'flex', alignItems:'center', justifyContent:'center', zIndex:1050
      }}
      onClick={onClose}
    >
      <div
        className="card shadow"
        style={{
          width: maxW, height: maxH, maxWidth:'95vw', maxHeight:'90vh',
          display:'flex', flexDirection:'column'
        }}
        onClick={e=>e.stopPropagation()} // evita fechar ao clicar dentro
      >
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">{title}</h5>
          <button className="btn btn-sm btn-outline-secondary" onClick={onClose} aria-label="Fechar">Fechar</button>
        </div>
        <div
          className="card-body"
          style={{ overflow:'auto' }} // rolagem interna caso conteúdo ultrapasse
        >
          {children}
        </div>
      </div>
    </div>
  );
}
