import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';
import { Alert, AlertDescription } from './alert';
import { Skeleton } from './skeleton';

const feedbackStyles = {
  info: { icon: Info, className: 'border-info/30 bg-info-subtle text-info' },
  success: { icon: CheckCircle2, className: 'border-success/30 bg-success-subtle text-success' },
  warning: { icon: TriangleAlert, className: 'border-warning/30 bg-warning-subtle text-warning' },
  error: { icon: AlertCircle, className: 'border-danger/30 bg-danger-subtle text-danger' },
} as const;

type FeedbackProps = ComponentProps<typeof Alert> & {
  tone: keyof typeof feedbackStyles;
  message: string;
};

export function Feedback({ tone, message, className, ...props }: FeedbackProps) {
  const { icon: Icon, className: toneClassName } = feedbackStyles[tone];

  return (
    <Alert
      className={cn('grid-cols-[16px_1fr] items-center gap-x-2', toneClassName, className)}
      role={tone === 'error' ? 'alert' : 'status'}
      variant={tone === 'error' ? 'destructive' : 'default'}
      {...props}
    >
      <Icon aria-hidden="true" className="size-4" />
      <AlertDescription className={cn('text-current', toneClassName)}>{message}</AlertDescription>
    </Alert>
  );
}

export function LoadingState({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div
      aria-busy="true"
      className="flex items-center gap-2 text-sm text-muted-foreground"
      role="status"
    >
      <Skeleton aria-hidden="true" className="size-4 rounded-full" />
      <span>{label}</span>
    </div>
  );
}
