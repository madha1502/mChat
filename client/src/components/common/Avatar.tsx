import React from 'react';
import { User, Users, MessageSquare } from 'lucide-react';

interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  hasStatus?: boolean;
  statusViewed?: boolean;
  isGroup?: boolean;
  isWhatsApp?: boolean;
  className?: string;
  onClick?: () => void;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name = 'User',
  size = 'md',
  isOnline,
  hasStatus,
  statusViewed,
  isGroup,
  isWhatsApp,
  className = '',
  onClick,
}) => {
  const sizeClasses = {
    xs: 'w-7 h-7 text-xs',
    sm: 'w-9 h-9 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
  };

  const ringClasses = hasStatus
    ? statusViewed
      ? 'ring-2 ring-slate-500/40 p-0.5'
      : 'ring-2 ring-emerald-500 p-0.5'
    : '';

  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <div
      onClick={onClick}
      className={`relative inline-block select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div
        className={`${sizeClasses[size]} rounded-full overflow-hidden flex items-center justify-center font-semibold transition-transform duration-200 ${ringClasses} ${
          src ? 'bg-slate-800' : isGroup ? 'bg-indigo-600/30 text-indigo-300' : isWhatsApp ? 'bg-emerald-600/30 text-emerald-300' : 'bg-sky-600/30 text-sky-300'
        }`}
      >
        {src ? (
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover rounded-full"
            onError={(e) => {
              // Fallback to initials if image fails to load
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : isGroup ? (
          <Users className="w-1/2 h-1/2" />
        ) : isWhatsApp ? (
          <MessageSquare className="w-1/2 h-1/2" />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {/* Online indicator badge */}
      {isOnline !== undefined && !isGroup && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ring-2 ring-[#0B0F14] ${
            isOnline ? 'bg-emerald-500' : 'bg-slate-500'
          } ${size === 'xs' || size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'}`}
        />
      )}
    </div>
  );
};
