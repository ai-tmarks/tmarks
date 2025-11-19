import { Download, Chrome, CheckCircle, AlertCircle } from 'lucide-react'

export function ExtensionPage() {
  const handleDownload = (browser: 'chrome' | 'firefox' | 'edge' | 'opera' | 'brave' | '360' | 'qq' | 'sogou') => {
    const link = document.createElement('a')
    link.href = `/extensions/tmarks-extension-${browser}.zip`
    link.download = `tmarks-extension-${browser}.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* 标题区域 */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-float">
          <Chrome className="w-12 h-12" style={{ color: 'var(--foreground)' }} />
        </div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
          TMarks 浏览器插件
        </h1>
        <p className="text-lg" style={{ color: 'var(--muted-foreground)' }}>
          一键保存标签页组，让书签管理更高效
        </p>
      </div>

      {/* 下载按钮 */}
      <div className="card shadow-float mb-8 bg-gradient-to-br from-primary/5 to-secondary/5">
        <h2 className="text-xl font-bold mb-4 text-center" style={{ color: 'var(--foreground)' }}>
          选择你的浏览器下载
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {/* Chrome */}
          <div className="text-center p-3 rounded-xl border-2 transition-all hover:border-primary" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="w-10 h-10 mx-auto mb-2 flex items-center justify-center">
              <Chrome className="w-10 h-10" style={{ color: 'var(--foreground)' }} />
            </div>
            <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--foreground)' }}>Chrome</h3>
            <button onClick={() => handleDownload('chrome')} className="w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:shadow-md transition-all hover:scale-105 active:scale-95">
              <Download className="w-3 h-3" />下载
            </button>
          </div>

          {/* Firefox */}
          <div className="text-center p-3 rounded-xl border-2 transition-all hover:border-primary" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="w-10 h-10 mx-auto mb-2 flex items-center justify-center">
              <Chrome className="w-10 h-10" style={{ color: 'var(--foreground)' }} />
            </div>
            <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--foreground)' }}>Firefox</h3>
            <button onClick={() => handleDownload('firefox')} className="w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:shadow-md transition-all hover:scale-105 active:scale-95">
              <Download className="w-3 h-3" />下载
            </button>
          </div>

          {/* Edge */}
          <div className="text-center p-3 rounded-xl border-2 transition-all hover:border-primary" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="w-10 h-10 mx-auto mb-2 flex items-center justify-center">
              <Chrome className="w-10 h-10" style={{ color: 'var(--foreground)' }} />
            </div>
            <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--foreground)' }}>Edge</h3>
            <button onClick={() => handleDownload('edge')} className="w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:shadow-md transition-all hover:scale-105 active:scale-95">
              <Download className="w-3 h-3" />下载
            </button>
          </div>

          {/* Opera */}
          <div className="text-center p-3 rounded-xl border-2 transition-all hover:border-primary" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="w-10 h-10 mx-auto mb-2 flex items-center justify-center">
              <Chrome className="w-10 h-10" style={{ color: 'var(--foreground)' }} />
            </div>
            <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--foreground)' }}>Opera</h3>
            <button onClick={() => handleDownload('opera')} className="w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:shadow-md transition-all hover:scale-105 active:scale-95">
              <Download className="w-3 h-3" />下载
            </button>
          </div>

          {/* Brave */}
          <div className="text-center p-3 rounded-xl border-2 transition-all hover:border-primary" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="w-10 h-10 mx-auto mb-2 flex items-center justify-center">
              <Chrome className="w-10 h-10" style={{ color: 'var(--foreground)' }} />
            </div>
            <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--foreground)' }}>Brave</h3>
            <button onClick={() => handleDownload('brave')} className="w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:shadow-md transition-all hover:scale-105 active:scale-95">
              <Download className="w-3 h-3" />下载
            </button>
          </div>

          {/* 360浏览器 */}
          <div className="text-center p-3 rounded-xl border-2 transition-all hover:border-primary" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="w-10 h-10 mx-auto mb-2 flex items-center justify-center">
              <Chrome className="w-10 h-10" style={{ color: 'var(--foreground)' }} />
            </div>
            <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--foreground)' }}>360</h3>
            <button onClick={() => handleDownload('360')} className="w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:shadow-md transition-all hover:scale-105 active:scale-95">
              <Download className="w-3 h-3" />下载
            </button>
          </div>

          {/* QQ浏览器 */}
          <div className="text-center p-3 rounded-xl border-2 transition-all hover:border-primary" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="w-10 h-10 mx-auto mb-2 flex items-center justify-center">
              <Chrome className="w-10 h-10" style={{ color: 'var(--foreground)' }} />
            </div>
            <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--foreground)' }}>QQ</h3>
            <button onClick={() => handleDownload('qq')} className="w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:shadow-md transition-all hover:scale-105 active:scale-95">
              <Download className="w-3 h-3" />下载
            </button>
          </div>

          {/* 搜狗浏览器 */}
          <div className="text-center p-3 rounded-xl border-2 transition-all hover:border-primary" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="w-10 h-10 mx-auto mb-2 flex items-center justify-center">
              <Chrome className="w-10 h-10" style={{ color: 'var(--foreground)' }} />
            </div>
            <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--foreground)' }}>搜狗</h3>
            <button onClick={() => handleDownload('sogou')} className="w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:shadow-md transition-all hover:scale-105 active:scale-95">
              <Download className="w-3 h-3" />下载
            </button>
          </div>
        </div>

        {/* 支持的浏览器列表 */}
        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="text-sm font-semibold mb-3 text-center" style={{ color: 'var(--foreground)' }}>
            支持的浏览器
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            <div className="text-center p-2 rounded bg-muted/30">
              <div className="font-medium">Chrome</div>
              <div className="text-xs opacity-75">88+</div>
            </div>
            <div className="text-center p-2 rounded bg-muted/30">
              <div className="font-medium">Edge</div>
              <div className="text-xs opacity-75">88+</div>
            </div>
            <div className="text-center p-2 rounded bg-muted/30">
              <div className="font-medium">Firefox</div>
              <div className="text-xs opacity-75">109+</div>
            </div>
            <div className="text-center p-2 rounded bg-muted/30">
              <div className="font-medium">Brave</div>
              <div className="text-xs opacity-75">88+</div>
            </div>
            <div className="text-center p-2 rounded bg-muted/30">
              <div className="font-medium">Opera</div>
              <div className="text-xs opacity-75">74+</div>
            </div>
            <div className="text-center p-2 rounded bg-muted/30">
              <div className="font-medium">360浏览器</div>
              <div className="text-xs opacity-75">极速模式</div>
            </div>
            <div className="text-center p-2 rounded bg-muted/30">
              <div className="font-medium">QQ浏览器</div>
              <div className="text-xs opacity-75">极速模式</div>
            </div>
            <div className="text-center p-2 rounded bg-muted/30">
              <div className="font-medium">搜狗浏览器</div>
              <div className="text-xs opacity-75">极速模式</div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border text-center">
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            版本：1.0.0 | 大小：约 258 KB | 更新时间：2024-11-19
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
            💡 提供 8 个浏览器专用版本，也可以使用 Chrome 通用版（支持所有基于 Chrome 的浏览器）
          </p>
        </div>
      </div>

      {/* 功能特性 */}
      <div className="card shadow-float mb-8">
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
          ✨ 主要功能
        </h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-success" />
            <div>
              <h3 className="font-medium" style={{ color: 'var(--foreground)' }}>
                一键保存标签页组
              </h3>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                将当前浏览器打开的所有标签页一键保存到 TMarks，包括标题、URL 和网站图标
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-success" />
            <div>
              <h3 className="font-medium" style={{ color: 'var(--foreground)' }}>
                快速恢复标签页
              </h3>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                从 TMarks 网站一键恢复之前保存的标签页组，继续之前的工作
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-success" />
            <div>
              <h3 className="font-medium" style={{ color: 'var(--foreground)' }}>
                自动同步
              </h3>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                标签页组自动同步到云端，多设备无缝切换
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 安装步骤 */}
      <div className="card shadow-float mb-8">
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
          📦 安装步骤
        </h2>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">1</span>
            </div>
            <div className="flex-1">
              <h3 className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                下载插件压缩包
              </h3>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                点击上方下载按钮，获取 tmarks-extension.zip 文件
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">2</span>
            </div>
            <div className="flex-1">
              <h3 className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                解压文件
              </h3>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                将下载的 zip 文件解压到任意文件夹（建议放在不会删除的位置）
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">3</span>
            </div>
            <div className="flex-1">
              <h3 className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                打开扩展管理页面
              </h3>
              <p className="text-sm mb-2" style={{ color: 'var(--muted-foreground)' }}>
                在浏览器地址栏输入：
              </p>
              <div className="bg-muted/30 rounded-lg p-3 font-mono text-sm">
                <p className="mb-1">Chrome: chrome://extensions/</p>
                <p className="mb-1">Edge: edge://extensions/</p>
                <p>Firefox: about:debugging#/runtime/this-firefox</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">4</span>
            </div>
            <div className="flex-1">
              <h3 className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                启用开发者模式
              </h3>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                在扩展管理页面右上角，打开"开发者模式"开关
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">5</span>
            </div>
            <div className="flex-1">
              <h3 className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                加载插件
              </h3>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                点击"加载已解压的扩展程序"，选择刚才解压的文件夹
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">6</span>
            </div>
            <div className="flex-1">
              <h3 className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                完成安装
              </h3>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                插件图标会出现在浏览器工具栏，点击即可使用
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 使用提示 */}
      <div className="card shadow-float bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 mb-8">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-primary" />
          <div>
            <h3 className="font-medium mb-2" style={{ color: 'var(--foreground)' }}>
              💡 使用提示
            </h3>
            <ul className="text-sm space-y-1" style={{ color: 'var(--muted-foreground)' }}>
              <li>• 首次使用需要在插件中配置 TMarks 网站地址和 API Key</li>
              <li>• API Key 可以在网站的"API Keys"页面创建</li>
              <li>• 建议将插件图标固定到工具栏，方便快速访问</li>
              <li>• 插件会自动保存标签页的标题、URL 和网站图标</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 常见问题 */}
      <div className="card shadow-float">
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
          ❓ 常见问题
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>
              Q: 插件安装后找不到图标？
            </h3>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              A: 点击浏览器工具栏右侧的拼图图标，找到 TMarks 插件并点击固定按钮，图标就会显示在工具栏上。
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>
              Q: 如何获取 API Key？
            </h3>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              A: 登录 TMarks 网站后，点击右上角用户菜单中的"API Keys"，创建一个新的 API Key 并复制到插件配置中。
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>
              Q: 插件支持哪些浏览器？
            </h3>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              A: 支持 Chrome、Edge、Firefox、Brave、Opera 等主流浏览器。Chrome 和 Edge 使用同一个版本（基于相同技术），Firefox 使用专用版本。
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>
              Q: Chrome 和 Edge 可以用同一个版本吗？
            </h3>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              A: 是的！Chrome、Edge、Brave、Opera 等浏览器都使用 Chrome 版本。只有 Firefox 需要下载专用版本。
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>
              Q: 保存的标签页组在哪里查看？
            </h3>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              A: 在 TMarks 网站的"标签页"页面可以查看和管理所有保存的标签页组。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
