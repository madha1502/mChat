import React from 'react';
import { MessageSquare, ShieldCheck, User } from 'lucide-react';

interface BadgeProps {
  variant?: 'whatsapp' | 'internal' | 'admin' | 'unread' | 'custom';
  count?: number;
  text?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'internal', count, text, className = '' }) => {
  if (variant === 'unread') {
    if (!count || count <= 0) return null;
    return (
      <span
        className={`px-2 py-0.5 text-xs font-bold rounded-full bg-sky-500 text-white min-w-[20px] text-center shadow-sm shadow-sky-500/20 animate-in fade-in zoom-in-75 duration-200 ${className}`}
      >
        {count > 99 ? '99+' : count}
      </span>
    );
  }

  if (variant === 'whatsapp') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${className}`}
      >
        <MessageSquare className="w-3 h-3 text-emerald-400" />
        WhatsApp Business
      </span>
    );
  }

  if (variant === 'admin') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 ${className}`}
      >
        <ShieldCheck className="w-3 h-3" />
        Admin
      </span>
    );
  }

  if (variant === 'internal') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 ${className}`}
      >
        <User className="w-3 h-3 text-sky-400" />
        Internal
      </span>
    );
  }

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-md bg-slate-800 text-slate-300 ${className}`}>
      {text}
    </span>
  );
};
