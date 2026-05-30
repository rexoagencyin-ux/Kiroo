import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        accent: 'border-transparent bg-accent text-accent-foreground',
        secondary: 'border-transparent bg-muted text-accent',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-accent border-border',
        success: 'border-transparent bg-primary-50 text-primary-700',
        warning: 'border-transparent bg-amber-100 text-amber-700',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
