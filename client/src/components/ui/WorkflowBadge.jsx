import React from 'react';
import {
  FileEdit, CheckCircle, ShieldCheck, PackageCheck,
  XCircle, Clock, FileX,
} from 'lucide-react';

const CONFIGS = {
  draft:      { label: 'Draft',      icon: FileEdit,     cls: 'bg-ink-100 text-ink-600' },
  checked:    { label: 'Checked',    icon: CheckCircle,  cls: 'bg-blue-100 text-blue-700' },
  approved:   { label: 'Approved',   icon: ShieldCheck,  cls: 'bg-violet-100 text-violet-700' },
  received:   { label: 'Received',   icon: PackageCheck, cls: 'bg-emerald-100 text-emerald-700' },
  cancelled:  { label: 'Cancelled',  icon: XCircle,      cls: 'bg-red-100 text-red-700' },
  pending:    { label: 'Pending',    icon: Clock,        cls: 'bg-amber-100 text-amber-700' },
  posted:     { label: 'Posted',     icon: PackageCheck, cls: 'bg-emerald-100 text-emerald-700' },
  voided:     { label: 'Voided',     icon: FileX,        cls: 'bg-red-100 text-red-700' },
};

export default function WorkflowBadge({ status, size = 'md' }) {
  const cfg = CONFIGS[status] ?? { label: status, icon: Clock, cls: 'bg-ink-100 text-ink-500' };
  const Icon = cfg.icon;
  const px = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${px} ${cfg.cls}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}
