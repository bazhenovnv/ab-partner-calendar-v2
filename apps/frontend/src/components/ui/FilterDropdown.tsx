'use client';

import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { AnimatedChevron } from './ChevronIcon';

interface FilterDropdownProps {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  buttonClassName?: string;
}

export function FilterDropdown({
  label,
  isOpen,
  onToggle,
  onClose,
  children,
  className,
  buttonClassName,
}: FilterDropdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={onToggle}
        className={cn(
          'flex items-center justify-between gap-2 w-full',
          'px-4 py-3 rounded-xl bg-white border border-dropdown-border',
          'text-sm font-medium text-primary whitespace-nowrap',
          'hover:border-primary/40 transition-colors',
          buttonClassName
        )}
      >
        <span className="truncate">{label}</span>
        <AnimatedChevron isOpen={isOpen} />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className={cn(
            'absolute z-50 top-full mt-1 w-full min-w-max',
            'bg-white border border-dropdown-border rounded-xl shadow-base',
            'py-1'
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
