import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

const variants = cva(
  'inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:opacity-90',
        outline: 'border border-border bg-background text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);
export function Button({
  className,
  variant,
  ...props
}: ComponentProps<'button'> & VariantProps<typeof variants>) {
  return <button className={cn(variants({ variant }), className)} {...props} />;
}
