import { generateUUID } from './crypto'
/**
 * Create or link tags to a bookmark
 * Creates new tags if they don't exist, links existing tags
 * 
 * @param db - D1 Database instance
 * @param bookmarkId - Bookmark ID
 * @param tagNames - Array of tag names
 * @param userId - User ID
 */
export async function createOrLinkTags(
  db: D1Database,
  bookmarkId: string,
  tagNames: string[],
  userId: string
): Promise<void> {
  if (!tagNames || tagNames.length === 0) return
  const now = new Date().toISOString()
  // Optimization: Use batch operations to avoid N+1 queries
  const trimmedNames = tagNames.map(name => name.trim()).filter(name => name.length > 0)
  if (trimmedNames.length === 0) return
  // Query existing tags using IN clause
  const placeholders = trimmedNames.map(() => '?').join(',')
  const { results: existingTags } = await db
    .prepare(`SELECT id, name FROM tags WHERE user_id = ? AND LOWER(name) IN (${placeholders}) AND deleted_at IS NULL`)
    .bind(userId, ...trimmedNames.map(name => name.toLowerCase()))
    .all<{ id: string; name: string }>()
  // Build tag name to ID map (case-insensitive)
  const tagMap = new Map<string, string>()
  for (const tag of existingTags || []) {
    tagMap.set(tag.name.toLowerCase(), tag.id)
  }
  // Find tags that need to be created
  const tagsToCreate = trimmedNames.filter(name => !tagMap.has(name.toLowerCase()))
  // Create new tags
  if (tagsToCreate.length > 0) {
    // Use batch insert (D1 supports batch operations)
    const insertStatements = tagsToCreate.map(name => {
      const tagId = generateUUID()
      tagMap.set(name.toLowerCase(), tagId)
      return db
        .prepare('INSERT INTO tags (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .bind(tagId, userId, name, now, now)
    })
    await db.batch(insertStatements)
  }
  // Link tags to bookmark
  const linkStatements = trimmedNames.map(name => {
    const tagId = tagMap.get(name.toLowerCase())
    if (!tagId) {
      console.error(`[createOrLinkTags] Tag ID not found for: ${name}`)
      return null
    }
    return db
      .prepare('INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id, user_id, created_at) VALUES (?, ?, ?, ?)')
      .bind(bookmarkId, tagId, userId, now)
  }).filter(stmt => stmt !== null) as D1PreparedStatement[]
  if (linkStatements.length > 0) {
    await db.batch(linkStatements)
  }
}
