import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

export function PageContainer({ className, ...props }: ComponentProps<'main'>) {
  return (
    <main
      className={cn(
        'mx-auto min-h-dvh w-full max-w-screen-xl bg-background px-4 text-foreground sm:px-6',
        className,
      )}
      {...props}
    />
  );
}
