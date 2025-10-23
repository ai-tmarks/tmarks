export const SITE_TITLE = 'TMarks - AI 驱动的智能书签管理系统';
export const SITE_DESCRIPTION = 'TMarks 是一个 AI 驱动的智能书签管理系统，支持 AI 标签推荐、标签页管理、多端同步。让知识触手可及，让浏览更加高效。';
export const SITE_URL = 'https://tmarks.669696.xyz';
export const APP_URL = 'https://tmarks.669696.xyz';

export const FEATURES = [
  {
    id: 'ai-tags',
    icon: 'Sparkles',
    title: 'AI 智能标签',
    description: '支持 OpenAI、Claude、DeepSeek 等 6+ AI 模型，自动分析页面内容，推荐精准标签。',
    highlights: ['多模型支持', '智能推荐', '标签复用'],
  },
  {
    id: 'tab-groups',
    icon: 'Layers',
    title: '标签页管理',
    description: '类似 OneTab，一键收纳当前窗口所有标签页，释放内存，提升浏览器性能。',
    highlights: ['一键收纳', '快速恢复', '云端同步'],
  },
  {
    id: 'extension',
    icon: 'Puzzle',
    title: '浏览器扩展',
    description: 'Chrome/Edge 扩展，快速保存书签，AI 推荐标签，一键收纳标签页。',
    highlights: ['快速保存', 'AI 推荐', '离线支持'],
  },
  {
    id: 'sync',
    icon: 'RefreshCw',
    title: '多端同步',
    description: '通过 API Key 实现 Web 端和扩展端数据实时同步，随时随地访问。',
    highlights: ['实时同步', '跨设备访问', '安全可靠'],
  },
  {
    id: 'share',
    icon: 'Share2',
    title: '公开分享',
    description: '自定义分享链接，分享你的知识库，与他人协作。',
    highlights: ['自定义链接', '页面定制', '筛选控制'],
  },
  {
    id: 'import-export',
    icon: 'Download',
    title: '导入/导出',
    description: '支持 HTML、JSON、CSV 格式，轻松迁移你的书签数据。',
    highlights: ['多格式支持', '批量导入', '数据备份'],
  },
];

export const STATS = [
  { value: '10K+', label: '活跃用户' },
  { value: '1M+', label: '书签保存' },
  { value: '6+', label: 'AI 模型' },
  { value: '99.9%', label: '可用性' },
];

export const HOW_IT_WORKS = [
  {
    step: 1,
    title: '注册账号',
    description: '访问 TMarks 官网，免费注册你的账号',
  },
  {
    step: 2,
    title: '生成 API Key',
    description: '在设置中生成你的 API Key',
  },
  {
    step: 3,
    title: '安装扩展',
    description: '安装浏览器扩展，配置 API Key',
  },
  {
    step: 4,
    title: '开始使用',
    description: '保存书签或收纳标签页，享受智能管理',
  },
];

export const TESTIMONIALS = [
  {
    name: '张三',
    role: '前端开发工程师',
    avatar: 'User',
    content: 'TMarks 的 AI 标签推荐太智能了！再也不用手动整理书签，节省了大量时间。',
    rating: 5,
  },
  {
    name: '李四',
    role: '产品经理',
    avatar: 'User',
    content: '标签页管理功能太实用了，一键收纳所有标签页，浏览器速度提升明显。',
    rating: 5,
  },
  {
    name: '王五',
    role: '学生',
    avatar: 'User',
    content: '多端同步很方便，在学校和家里都能访问我的书签，学习资料管理更高效。',
    rating: 5,
  },
];

export const PRICING_PLANS = [
  {
    id: 'free',
    name: '免费版',
    price: '¥0',
    period: '永久免费',
    description: '适合个人用户',
    features: [
      '1000 个书签',
      '100 个标签页组',
      'AI 标签推荐（每月 100 次）',
      '基础导入/导出',
      '社区支持',
    ],
    cta: '免费开始',
    highlighted: false,
  },
  {
    id: 'pro',
    name: '专业版',
    price: '¥29',
    period: '每月',
    description: '适合专业人士',
    features: [
      '无限书签',
      '无限标签页组',
      'AI 标签推荐（无限次）',
      '高级导入/导出',
      '公开分享',
      '优先支持',
      '数据分析',
    ],
    cta: '立即订阅',
    highlighted: true,
  },
  {
    id: 'enterprise',
    name: '企业版',
    price: '联系我们',
    period: '定制方案',
    description: '适合团队和企业',
    features: [
      '专业版所有功能',
      '团队协作',
      '自定义域名',
      'SSO 单点登录',
      '专属客户经理',
      'SLA 保障',
      '定制开发',
    ],
    cta: '联系销售',
    highlighted: false,
  },
];

export const NAV_LINKS = [
  { href: '/', label: '首页' },
  { href: '/features', label: '功能' },
  { href: '/pricing', label: '定价' },
  { href: '/docs', label: '文档' },
  { href: '/blog', label: '博客' },
  { href: '/about', label: '关于' },
];

export const FOOTER_LINKS = {
  product: [
    { href: '/features', label: '功能' },
    { href: '/pricing', label: '定价' },
    { href: '/changelog', label: '更新日志' },
  ],
  resources: [
    { href: '/docs', label: '文档' },
    { href: '/api', label: 'API' },
    { href: '/blog', label: '博客' },
  ],
  company: [
    { href: '/about', label: '关于我们' },
    { href: '/contact', label: '联系我们' },
    { href: '/privacy', label: '隐私政策' },
    { href: '/terms', label: '服务条款' },
  ],
  social: [
    { href: 'mailto:support@tmarks.669696.xyz', label: 'Email', icon: 'Mail' },
    { href: '#', label: 'Discord', icon: 'MessageCircle' },
    { href: '#', label: 'X (Twitter)', icon: 'X' },
    { href: '#', label: 'GitHub', icon: 'Github' },
  ],
};

