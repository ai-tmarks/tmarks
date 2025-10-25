import { useEffect } from 'react';

interface SuccessMessageProps {
  message: string;
  onDismiss?: () => void;
  autoHideDuration?: number; // milliseconds, default 3000
}

export function SuccessMessage({ message, onDismiss, autoHideDuration = 3000 }: SuccessMessageProps) {
  useEffect(() => {
    if (onDismiss && autoHideDuration > 0) {
      const timer = setTimeout(() => {
        onDismiss();
      }, autoHideDuration);
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [onDismiss, autoHideDuration]);

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-top-5 fade-in duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-green-200 dark:border-green-800 p-4 min-w-[320px] max-w-md">
        <div className="flex items-start gap-3">
          <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-1.5 flex-shrink-0">
            <svg
              className="w-5 h-5 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1 pt-0.5">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {message}
            </p>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
