import { useState } from 'react'
import { Check, X, ExternalLink, AlertCircle, Info } from 'lucide-react'

export function PermissionsPage() {
  const [popupStatus, setPopupStatus] = useState<'unknown' | 'allowed' | 'blocked'>('unknown')
  const [testWindow, setTestWindow] = useState<Window | null>(null)

  const checkPopupPermission = () => {
    // 尝试打开一个测试弹窗
    const testUrl = 'about:blank'
    const newWindow = window.open(testUrl, '_blank', 'width=400,height=300')

    if (newWindow) {
      setPopupStatus('allowed')
      setTestWindow(newWindow)
      
      // 在测试窗口中显示成功消息
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>权限测试成功</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-align: center;
              padding: 2rem;
            }
            .container {
              background: rgba(255, 255, 255, 0.1);
              backdrop-filter: blur(10px);
              padding: 2rem;
              border-radius: 1rem;
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            }
            h1 { font-size: 2rem; margin-bottom: 1rem; }
            p { font-size: 1.1rem; line-height: 1.6; margin-bottom: 1.5rem; }
            button {
              padding: 0.75rem 2rem;
              font-size: 1rem;
              background: white;
              color: #667eea;
              border: none;
              border-radius: 0.5rem;
              cursor: pointer;
              font-weight: bold;
            }
            button:hover { transform: scale(1.05); }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✅ 权限测试成功！</h1>
            <p>您的浏览器已允许 TMarks 打开弹窗。<br>现在可以使用"一键打开全部"功能了。</p>
            <button onclick="window.close()">关闭此窗口</button>
          </div>
        </body>
        </html>
      `)
      
      // 3秒后自动关闭测试窗口
      setTimeout(() => {
        if (newWindow && !newWindow.closed) {
          newWindow.close()
        }
      }, 3000)
    } else {
      setPopupStatus('blocked')
    }
  }

  const closeTestWindow = () => {
    if (testWindow && !testWindow.closed) {
      testWindow.close()
      setTestWindow(null)
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">浏览器权限设置</h1>
        <p className="text-muted-foreground">
          配置 TMarks 所需的浏览器权限，以获得最佳使用体验
        </p>
      </div>

      {/* 弹窗权限卡片 */}
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ExternalLink className="w-6 h-6 text-primary" />
          </div>
          
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              弹窗权限
            </h2>
            <p className="text-muted-foreground mb-4">
              允许 TMarks 打开弹窗，以便使用"一键打开全部标签页"功能。
            </p>

            {/* 状态显示 */}
            {popupStatus === 'allowed' && (
              <div className="bg-success/10 border border-success/20 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-success">
                  <Check className="w-5 h-5" />
                  <span className="font-semibold">权限已允许</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  您的浏览器已允许 TMarks 打开弹窗。现在可以正常使用"一键打开全部"功能了。
                </p>
              </div>
            )}

            {popupStatus === 'blocked' && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-destructive">
                  <X className="w-5 h-5" />
                  <span className="font-semibold">权限被拒绝</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  浏览器阻止了弹窗。请按照下方说明手动允许。
                </p>
              </div>
            )}

            {/* 测试按钮 */}
            <button
              onClick={checkPopupPermission}
              className="btn btn-primary"
            >
              <ExternalLink className="w-4 h-4" />
              测试弹窗权限
            </button>

            {testWindow && !testWindow.closed && (
              <button
                onClick={closeTestWindow}
                className="btn btn-secondary ml-3"
              >
                关闭测试窗口
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 使用说明 */}
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-3 mb-4">
          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-foreground mb-2">如何允许弹窗？</h3>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">1.</span>
                <span>点击上方的"测试弹窗权限"按钮</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">2.</span>
                <span>浏览器地址栏会出现弹窗拦截图标（通常在右侧）</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">3.</span>
                <span>点击该图标，选择"始终允许 [网站] 显示弹出式窗口"</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">4.</span>
                <span>再次点击"测试弹窗权限"按钮，确认权限已允许</span>
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* 不同浏览器的说明 */}
      <div className="card p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-foreground mb-3">各浏览器设置方法</h3>
            
            <div className="space-y-4 text-sm">
              {/* Chrome */}
              <div>
                <h4 className="font-semibold text-foreground mb-1">Chrome / Edge</h4>
                <p className="text-muted-foreground">
                  地址栏右侧会出现 <span className="inline-flex items-center px-2 py-0.5 rounded bg-muted text-foreground font-mono text-xs">🚫</span> 图标，
                  点击后选择"始终允许弹出式窗口和重定向"
                </p>
              </div>

              {/* Firefox */}
              <div>
                <h4 className="font-semibold text-foreground mb-1">Firefox</h4>
                <p className="text-muted-foreground">
                  地址栏左侧会出现弹窗拦截提示，点击"选项" → "允许 [网站] 的弹出式窗口"
                </p>
              </div>

              {/* Safari */}
              <div>
                <h4 className="font-semibold text-foreground mb-1">Safari</h4>
                <p className="text-muted-foreground">
                  菜单栏：Safari → 设置 → 网站 → 弹出式窗口 → 找到当前网站 → 选择"允许"
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 为什么需要这个权限 */}
      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <h4 className="font-semibold text-foreground mb-2">💡 为什么需要弹窗权限？</h4>
        <p className="text-sm text-muted-foreground">
          "一键打开全部标签页"功能需要同时打开多个网页。浏览器为了安全考虑，默认会拦截批量打开的弹窗。
          允许 TMarks 的弹窗权限后，您就可以一次性打开标签页组中的所有网页，大大提高工作效率。
        </p>
      </div>
    </div>
  )
}
