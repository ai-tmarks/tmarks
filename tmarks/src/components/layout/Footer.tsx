import { Heart, Github, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* 关于 */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">关于 TMarks</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              现代化的智能书签管理系统，让你的书签井井有条。
            </p>
          </div>

          {/* 快速链接 */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">快速链接</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  关于我们
                </Link>
              </li>
              <li>
                <Link to="/help" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  帮助中心
                </Link>
              </li>
              <li>
                <Link to="/extension" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  浏览器扩展
                </Link>
              </li>
            </ul>
          </div>

          {/* 法律信息 */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">法律信息</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  隐私政策
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  服务条款
                </Link>
              </li>
            </ul>
          </div>

          {/* 联系方式 */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">联系我们</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://github.com/your-username/tmarks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <Github className="w-3.5 h-3.5" />
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@tmarks.com"
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  联系支持
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* 版权信息 */}
        <div className="mt-6 sm:mt-8 pt-6 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground text-center sm:text-left">
              © {currentYear} TMarks. All rights reserved.
            </p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              Made with <Heart className="w-3 h-3 text-error fill-error" /> by TMarks Team
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
