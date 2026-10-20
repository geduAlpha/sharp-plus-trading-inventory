import React from 'react';

const Card = ({ children, className = '', ...props }) => (
  <div
    className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] transition-all duration-200 ${className}`}
    {...props}
  >
    {children}
  </div>
);

export default Card;
