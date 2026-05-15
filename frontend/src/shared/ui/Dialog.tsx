import { Fragment, ReactNode } from 'react';
import { Dialog as HeadlessDialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import { cn } from '../lib/cn';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

/**
 * Accessible modal dialog with focus trap, ARIA, and escape handling.
 * Portal-rendered so it's not constrained by parent overflow.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
}: DialogProps) {
  return (
    <Transition appear show={open} as={Fragment}>
      <HeadlessDialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
        </Transition.Child>

        {/* Panel container */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <HeadlessDialog.Panel
                className={cn(
                  'w-full bg-white rounded-2xl shadow-2xl overflow-hidden',
                  sizeStyles[size]
                )}
              >
                {(title || showCloseButton) && (
                  <div className="flex items-start justify-between px-6 pt-6 pb-2">
                    <div className="flex-1">
                      {title && (
                        <HeadlessDialog.Title className="text-xl font-bold text-gray-900">
                          {title}
                        </HeadlessDialog.Title>
                      )}
                      {description && (
                        <HeadlessDialog.Description className="text-sm text-gray-600 mt-1">
                          {description}
                        </HeadlessDialog.Description>
                      )}
                    </div>
                    {showCloseButton && (
                      <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                        aria-label="Close dialog"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                )}
                <div className="px-6 pb-6 pt-2">{children}</div>
              </HeadlessDialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </HeadlessDialog>
    </Transition>
  );
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">{children}</div>;
}
