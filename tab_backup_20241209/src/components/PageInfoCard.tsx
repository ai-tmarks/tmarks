import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PageInfoCardProps {
  title: string;
  url: string;
  description?: string;
  thumbnail?: string;
  thumbnails?: string[];
  favicon?: string;
  onThumbnailChange?: (thumbnail: string) => void;
}

export function PageInfoCard({ title, url, description, thumbnail, thumbnails, favicon, onThumbnailChange }: PageInfoCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  // 使用thumbnails数组或单个thumbnail
  const availableThumbnails = thumbnails && thumbnails.length > 0 ? thumbnails : (thumbnail ? [thumbnail] : []);
  const currentThumbnail = availableThumbnails[currentIndex];
  const hasMultipleThumbnails = availableThumbnails.length > 1;

  const handlePrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : availableThumbnails.length - 1;
    setCurrentIndex(newIndex);
    setImageError(false);
    if (onThumbnailChange && availableThumbnails[newIndex]) {
      onThumbnailChange(availableThumbnails[newIndex]);
    }
  };

  const handleNext = () => {
    const newIndex = currentIndex < availableThumbnails.length - 1 ? currentIndex + 1 : 0;
    setCurrentIndex(newIndex);
    setImageError(false);
    if (onThumbnailChange && availableThumbnails[newIndex]) {
      onThumbnailChange(availableThumbnails[newIndex]);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Thumbnail section */}
      {currentThumbnail && !imageError && (
        <div className="relative h-32 bg-gray-100 dark:bg-gray-700 group">
          <img
            src={currentThumbnail}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              setImageError(true);
              e.currentTarget.style.display = 'none';
            }}
          />
          
          {/* Navigation buttons - only show if multiple thumbnails */}
          {hasMultipleThumbnails && (
            <>
              <button
                onClick={handlePrevious}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/70 active:scale-95"
                title="上一张"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/70 active:scale-95"
                title="下一张"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Image counter */}
              <div className="absolute bottom-2 right-2 px-2 py-1 rounded-full bg-black/50 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {currentIndex + 1} / {availableThumbnails.length}
              </div>
            </>
          )}
        </div>
      )}

      {/* Content section */}
      <div className="p-4 space-y-3">
        {/* Title with favicon */}
        <div className="flex items-start gap-2">
          {favicon && (
            <img
              src={favicon}
              alt=""
              className="w-5 h-5 flex-shrink-0 mt-0.5 rounded"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          <h3 className={`flex-1 text-base font-semibold text-gray-900 dark:text-white line-clamp-2 ${thumbnail && !favicon ? 'text-center' : ''}`}>
            {title}
          </h3>
        </div>

        {/* URL */}
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate" title={url}>
          {url}
        </p>

        {/* Description */}
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
