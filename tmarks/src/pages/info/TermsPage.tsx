import { FileText, AlertCircle, Scale, Ban } from 'lucide-react'

export function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
      {/* 标题 */}
      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground">服务条款</h1>
        <p className="text-sm text-muted-foreground">
          最后更新：2024年11月19日
        </p>
      </div>

      {/* 简介 */}
      <div className="card p-6 space-y-3">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold text-foreground">欢迎使用 TMarks</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          感谢您使用 TMarks 书签管理服务。使用我们的服务即表示您同意遵守以下服务条款。
          请仔细阅读这些条款，如果您不同意，请不要使用我们的服务。
        </p>
      </div>

      {/* 服务说明 */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">1. 服务说明</h2>
        <div className="card p-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            TMarks 提供在线书签管理服务，包括但不限于：
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>书签的创建、编辑、删除和组织</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>标签系统和标签页组管理</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>书签的导入、导出和分享</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>浏览器扩展和 API 访问</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 用户责任 */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">2. 用户责任</h2>
        <div className="card p-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            使用 TMarks 服务时，您同意：
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>提供准确、完整的注册信息</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>保护您的账户安全，不与他人分享登录凭证</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>对您账户下的所有活动负责</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>遵守所有适用的法律法规</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>不滥用服务或干扰其他用户的使用</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 禁止行为 */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Ban className="w-5 h-5 text-error" />
          <h2 className="text-xl font-bold text-foreground">3. 禁止行为</h2>
        </div>
        <div className="card p-6 border-error/20">
          <p className="text-sm text-muted-foreground mb-3">
            使用 TMarks 时，您不得：
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-error mt-0.5">✗</span>
              <span>上传或分享非法、有害、威胁性、辱骂性或侵权的内容</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-error mt-0.5">✗</span>
              <span>尝试未经授权访问其他用户的账户或数据</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-error mt-0.5">✗</span>
              <span>干扰或破坏服务的正常运行</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-error mt-0.5">✗</span>
              <span>使用自动化工具过度访问服务</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-error mt-0.5">✗</span>
              <span>复制、修改或分发服务的任何部分</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 知识产权 */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Scale className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">4. 知识产权</h2>
        </div>
        <div className="card p-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            TMarks 服务及其原创内容、功能和特性归 TMarks 及其许可方所有，受国际版权、商标和其他知识产权法律保护。
          </p>
          <p className="text-sm text-muted-foreground">
            您保留对您创建和上传的内容的所有权利。通过使用服务，您授予 TMarks 使用、存储和展示您的内容以提供服务的许可。
          </p>
        </div>
      </div>

      {/* 服务变更和终止 */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">5. 服务变更和终止</h2>
        <div className="card p-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            我们保留随时修改、暂停或终止服务（或其任何部分）的权利，无论是否通知。
            我们不对您或任何第三方因服务的修改、暂停或终止承担责任。
          </p>
          <p className="text-sm text-muted-foreground">
            您可以随时停止使用服务并删除您的账户。我们也可能因违反这些条款而暂停或终止您的账户。
          </p>
        </div>
      </div>

      {/* 免责声明 */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-warning" />
          <h2 className="text-xl font-bold text-foreground">6. 免责声明</h2>
        </div>
        <div className="card p-6 border-warning/20">
          <p className="text-sm text-muted-foreground mb-3">
            TMarks 服务按"现状"和"可用"基础提供，不提供任何明示或暗示的保证，包括但不限于：
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-warning mt-0.5">!</span>
              <span>服务将不间断、及时、安全或无错误</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-warning mt-0.5">!</span>
              <span>通过服务获得的结果将准确或可靠</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-warning mt-0.5">!</span>
              <span>服务中的任何错误都将被纠正</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 责任限制 */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">7. 责任限制</h2>
        <div className="card p-6">
          <p className="text-sm text-muted-foreground">
            在法律允许的最大范围内，TMarks 不对任何间接、偶然、特殊、后果性或惩罚性损害，
            或任何利润、收入、数据或使用损失承担责任，无论是基于合同、侵权（包括过失）、
            严格责任还是其他理论，即使我们已被告知此类损害的可能性。
          </p>
        </div>
      </div>

      {/* 条款变更 */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">8. 条款变更</h2>
        <div className="card p-6">
          <p className="text-sm text-muted-foreground">
            我们保留随时修改这些条款的权利。重大变更时，我们会通过电子邮件或服务内通知告知您。
            在变更生效后继续使用服务即表示您接受修改后的条款。
          </p>
        </div>
      </div>

      {/* 适用法律 */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">9. 适用法律</h2>
        <div className="card p-6">
          <p className="text-sm text-muted-foreground">
            这些条款受中华人民共和国法律管辖并按其解释，不考虑其法律冲突规定。
          </p>
        </div>
      </div>

      {/* 联系我们 */}
      <div className="card p-6 space-y-3">
        <h2 className="text-xl font-bold text-foreground">联系我们</h2>
        <p className="text-sm text-muted-foreground">
          如果您对这些服务条款有任何疑问，请通过以下方式联系我们：
        </p>
        <div className="text-sm text-muted-foreground">
          <p>电子邮件：<a href="mailto:legal@tmarks.com" className="text-primary hover:underline">legal@tmarks.com</a></p>
        </div>
      </div>
    </div>
  )
}
