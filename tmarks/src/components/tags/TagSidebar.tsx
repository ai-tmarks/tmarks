import { useMemo, useState, useEffect, useRef } from 'react'
import { useTags, useCreateTag } from '@/hooks/useTags'
import type { Bookmark, Tag } from '@/lib/types'
import { TagManageModal } from './TagManageModal'
import { logger } from '@/lib/logger'

interface TagSidebarProps {
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
  isLoadingBookmarks?: boolean
  bookmarks: Bookmark[]
  tagLayout: 'grid' | 'masonry'
  onTagLayoutChange: (layout: 'grid' | 'masonry') => void
  readOnly?: boolean
  availableTags?: Tag[]
  tagSortBy?: 'usage' | 'name' | 'clicks'
  onTagSortChange?: (sortBy: 'usage' | 'name' | 'clicks') => void
}

export function TagSidebar({
  selectedTags,
  onTagsChange,
  bookmarks,
  tagLayout,
  onTagLayoutChange,
  readOnly = false,
  availableTags,
  tagSortBy: externalTagSortBy,
  onTagSortChange,
}: TagSidebarProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [internalSortBy, setInternalSortBy] = useState<'usage' | 'name' | 'clicks'>('usage')
  const searchCleanupTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 使用外部传入的 sortBy 或内部状态
  const sortBy = externalTagSortBy !== undefined ? externalTagSortBy : internalSortBy
  const setSortBy = onTagSortChange || setInternalSortBy

  const { data, isLoading } = useTags({ sort: sortBy }, { enabled: !availableTags })
  const createTag = useCreateTag()

  const tags = useMemo(() => availableTags || data?.tags || [], [availableTags, data?.tags])
  const isTagLoading = availableTags ? false : isLoading

  // 搜索防抖：延迟200ms更新实际搜索关键词
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 200)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // 标签搜索自动清空
  useEffect(() => {
    // 清除之前的定时器
    if (searchCleanupTimerRef.current) {
      clearTimeout(searchCleanupTimerRef.current)
      searchCleanupTimerRef.current = null
    }

    // 如果有搜索关键词，设置15秒后自动清空
    if (searchQuery.trim()) {
      searchCleanupTimerRef.current = setTimeout(() => {
        setSearchQuery('')
        setDebouncedSearchQuery('')
      }, 15000) // 15秒
    }

    // 清理函数
    return () => {
      if (searchCleanupTimerRef.current) {
        clearTimeout(searchCleanupTimerRef.current)
        searchCleanupTimerRef.current = null
      }
    }
  }, [searchQuery])

  const coOccurrenceMap = useMemo(() => {
    const map = new Map<string, Set<string>>()

    for (const bookmark of bookmarks) {
      if (!bookmark.tags || bookmark.tags.length < 2) continue

      const ids = bookmark.tags.reduce<string[]>((acc, tag) => {
        if (tag.id) {
          acc.push(tag.id)
        }
        return acc
      }, [])

      if (ids.length < 2) continue

      for (let i = 0; i < ids.length; i++) {
        const sourceId = ids[i]!
        if (!map.has(sourceId)) {
          map.set(sourceId, new Set())
        }

        for (let j = 0; j < ids.length; j++) {
          if (i === j) continue
          const targetId = ids[j]!
          map.get(sourceId)!.add(targetId)
        }
      }
    }

    return map
  }, [bookmarks])

  const relatedTagIds = useMemo(() => {
    if (selectedTags.length === 0) {
      return new Set<string>()
    }

    // 交集逻辑：只有与所有选中标签都共现的标签才算相关
    if (selectedTags.length === 1) {
      // 只选中一个标签时，返回其所有邻居
      const neighbors = coOccurrenceMap.get(selectedTags[0]!)
      if (!neighbors) return new Set<string>()
      return new Set([...neighbors].filter(id => !selectedTags.includes(id)))
    }

    // 多个标签时，计算交集
    const firstTagNeighbors = coOccurrenceMap.get(selectedTags[0]!)
    if (!firstTagNeighbors) return new Set<string>()

    const related = new Set<string>()

    // 遍历第一个标签的邻居
    firstTagNeighbors.forEach((neighborId) => {
      if (selectedTags.includes(neighborId)) return

      // 检查这个邻居是否与所有选中的标签都共现
      const isRelatedToAll = selectedTags.every((tagId) => {
        const neighbors = coOccurrenceMap.get(tagId)
        return neighbors && neighbors.has(neighborId)
      })

      if (isRelatedToAll) {
        related.add(neighborId)
      }
    })

    return related
  }, [selectedTags, coOccurrenceMap])

  // 使用 useMemo 和防抖搜索优化筛选性能
  const filteredTags = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return tags

    const query = debouncedSearchQuery.toLowerCase()
    return tags.filter((tag) => tag.name.toLowerCase().includes(query))
  }, [tags, debouncedSearchQuery])

  const orderedTags = useMemo(() => {
    // 将标签分为三组：已选中、相关、其他
    const selected: Tag[] = []
    const related: Tag[] = []
    const others: Tag[] = []

    for (const tag of filteredTags) {
      if (selectedTags.includes(tag.id)) {
        selected.push(tag)
      } else if (relatedTagIds.has(tag.id)) {
        related.push(tag)
      } else {
        others.push(tag)
      }
    }

    // 按优先级顺序合并，每组内保持原始排序
    return [...selected, ...related, ...others]
  }, [filteredTags, selectedTags, relatedTagIds])

  const handleToggleTag = (tagId: string) => {
    let newSelectedTags: string[]
    if (selectedTags.includes(tagId)) {
      newSelectedTags = selectedTags.filter((id) => id !== tagId)
    } else {
      newSelectedTags = [...selectedTags, tagId]
    }
    onTagsChange(newSelectedTags)
  }

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (readOnly) return
    if (!newTagName.trim()) return

    try {
      await createTag.mutateAsync({ name: newTagName.trim() })
      setNewTagName('')
      setShowCreateForm(false)
    } catch (error) {
      logger.error('Failed to create tag:', error)
    }
  }


  return (
    <>
      <div className="card flex flex-col shadow-lg">
        <div className="flex items-center justify-between mb-4 sm:mb-6 flex-shrink-0">
          <h3 className="text-lg sm:text-xl font-bold text-primary">
            标签
          </h3>
          {!readOnly && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowManageModal(true)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all shadow-float bg-muted hover:bg-secondary text-foreground touch-manipulation"
                title="管理标签"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-lg sm:text-xl transition-all shadow-float touch-manipulation ${showCreateForm
                  ? 'bg-error text-error-content rotate-45'
                  : 'bg-gradient-to-br from-primary to-secondary text-primary-content'
                  }`}
                title={showCreateForm ? '取消' : '新建标签'}
              >
                +
              </button>
            </div>
          )}
        </div>

        {/* 创建标签表单 */}
        {!readOnly && showCreateForm && (
          <form onSubmit={handleCreateTag} className="mb-4 sm:mb-5 animate-fade-in flex-shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                className="input flex-1 h-10 sm:h-auto text-sm sm:text-base"
                placeholder="输入标签名称..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                autoFocus
              />
              <button type="submit" className="btn btn-sm w-10 h-10 sm:w-auto sm:h-auto touch-manipulation" disabled={createTag.isPending}>
                {createTag.isPending ? '...' : '✓'}
              </button>
            </div>
          </form>
        )}

        {/* 搜索框和排序 */}
        <div className="mb-4 sm:mb-5 space-y-3 flex-shrink-0">
          <div className="relative">
            <svg className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              className="input w-full pl-10 sm:pl-11 h-10 sm:h-auto text-sm sm:text-base"
              placeholder="搜索标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* 5个图标均匀排列 */}
          <div className="inline-flex items-center justify-between w-full rounded-xl bg-muted p-1">
            {/* 使用频率排序 */}
            <button
              onClick={() => setSortBy('usage')}
              className={`flex-1 py-2 px-2 rounded-lg transition-all flex items-center justify-center ${sortBy === 'usage'
                ? 'bg-primary text-primary-content shadow-float'
                : 'text-muted-foreground/70 hover:text-foreground'
                }`}
              title="使用频率排序"
              aria-label="使用频率排序"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </button>

            {/* 字母序排序 */}
            <button
              onClick={() => setSortBy('name')}
              className={`flex-1 py-2 px-2 rounded-lg transition-all flex items-center justify-center ${sortBy === 'name'
                ? 'bg-primary text-primary-content shadow-float'
                : 'text-muted-foreground/70 hover:text-foreground'
                }`}
              title="字母序排序"
              aria-label="字母序排序"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
            </button>

            {/* 标准网格 */}
            <button
              onClick={() => onTagLayoutChange('grid')}
              className={`flex-1 py-2 px-2 rounded-lg transition-all flex items-center justify-center ${tagLayout === 'grid'
                ? 'bg-secondary text-secondary-content shadow-float'
                : 'text-muted-foreground/70 hover:text-foreground'
                }`}
              title="标准网格"
              aria-label="标准网格"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v6H4zM14 15h6v6h-6z" />
              </svg>
            </button>

            {/* 标题横向瀑布 */}
            <button
              onClick={() => onTagLayoutChange('masonry')}
              className={`flex-1 py-2 px-2 rounded-lg transition-all flex items-center justify-center ${tagLayout === 'masonry'
                ? 'bg-secondary text-secondary-content shadow-float'
                : 'text-muted-foreground/70 hover:text-foreground'
                }`}
              title="标题横向瀑布"
              aria-label="标题横向瀑布"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h5v16H4zM10 10h5v10h-5zM16 6h5v14h-5z" />
              </svg>
            </button>

            {/* 清空选中标签 */}
            <button
              onClick={() => onTagsChange([])}
              disabled={selectedTags.length === 0}
              className={`flex-1 py-2 px-2 rounded-lg transition-all flex items-center justify-center ${selectedTags.length === 0
                ? 'text-muted-foreground/50 cursor-not-allowed'
                : 'text-muted-foreground/80 hover:text-foreground hover:bg-base-200'
                }`}
              title="清空选中标签"
              aria-label="清空选中标签"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 标签列表 */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-1 min-h-0">
          {isTagLoading && (
            <div className="text-center py-8 text-muted-foreground/60 text-sm">
              <svg className="animate-spin h-6 w-6 mx-auto mb-2" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              加载中...
            </div>
          )}

          {!isTagLoading && filteredTags.length === 0 && (
            <div className="text-center py-12 text-muted-foreground/60">
              <svg className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <p className="text-sm">
                {searchQuery
                  ? '没有找到匹配的标签'
                  : readOnly
                    ? '发布者尚未公开任何标签'
                    : '暂无标签，点击 + 创建'}
              </p>
            </div>
          )}

          {!isTagLoading && orderedTags.length > 0 && (
            <div
              className={`${tagLayout === 'masonry'
                ? 'flex flex-wrap items-start gap-2 justify-around'
                : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 justify-center'
                }`}
            >
              {orderedTags.map((tag) => (
                <TagItem
                  key={tag.id}
                  tag={tag}
                  isSelected={selectedTags.includes(tag.id)}
                  isRelated={relatedTagIds.has(tag.id)}
                  hasSelection={selectedTags.length > 0}
                  layout={tagLayout}
                  onToggle={() => handleToggleTag(tag.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 标签管理模态框 */}
      {!readOnly && showManageModal && (
        <TagManageModal
          tags={tags}
          onClose={() => setShowManageModal(false)}
        />
      )}
    </>
  )
}

interface TagItemProps {
  tag: Tag
  isSelected: boolean
  isRelated: boolean
  hasSelection: boolean
  layout: 'grid' | 'masonry'
  onToggle: () => void
}

function TagItem({ tag, isSelected, isRelated, hasSelection, layout, onToggle }: TagItemProps) {
  const stateClasses = isSelected
    ? 'border border-transparent bg-primary text-primary-content shadow-inner ring-1 ring-primary/40'
    : isRelated
      ? 'border border-transparent bg-accent/5 text-accent'
      : hasSelection
        ? 'border border-transparent bg-base-200/80 text-muted-foreground opacity-70 ring-1 ring-transparent'
        : 'border border-border bg-card hover:border-primary/50 ring-1 ring-transparent'

  const indicatorClasses = isSelected
    ? 'bg-primary-content/20 border-2 border-primary-content'
    : isRelated
      ? 'bg-accent/20 border-2 border-accent'
      : 'bg-transparent border-2 border-border'

  const countClasses = isSelected
    ? 'bg-primary-content/25 text-primary-content'
    : isRelated
      ? 'bg-accent/20 text-accent'
      : hasSelection
        ? 'bg-base-300 text-muted-foreground'
        : 'bg-muted text-muted-foreground'

  const layoutClasses = layout === 'masonry'
    ? 'inline-flex items-center gap-2 px-3 py-2 rounded-lg'
    : 'flex w-full items-center justify-between px-2.5 py-2'

  const showMarquee = isSelected || isRelated
  const marqueeStroke = isSelected ? 'var(--accent)' : 'var(--primary)'
  const marqueeOpacity = isSelected ? 0.9 : 0.65
  const marqueeDuration = isSelected ? '1s' : '3s'

  return (
    <div
      className={`relative overflow-hidden rounded-lg cursor-pointer transition-all ${stateClasses}`}
      onClick={onToggle}
    >
      {showMarquee && (
        <div className="pointer-events-none absolute inset-0 z-0 rounded-lg overflow-hidden">
          {/* 上边框 - 从左到右 */}
          <div
            className="absolute top-0 left-0 right-0 h-0.5"
            style={{
              background: `repeating-linear-gradient(90deg,
                ${marqueeStroke} 0px,
                ${marqueeStroke} 8px,
                transparent 8px,
                transparent 12px)`,
              opacity: marqueeOpacity,
              animation: `tag-marquee-move-right ${marqueeDuration} linear infinite`
            }}
          />
          {/* 右边框 - 从上到下 */}
          <div
            className="absolute top-0 right-0 bottom-0 w-0.5"
            style={{
              background: `repeating-linear-gradient(0deg,
                ${marqueeStroke} 0px,
                ${marqueeStroke} 8px,
                transparent 8px,
                transparent 12px)`,
              opacity: marqueeOpacity,
              animation: `tag-marquee-move-down ${marqueeDuration} linear infinite`
            }}
          />
          {/* 下边框 - 从右到左 */}
          <div
            className="absolute bottom-0 left-0 right-0 h-0.5"
            style={{
              background: `repeating-linear-gradient(-90deg,
                ${marqueeStroke} 0px,
                ${marqueeStroke} 8px,
                transparent 8px,
                transparent 12px)`,
              opacity: marqueeOpacity,
              animation: `tag-marquee-move-left ${marqueeDuration} linear infinite`
            }}
          />
          {/* 左边框 - 从下到上 */}
          <div
            className="absolute top-0 left-0 bottom-0 w-0.5"
            style={{
              background: `repeating-linear-gradient(180deg,
                ${marqueeStroke} 0px,
                ${marqueeStroke} 8px,
                transparent 8px,
                transparent 12px)`,
              opacity: marqueeOpacity,
              animation: `tag-marquee-move-up ${marqueeDuration} linear infinite`
            }}
          />
        </div>
      )}
      <div className={`relative z-10 ${layoutClasses}`}>
        <div className={`flex items-center gap-2 ${layout === 'masonry' ? '' : 'flex-1 min-w-0'}`}>
          <div
            className={`w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center ${indicatorClasses}`}
          >
            {isSelected && (
              <svg className="w-2 h-2 text-primary-content" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>

          <span
            className={`text-xs ${layout === 'masonry' ? 'whitespace-nowrap' : 'truncate flex-1'} ${isSelected ? 'font-semibold' : 'font-medium'
              }`}
          >
            {tag.name}
          </span>

          {tag.bookmark_count !== undefined && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${countClasses}`}>
              {tag.bookmark_count}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}