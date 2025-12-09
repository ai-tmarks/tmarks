interface LoadingMessageProps {
  message: string;
}

export function LoadingMessage({ message }: LoadingMessageProps) {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 shadow-lg animate-in slide-in-from-top-5 fade-in duration-300">
      <div className="flex items-start gap-3">
        <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-1.5 flex-shrink-0">
          {/* Spinning loader icon */}
          <svg
            className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        <div className="flex-1 pt-0.5">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {message}
          </p>
          {/* Progress dots animation */}
          <div className="flex gap-1 mt-2">
            <span className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
