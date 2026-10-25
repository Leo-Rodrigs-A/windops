import { type ComponentProps, useId } from 'react';
import { cn } from '../../lib/utils';
import { Field, FieldDescription, FieldError, FieldLabel } from './field';
import { Input } from './input';
import { Textarea } from './textarea';

type FormFieldProps = {
  label: string;
  description?: string;
  error?: string;
  className?: string;
};

type TextFieldProps = FormFieldProps & Omit<ComponentProps<typeof Input>, 'id'> & { id?: string };

export function TextField({ id, label, description, error, className, ...props }: TextFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const descriptionId = `${fieldId}-description`;
  const errorId = `${fieldId}-error`;
  const describedBy = [description && descriptionId, error && errorId].filter(Boolean).join(' ');

  return (
    <Field className={cn('gap-2', className)} data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={fieldId}>
        {label}
        {props.required && <span aria-hidden="true">{' *'}</span>}
      </FieldLabel>
      <Input
        aria-describedby={describedBy || undefined}
        aria-invalid={error ? true : undefined}
        id={fieldId}
        {...props}
      />
      {description && !error && (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      )}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  );
}

type TextAreaFieldProps = FormFieldProps &
  Omit<ComponentProps<typeof Textarea>, 'id'> & { id?: string };

export function TextAreaField({
  id,
  label,
  description,
  error,
  className,
  ...props
}: TextAreaFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const descriptionId = `${fieldId}-description`;
  const errorId = `${fieldId}-error`;
  const describedBy = [description && descriptionId, error && errorId].filter(Boolean).join(' ');

  return (
    <Field className={cn('gap-2', className)} data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={fieldId}>
        {label}
        {props.required && <span aria-hidden="true">{' *'}</span>}
      </FieldLabel>
      <Textarea
        aria-describedby={describedBy || undefined}
        aria-invalid={error ? true : undefined}
        className="min-h-32 resize-y rounded-lg"
        id={fieldId}
        {...props}
      />
      {description && !error && (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      )}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  );
}
