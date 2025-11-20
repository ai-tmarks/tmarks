import { Heart, Zap, Shield, Globe, Github, Star } from 'lucide-react'

export function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
      {/* 标题 */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground">关于 TMarks</h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
          现代化的智能书签管理系统，让你的书签井井有条
        </p>
      </div>

      {/* 版本信息 */}
      <div className="card p-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
          <Star className="w-4 h-4" />
          <span className="text-sm font-medium">Version 2.0.0</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Migration Automation Release
        </p>
      </div>

      {/* 核心特性 */}
      <div className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">核心特性</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="card p-5 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">快速高效</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              基于 Cloudflare 全球网络，提供极速访问体验
            </p>
          </div>

          <div className="card p-5 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-success" />
              </div>
              <h3 className="font-semibold text-foreground">安全可靠</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              数据加密存储，支持 JWT 认证，保护你的隐私
            </p>
          </div>

          <div className="card p-5 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-warning" />
              </div>
              <h3 className="font-semibold text-foreground">多端同步</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              支持浏览器扩展，多设备无缝同步你的书签
            </p>
          </div>

          <div className="card p-5 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-error/10 flex items-center justify-center">
                <Heart className="w-5 h-5 text-error" />
              </div>
              <h3 className="font-semibold text-foreground">开源免费</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              MIT 许可证，完全开源，欢迎贡献代码
            </p>
          </div>
        </div>
      </div>

      {/* 技术栈 */}
      <div className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">技术栈</h2>
        <div className="card p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">前端</h3>
            <div className="flex flex-wrap gap-2">
              {['React 18', 'TypeScript', 'Vite', 'TailwindCSS', 'React Router', 'Zustand', 'React Query'].map((tech) => (
                <span key={tech} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {tech}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">后端</h3>
            <div className="flex flex-wrap gap-2">
              {['Cloudflare Pages', 'Cloudflare D1', 'Cloudflare KV', 'JWT'].map((tech) => (
                <span key={tech} className="px-3 py-1 rounded-full bg-success/10 text-success text-xs font-medium">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 开源信息 */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Github className="w-6 h-6 text-foreground" />
          <h2 className="text-xl font-bold text-foreground">开源项目</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          TMarks 是一个开源项目，采用 MIT 许可证。我们欢迎任何形式的贡献，包括但不限于：
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>提交 Bug 报告和功能建议</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>改进文档和翻译</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>贡献代码和修复问题</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>分享使用经验和最佳实践</span>
          </li>
        </ul>
        <a
          href="https://github.com/your-username/tmarks"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary inline-flex items-center gap-2"
        >
          <Github className="w-4 h-4" />
          访问 GitHub 仓库
        </a>
      </div>

      {/* 致谢 */}
      <div className="card p-6 space-y-3">
        <h2 className="text-xl font-bold text-foreground">致谢</h2>
        <p className="text-sm text-muted-foreground">
          感谢所有为 TMarks 做出贡献的开发者和用户，以及以下优秀的开源项目和服务：
        </p>
        <div className="grid sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
          <div>• Cloudflare Pages & D1</div>
          <div>• React & TypeScript</div>
          <div>• Vite & TailwindCSS</div>
          <div>• Lucide Icons</div>
        </div>
      </div>
    </div>
  )
}
