import React from 'react';
import { Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PrimaryButton } from './Buttons';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = Search,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 p-8 text-center sm:p-12">
      <div className="rounded-full bg-stone-100 p-4 shadow-inner text-stone-500">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="mt-4 text-base font-bold text-stone-900 sm:text-lg">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs text-stone-500 sm:text-sm">{description}</p>
      {actionText && onAction && (
        <div className="mt-5">
          <PrimaryButton size="sm" onClick={onAction}>
            {actionText}
          </PrimaryButton>
        </div>
      )}
    </div>
  );
};

export const LoadingState: React.FC<{ message?: string }> = ({
  message = 'Loading groundwater telemetry data...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-agri-200 border-t-agri-700" />
      <p className="mt-4 text-sm font-medium text-stone-600 animate-pulse">{message}</p>
    </div>
  );
};
