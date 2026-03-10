import type { ReactNode } from 'react';
import type {
  ControllerProps,
  FieldPath,
  FieldValues,
  UseFormReturn,
} from 'react-hook-form';
import { Controller } from 'react-hook-form';

import { cn } from '@/lib/utils';

export interface FormProps<TFieldValues extends FieldValues> {
  form: UseFormReturn<TFieldValues>;
  children: ReactNode;
  className?: string;
  onSubmit: (values: TFieldValues) => void | Promise<void>;
}

export function Form<TFieldValues extends FieldValues>({
  form,
  children,
  className,
  onSubmit,
}: FormProps<TFieldValues>) {
  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className={cn('space-y-4', className)}
    >
      {children}
    </form>
  );
}

export interface FormFieldProps<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>
  extends Omit<ControllerProps<TFieldValues, TName>, 'render'> {
  label?: string;
  helperText?: string;
  children: (field: ControllerProps<TFieldValues, TName>['field']) => ReactNode;
}

export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  control,
  rules,
  label,
  helperText,
  children,
}: FormFieldProps<TFieldValues, TName>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => (
        <div className="space-y-1">
          {label && (
            <label className="block text-xs font-medium text-muted-foreground">
              {label}
            </label>
          )}
          {children(field)}
          {fieldState.error ? (
            <p className="text-xs text-red-600 mt-0.5">
              {fieldState.error.message}
            </p>
          ) : helperText ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              {helperText}
            </p>
          ) : null}
        </div>
      )}
    />
  );
}

