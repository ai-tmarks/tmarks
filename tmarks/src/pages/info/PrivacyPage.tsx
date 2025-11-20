import { Shield, Lock, Eye, Database, UserCheck } from 'lucide-react'

export function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
      {/* 标题 */}
      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground">隐私政策</h1>
        <p className="text-sm text-muted-foreground">
          最后更新：2024年11月19日
        </p>
      </div>

      {/* 简介 */}
      <div className="card p-6 space-y-3">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold text-foreground">我们的承诺</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          TMarks 致力于保护用户的隐私和数据安全。本隐私政策说明了我们如何收集、使用、存储和保护您的个人信息。
        </p>
      </div>

      {/* 信息收集 */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">我们收集的信息</h2>
        </div>
        <div className="card p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">账户信息</h3>
            <p className="text-sm text-muted-foreground">
              当您注册 TMarks 账户时，我们会收集您的用户名、电子邮件地址和加密后的密码。
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">书签数据</h3>
            <p className="text-sm text-muted-foreground">
              您创建的书签、标签、标签页组等内容数据，这些数据仅用于提供服务功能。
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">使用数据</h3>
            <p className="text-sm text-muted-foreground">
              我们可能收集您使用服务的相关信息，如访问时间、IP 地址、浏览器类型等，用于改进服务质量。
            </p>
          </div>
        </div>
      </div>

      {/* 信息使用 */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Eye className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">信息使用方式</h2>
        </div>
        <div className="card p-6">
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>提供、维护和改进 TMarks 服务</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>处理您的请求和交易</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>发送服务相关的通知和更新</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>检测、预防和解决技术问题</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>遵守法律义务</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 数据安全 */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Lock className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">数据安全</h2>
        </div>
        <div className="card p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            我们采取多种安全措施来保护您的个人信息：
          </p>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-success mt-0.5">✓</span>
              <span>所有数据传输使用 HTTPS 加密</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-success mt-0.5">✓</span>
              <span>密码使用行业标准的哈希算法加密存储</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-success mt-0.5">✓</span>
              <span>使用 JWT 令牌进行身份认证</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-success mt-0.5">✓</span>
              <span>数据存储在 Cloudflare 的安全基础设施上</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-success mt-0.5">✓</span>
              <span>定期进行安全审计和更新</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 用户权利 */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <UserCheck className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">您的权利</h2>
        </div>
        <div className="card p-6">
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span><strong>访问权</strong>：您可以随时访问和查看您的个人信息</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span><strong>修改权</strong>：您可以更新或修改您的个人信息</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span><strong>删除权</strong>：您可以请求删除您的账户和所有相关数据</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span><strong>导出权</strong>：您可以导出您的书签数据</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Cookie 使用 */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Cookie 和类似技术</h2>
        <div className="card p-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            我们使用 Cookie 和类似技术来：
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>保持您的登录状态</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>记住您的偏好设置</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>分析服务使用情况</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 第三方服务 */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">第三方服务</h2>
        <div className="card p-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            TMarks 使用以下第三方服务：
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span><strong>Cloudflare</strong>：提供托管、数据库和 CDN 服务</span>
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">
            这些服务提供商有自己的隐私政策，我们建议您查阅它们的政策。
          </p>
        </div>
      </div>

      {/* 政策更新 */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">政策更新</h2>
        <div className="card p-6">
          <p className="text-sm text-muted-foreground">
            我们可能会不时更新本隐私政策。重大变更时，我们会通过电子邮件或服务内通知告知您。
            继续使用服务即表示您接受更新后的政策。
          </p>
        </div>
      </div>

      {/* 联系我们 */}
      <div className="card p-6 space-y-3">
        <h2 className="text-xl font-bold text-foreground">联系我们</h2>
        <p className="text-sm text-muted-foreground">
          如果您对本隐私政策有任何疑问或建议，请通过以下方式联系我们：
        </p>
        <div className="text-sm text-muted-foreground">
          <p>电子邮件：<a href="mailto:privacy@tmarks.com" className="text-primary hover:underline">privacy@tmarks.com</a></p>
        </div>
      </div>
    </div>
  )
}
