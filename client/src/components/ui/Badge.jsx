import React from 'react';

const styles = {
  green: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
  ink: 'bg-ink-50 text-ink-600 ring-1 ring-inset ring-ink-200',
  brass: 'bg-brass-50 text-brass-700 ring-1 ring-inset ring-brass-200',
};

const Badge = ({ children, color = 'ink' }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[color]}`}>
    {children}
  </span>
);

export default Badge;
