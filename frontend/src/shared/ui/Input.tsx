import { InputHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '../lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, helperText, className, id, ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-help` : undefined}
        className={cn(
          'w-full px-4 py-2 border rounded-lg',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          'disabled:bg-gray-50 disabled:text-gray-500',
          error
            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500',
          className
        )}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-sm text-red-600 mt-1" role="alert">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={`${inputId}-help`} className="text-xs text-gray-500 mt-1">
          {helperText}
        </p>
      )}
    </div>
  );
});
