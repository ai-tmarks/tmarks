/**
 * API Keys 管理页面
 */

import { useState } from 'react'
import { useApiKeys, useRevokeApiKey, useDeleteApiKey } from '@/hooks/useApiKeys'
import { CreateApiKeyModal } from '@/components/api-keys/CreateApiKeyModal'
import { ApiKeyCard } from '@/components/api-keys/ApiKeyCard'
import { ApiKeyDetailModal } from '@/components/api-keys/ApiKeyDetailModal'
import type { ApiKey } from '@/services/api-keys'

export function ApiKeysPage() {
  const { data, isLoading } = useApiKeys()
  const revokeApiKey = useRevokeApiKey()
  const deleteApiKey = useDeleteApiKey()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null)

  const handleRevoke = async (id: string) => {
    if (!confirm('确定要撤销此 API Key 吗？撤销后无法恢复。')) {
      return
    }

    try {
      await revokeApiKey.mutateAsync(id)
      alert('API Key 已撤销')
    } catch {
      alert('撤销失败，请重试')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要彻底删除此 API Key 吗？该操作不可恢复，并会清除所有使用记录。')) {
      return
    }

    try {
      await deleteApiKey.mutateAsync(id)
      alert('API Key 已永久删除')
    } catch {
      alert('删除失败，请重试')
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="text-center text-muted-foreground">加载中...</div>
      </div>
    )
  }

  const keys = data?.keys || []
  const quota = data?.quota || { used: 0, limit: 3 }

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      {/* 标题卡片 */}
      <div className="card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">API Keys 管理</h1>
            <p className="text-sm text-muted-foreground mt-1">
              管理您的 API 密钥，用于第三方应用访问
            </p>
          </div>
          <button
            className="btn btn-primary w-full sm:w-auto touch-manipulation"
            onClick={() => setShowCreateModal(true)}
            disabled={quota.used >= quota.limit}
          >
            + 创建新的 API Key
          </button>
        </div>
      </div>

      {/* 内容卡片 */}
      <div className="card p-4 sm:p-6">
        {/* 说明文字 */}
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-muted/30 border border-border rounded-lg">
          <p className="text-xs sm:text-sm text-muted-foreground mb-2 leading-relaxed">
            API Keys 用于第三方应用（如浏览器插件）安全访问您的 TMarks 数据。
            您可以随时撤销不需要的 Key。
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">
            当前使用: <strong>{quota.used} / {quota.limit >= 999 ? '无限制' : quota.limit}</strong>
          </p>
        </div>

        {/* API Keys 列表 */}
        {keys.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <p className="text-sm sm:text-base text-muted-foreground mb-4">还没有创建任何 API Key</p>
            <button
              className="btn btn-primary w-full sm:w-auto touch-manipulation"
              onClick={() => setShowCreateModal(true)}
            >
              创建第一个 API Key
            </button>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {keys.map((key) => (
              <ApiKeyCard
                key={key.id}
                apiKey={key}
                onViewDetails={() => setSelectedKey(key)}
                onRevoke={() => handleRevoke(key.id)}
                onDelete={() => handleDelete(key.id)}
              />
            ))}
          </div>
        )}

        {/* 提示信息 */}
        <div className="mt-6 p-4 bg-info/10 border border-info/30 rounded-lg">
          <h4 className="font-medium text-info mb-2">💡 提示：</h4>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>每个账户最多创建 {quota.limit >= 999 ? '无限制' : `${quota.limit} 个`} API Key</li>
            <li>API Key 创建后仅显示一次，请妥善保存</li>
            <li>如果 Key 泄露，请立即撤销</li>
          </ul>
        </div>
      </div>

      {/* 创建 API Key 模态框 */}
      {showCreateModal && (
        <CreateApiKeyModal onClose={() => setShowCreateModal(false)} />
      )}

      {/* API Key 详情模态框 */}
      {selectedKey && (
        <ApiKeyDetailModal
          apiKey={selectedKey}
          onClose={() => setSelectedKey(null)}
        />
      )}
    </div>
  )
}
