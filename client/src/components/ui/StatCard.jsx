import React from 'react';

const toneMap = {
  ink: 'bg-ink-900 text-white',
  brass: 'bg-brass-400 text-ink-900',
  light: 'bg-white text-ink-900 border border-ink-100',
};

const StatCard = ({ label, value, sub, icon: Icon, tone = 'light' }) => (
  <div className={`rounded-xl p-5 shadow-soft ${toneMap[tone]}`}>
    <div className="flex items-start justify-between">
      <p className={`text-sm ${tone === 'light' ? 'text-ink-400' : 'opacity-80'}`}>{label}</p>
      {Icon && (
        <span className={`rounded-lg p-1.5 ${tone === 'light' ? 'bg-ink-50 text-ink-500' : 'bg-white/15'}`}>
          <Icon size={16} strokeWidth={2.25} />
        </span>
      )}
    </div>
    <p className="tabular mt-3 text-3xl font-bold leading-none">{value}</p>
    {sub && <p className={`mt-2 text-xs ${tone === 'light' ? 'text-ink-400' : 'opacity-70'}`}>{sub}</p>}
  </div>
);

export default StatCard;
