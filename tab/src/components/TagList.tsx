import type { TagSuggestion } from '@/types';

interface TagListProps {
  tags: TagSuggestion[];
  selectedTags: string[];
  onToggle: (tagName: string) => void;
}

export function TagList({ tags, selectedTags, onToggle }: TagListProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const isSelected = selectedTags.includes(tag.name);
        const isNew = tag.isNew;

        const baseClasses = 'inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-200 active:scale-95';

        const stateClasses = (() => {
          if (isSelected) {
            return isNew
              ? 'border border-amber-300 bg-amber-100 text-amber-700 shadow-sm'
              : 'border border-emerald-300 bg-emerald-100 text-emerald-700 shadow-sm';
          }

          return isNew
            ? 'border border-blue-300 bg-blue-100 text-blue-700 hover:bg-blue-200'
            : 'border border-purple-300 bg-purple-100 text-purple-700 hover:bg-purple-200';
        })();

        return (
          <button
            key={tag.name}
            onClick={() => onToggle(tag.name)}
            className={`${baseClasses} ${stateClasses}`}
          >
            <span className="truncate max-w-[110px]">{tag.name}</span>
            {isNew && (
              <span className={`ml-1 text-[10px] uppercase tracking-wide ${isSelected ? 'text-amber-600' : 'text-blue-600'}`}>
                new
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
