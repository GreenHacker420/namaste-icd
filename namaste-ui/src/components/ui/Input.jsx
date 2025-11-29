'use client';

import { cn } from '@/lib/utils';

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'w-full px-4 py-2 border border-gray-300 rounded-lg',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
        'placeholder:text-gray-400',
        'disabled:bg-gray-100 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        'w-full px-4 py-2 border border-gray-300 rounded-lg',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
        'bg-white',
        'disabled:bg-gray-100 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
