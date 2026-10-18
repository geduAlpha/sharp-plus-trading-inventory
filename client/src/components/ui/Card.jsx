import React from 'react';

const Card = ({ children, className = '', ...props }) => (
  <div className={`rounded-xl border border-ink-100 bg-white p-5 shadow-soft ${className}`} {...props}>
    {children}
  </div>
);

export default Card;
