import { useState, useEffect, useRef } from 'react'
import { X, Plus } from 'lucide-react'
import { useIsMobile } from '@/hooks/useMediaQuery'

interface TagsInputProps {
  tags: string[]
  onTagsChange: (tags: string[]) => void
  onClose: () => void
}

export function TagsInput({ tags, onTagsChange, onClose }: TagsInputProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  const handleAddTag = () => {
    const trimmed = inputValue.trim()
    if (trimmed && !tags.includes(trimmed)) {
      onTagsChange([...tags, trimmed])
      setInputValue('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div
      ref={inputRef}
      className="absolute top-full right-0 mt-2 rounded-lg shadow-xl border p-4 z-50 w-80"
      style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
    >
      <div className="mb-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入标签名称..."
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
            autoFocus
          />
          <button
            onClick={handleAddTag}
            disabled={!inputValue.trim()}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="hover:bg-primary/20 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={onClose}
          className="px-4 py-2 text-foreground hover:bg-muted rounded-lg"
        >
          取消
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          完成
        </button>
      </div>
    </div>
  )
}

export function TagsList({ tags }: { tags: string[] | null }) {
  const isMobile = useIsMobile()

  if (!tags || tags.length === 0) return null

  return (
    <div
      className={`flex gap-1.5 ${
        isMobile
          ? 'overflow-x-auto scrollbar-hide -mx-1 px-1'
          : 'flex-wrap'
      }`}
      style={isMobile ? {
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch'
      } : undefined}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className={`inline-flex items-center px-2 py-0.5 bg-primary/10 text-primary rounded text-xs ${
            isMobile ? 'flex-shrink-0' : ''
          }`}
        >
          {tag}
        </span>
      ))}
    </div>
  )
}

