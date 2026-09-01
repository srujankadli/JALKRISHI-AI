import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const PrimaryButton: React.FC<ButtonProps> = ({
  children,
  icon: Icon,
  iconPosition = 'left',
  size = 'md',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm font-semibold min-h-[44px]',
    lg: 'px-5 py-3 text-base font-bold min-h-[48px]',
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-agri-700 font-semibold text-white shadow-sm transition-all duration-150 hover:bg-agri-800 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-agri-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        sizeClasses[size]
      } ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {Icon && iconPosition === 'left' && <Icon className="h-4 w-4 shrink-0" />}
      <span>{children}</span>
      {Icon && iconPosition === 'right' && <Icon className="h-4 w-4 shrink-0" />}
    </button>
  );
};

export const SecondaryButton: React.FC<ButtonProps> = ({
  children,
  icon: Icon,
  iconPosition = 'left',
  size = 'md',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm font-semibold min-h-[44px]',
    lg: 'px-5 py-3 text-base font-bold min-h-[48px]',
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white font-semibold text-stone-700 shadow-xs transition-all duration-150 hover:bg-stone-50 hover:text-stone-900 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        sizeClasses[size]
      } ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {Icon && iconPosition === 'left' && <Icon className="h-4 w-4 shrink-0 text-stone-500" />}
      <span>{children}</span>
      {Icon && iconPosition === 'right' && <Icon className="h-4 w-4 shrink-0 text-stone-500" />}
    </button>
  );
};
