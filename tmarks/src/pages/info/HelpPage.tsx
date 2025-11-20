import { Book, HelpCircle, MessageCircle, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'

export function HelpPage() {
  const faqs = [
    {
      question: '如何创建书签？',
      answer: '点击页面右上角的"添加书签"按钮，填写书签信息后保存即可。你也可以使用浏览器扩展快速保存当前页面。'
    },
    {
      question: '如何使用标签？',
      answer: '在创建或编辑书签时，可以为书签添加标签。点击侧边栏的标签可以筛选对应的书签。'
    },
    {
      question: '如何导入浏览器书签？',
      answer: '进入"通用设置" → "数据"标签页，选择"导入数据"，上传浏览器导出的 HTML 书签文件即可。'
    },
    {
      question: '如何分享我的书签？',
      answer: '进入"通用设置" → "分享"标签页，启用公开分享功能，系统会生成一个公开链接供他人访问。'
    },
    {
      question: '如何获取 API Key？',
      answer: '进入"通用设置" → "API"标签页，点击"创建"按钮生成新的 API Key，用于浏览器扩展或第三方应用。'
    },
    {
      question: '浏览器扩展如何安装？',
      answer: '访问"浏览器"页面，下载对应浏览器的扩展文件，按照说明安装即可。'
    },
    {
      question: '如何切换主题？',
      answer: '进入"通用设置" → "基础"标签页，选择浅色、深色或跟随系统主题。'
    },
    {
      question: '数据安全吗？',
      answer: '所有数据都加密存储在 Cloudflare D1 数据库中，使用 JWT 进行身份认证，确保数据安全。'
    }
  ]

  const guides = [
    {
      title: '快速开始',
      description: '了解如何创建第一个书签和使用基本功能',
      icon: Book,
      link: '#quick-start'
    },
    {
      title: '浏览器扩展',
      description: '安装和配置浏览器扩展，快速保存书签',
      icon: FileText,
      link: '/extension'
    },
    {
      title: '导入导出',
      description: '从其他书签管理工具迁移数据',
      icon: FileText,
      link: '/settings/general?tab=data'
    },
    {
      title: '公开分享',
      description: '创建公开链接，分享你的书签集合',
      icon: FileText,
      link: '/settings/general?tab=share'
    }
  ]

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
      {/* 标题 */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground">帮助中心</h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
          查找常见问题的答案，或浏览使用指南
        </p>
      </div>

      {/* 快速指南 */}
      <div className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">快速指南</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {guides.map((guide) => {
            const Icon = guide.icon
            return (
              <Link
                key={guide.title}
                to={guide.link}
                className="card p-5 hover:border-primary/50 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">{guide.title}</h3>
                    <p className="text-sm text-muted-foreground">{guide.description}</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* 常见问题 */}
      <div className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">常见问题</h2>
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <details key={index} className="card p-5 group">
              <summary className="flex items-start gap-3 cursor-pointer list-none">
                <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground group-open:text-primary transition-colors">
                    {faq.question}
                  </h3>
                </div>
                <svg
                  className="w-5 h-5 text-muted-foreground transition-transform group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-3 pl-8 text-sm text-muted-foreground">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* 联系支持 */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold text-foreground">需要更多帮助？</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          如果你没有找到问题的答案，可以通过以下方式联系我们：
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="https://github.com/your-username/tmarks/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary flex items-center gap-2 justify-center"
          >
            <FileText className="w-4 h-4" />
            提交问题
          </a>
          <a
            href="mailto:support@tmarks.com"
            className="btn btn-secondary flex items-center gap-2 justify-center"
          >
            <MessageCircle className="w-4 h-4" />
            联系支持
          </a>
        </div>
      </div>
    </div>
  )
}
