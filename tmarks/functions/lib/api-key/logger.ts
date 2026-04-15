/**
 * API Key Logger - Records API key usage and provides statistics
 * Automatically cleans up old logs, keeping only the latest 100 entries per key
 */

interface LogEntry {
  api_key_id: string
  user_id: string
  endpoint: string
  method: string
  status: number
  ip: string | null
}

/**
 * Log API Key usage
 * @param entry Log entry data
 * @param db D1 Database
 */
export async function logApiKeyUsage(entry: LogEntry, db: D1Database): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO api_key_logs (api_key_id, user_id, endpoint, method, status, ip)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        entry.api_key_id,
        entry.user_id,
        entry.endpoint,
        entry.method,
        entry.status,
        entry.ip
      )
      .run()

    // Async cleanup (keep only latest 100 logs per key)
    await cleanupOldLogs(entry.api_key_id, db)
  } catch (error) {
    // Don't throw error, just log it
    console.error('Failed to log API key usage:', error)
  }
}

/**
 * Cleanup old logs, keep only the latest 100 entries
 * @param apiKeyId API Key ID
 * @param db D1 Database
 */
async function cleanupOldLogs(apiKeyId: string, db: D1Database): Promise<void> {
  try {
    // Keep only the latest 100 logs
    await db
      .prepare(
        `DELETE FROM api_key_logs
         WHERE api_key_id = ?
         AND id NOT IN (
           SELECT id FROM api_key_logs
           WHERE api_key_id = ?
           ORDER BY created_at DESC
           LIMIT 100
         )`
      )
      .bind(apiKeyId, apiKeyId)
      .run()
  } catch (error) {
    console.error('Failed to cleanup old logs:', error)
  }
}

/**
 * Get API Key usage logs
 * @param apiKeyId API Key ID
 * @param limit Maximum number of logs to return (default: 10)
 * @param db D1 Database
 * @returns Array of log entries
 */
export async function getApiKeyLogs(
  apiKeyId: string,
  db: D1Database,
  limit: number = 10
): Promise<LogEntry[]> {
  const result = await db
    .prepare(
      `SELECT api_key_id, user_id, endpoint, method, status, ip, created_at
       FROM api_key_logs
       WHERE api_key_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .bind(apiKeyId, limit)
    .all()

  return result.results as unknown as LogEntry[]
}

/**
 * Get API Key usage statistics
 * @param apiKeyId API Key ID
 * @param db D1 Database
 * @returns Statistics object with total requests, last used time and IP
 */
export async function getApiKeyStats(
  apiKeyId: string,
  db: D1Database
): Promise<{
  total_requests: number
  last_used_at: string | null
  last_used_ip: string | null
}> {
  const result = await db
    .prepare(
      `SELECT
         COUNT(*) as total_requests,
         MAX(created_at) as last_used_at,
         (SELECT ip FROM api_key_logs
          WHERE api_key_id = ?
          ORDER BY created_at DESC
          LIMIT 1) as last_used_ip
       FROM api_key_logs
       WHERE api_key_id = ?`
    )
    .bind(apiKeyId, apiKeyId)
    .first()

  return result as unknown as {
    total_requests: number
    last_used_at: string | null
    last_used_ip: string | null
  }
}
