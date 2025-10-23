interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onDismiss, onRetry }: ErrorMessageProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 p-4 shadow-lg">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-2">
              <svg
                className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-base text-red-800 dark:text-red-300 font-medium">{message}</p>
          </div>
          <div className="flex items-center gap-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="bg-white/80 dark:bg-red-900/40 hover:bg-white dark:hover:bg-red-800/60 text-red-600 dark:text-red-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
              >
                重试
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-800 text-red-600 dark:text-red-400 p-2 rounded-lg transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
