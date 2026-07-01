import { cn } from '@/lib/utils';

interface ChevronIconProps {
  className?: string;
}

export function ChevronIcon({ className }: ChevronIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface AnimatedChevronProps {
  isOpen: boolean;
  className?: string;
}

export function AnimatedChevron({ isOpen, className }: AnimatedChevronProps) {
  return (
    <ChevronIcon
      className={cn(
        'transition-transform duration-200 ease-out shrink-0',
        isOpen && 'rotate-180',
        className
      )}
    />
  );
}
