/**
 * 浏览器扩展构建配置
 * 
 * 添加新浏览器版本：
 * 1. 在 browsers 数组中添加配置
 * 2. 创建对应的 manifest 文件
 * 3. 运行 pnpm build
 */

export const buildConfig = {
  // 输出目录
  output: {
    // 构建输出目录（临时）
    distDir: 'dist',
    // TMarks public 目录
    publicDir: '../tmarks/public/extensions',
  },

  // 浏览器版本配置
  browsers: [
    // === 国际主流浏览器 ===
    {
      // 浏览器标识
      id: 'chrome',
      // 显示名称
      name: 'Chrome',
      // 描述
      description: 'Google Chrome 浏览器（通用 Chromium 版本）',
      // Manifest 文件路径
      manifest: 'manifest.json',
      // 输出文件名
      outputFile: 'tmarks-extension-chrome.zip',
      // 图标颜色（用于文档）
      color: 'blue',
      // 是否启用
      enabled: true,
      // 支持的浏览器列表
      supportedBrowsers: ['Chrome 88+', 'Edge 88+', 'Brave 88+', 'Opera 74+', '360浏览器', 'QQ浏览器', '搜狗浏览器'],
      // 分类
      category: 'international',
    },
    {
      id: 'firefox',
      name: 'Firefox',
      description: 'Mozilla Firefox 浏览器',
      manifest: 'manifests/manifest.firefox.json',
      outputFile: 'tmarks-extension-firefox.zip',
      color: 'orange',
      enabled: true,
      supportedBrowsers: ['Firefox 109+'],
      category: 'international',
    },
    {
      id: 'edge',
      name: 'Edge',
      description: 'Microsoft Edge 浏览器（专用版本）',
      manifest: 'manifests/manifest.edge.json',
      outputFile: 'tmarks-extension-edge.zip',
      color: 'blue',
      enabled: true,
      supportedBrowsers: ['Edge 88+'],
      category: 'international',
      note: 'Edge 专用版本，也可以使用 Chrome 通用版本',
    },
    
    // === 其他 Chromium 浏览器 ===
    {
      id: 'opera',
      name: 'Opera',
      description: 'Opera 浏览器（专用版本）',
      manifest: 'manifests/manifest.opera.json',
      outputFile: 'tmarks-extension-opera.zip',
      color: 'red',
      enabled: true,
      supportedBrowsers: ['Opera 74+'],
      category: 'chromium',
      note: 'Opera 专用版本，也可以使用 Chrome 通用版本',
    },
    {
      id: 'brave',
      name: 'Brave',
      description: 'Brave 浏览器（专用版本）',
      manifest: 'manifests/manifest.brave.json',
      outputFile: 'tmarks-extension-brave.zip',
      color: 'orange',
      enabled: true,
      supportedBrowsers: ['Brave 88+'],
      category: 'chromium',
      note: 'Brave 专用版本，也可以使用 Chrome 通用版本',
    },
    
    // === 国产浏览器 ===
    {
      id: '360',
      name: '360浏览器',
      description: '360安全浏览器/360极速浏览器',
      manifest: 'manifests/manifest.360.json',
      outputFile: 'tmarks-extension-360.zip',
      color: 'green',
      enabled: true,
      supportedBrowsers: ['360安全浏览器', '360极速浏览器'],
      category: 'chinese',
      note: '360 专用版本，也可以使用 Chrome 通用版本',
    },
    {
      id: 'qq',
      name: 'QQ浏览器',
      description: 'QQ浏览器',
      manifest: 'manifests/manifest.qq.json',
      outputFile: 'tmarks-extension-qq.zip',
      color: 'blue',
      enabled: true,
      supportedBrowsers: ['QQ浏览器'],
      category: 'chinese',
      note: 'QQ 专用版本，也可以使用 Chrome 通用版本',
    },
    {
      id: 'sogou',
      name: '搜狗浏览器',
      description: '搜狗高速浏览器',
      manifest: 'manifests/manifest.sogou.json',
      outputFile: 'tmarks-extension-sogou.zip',
      color: 'orange',
      enabled: true,
      supportedBrowsers: ['搜狗高速浏览器'],
      category: 'chinese',
      note: '搜狗专用版本，也可以使用 Chrome 通用版本',
    },
    
    // === 其他浏览器 ===
    {
      id: 'safari',
      name: 'Safari',
      description: 'Apple Safari 浏览器',
      manifest: 'manifests/manifest.safari.json',
      outputFile: 'tmarks-extension-safari.zip',
      color: 'blue',
      enabled: false,  // 暂未实现，需要特殊处理
      supportedBrowsers: ['Safari 14+'],
      category: 'other',
      note: '需要使用 Safari Web Extension 格式，暂未实现',
    },
  ],

  // 构建选项
  buildOptions: {
    // 压缩级别 (0-9)
    compressionLevel: 9,
    // 是否显示详细日志
    verbose: true,
    // 是否在构建前清理
    clean: true,
  },

  // 版本信息
  version: {
    number: '1.0.0',
    date: '2024-11-19',
  },
}

/**
 * 获取启用的浏览器配置
 */
export function getEnabledBrowsers() {
  return buildConfig.browsers.filter(browser => browser.enabled)
}

/**
 * 根据 ID 获取浏览器配置
 */
export function getBrowserConfig(id) {
  return buildConfig.browsers.find(browser => browser.id === id)
}

/**
 * 获取所有浏览器 ID
 */
export function getAllBrowserIds() {
  return buildConfig.browsers.map(browser => browser.id)
}

/**
 * 验证配置
 */
export function validateConfig() {
  const errors = []
  
  buildConfig.browsers.forEach(browser => {
    if (!browser.id) {
      errors.push('浏览器配置缺少 id')
    }
    if (!browser.name) {
      errors.push(`浏览器 ${browser.id} 缺少 name`)
    }
    if (!browser.manifest) {
      errors.push(`浏览器 ${browser.id} 缺少 manifest`)
    }
    if (!browser.outputFile) {
      errors.push(`浏览器 ${browser.id} 缺少 outputFile`)
    }
  })
  
  return {
    valid: errors.length === 0,
    errors
  }
}
