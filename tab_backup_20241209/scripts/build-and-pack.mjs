#!/usr/bin/env node

/**
 * 构建并打包浏览器扩展
 * 生成 Chrome 和 Firefox 两个版本
 * 将打包后的 zip 文件复制到 tmarks/public 目录供下载
 */

import { execSync } from 'child_process';
import { createWriteStream, existsSync, mkdirSync, copyFileSync } from 'fs';
import { readdir, stat, rm } from 'fs/promises';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 项目路径
const TAB_ROOT = resolve(__dirname, '..');
const DIST_DIR = join(TAB_ROOT, 'dist');
const TMARKS_PUBLIC_DIR = resolve(TAB_ROOT, '..', 'tmarks', 'public');
const TMARKS_EXTENSIONS_DIR = join(TMARKS_PUBLIC_DIR, 'extensions');

// 输出文件
const OUTPUT_CHROME_ZIP = join(TMARKS_EXTENSIONS_DIR, 'tmarks-extension-chrome.zip');
const OUTPUT_FIREFOX_ZIP = join(TMARKS_EXTENSIONS_DIR, 'tmarks-extension-firefox.zip');

// Manifest 文件
const MANIFEST_CHROME = join(TAB_ROOT, 'manifest.json');
const MANIFEST_FIREFOX = join(TAB_ROOT, 'manifest.firefox.json');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n[${step}] ${message}`, colors.blue + colors.bright);
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠ ${message}`, colors.yellow);
}

/**
 * 执行命令
 */
function runCommand(command, cwd = TAB_ROOT) {
  try {
    log(`  执行: ${command}`, colors.yellow);
    execSync(command, { cwd, stdio: 'inherit' });
    return true;
  } catch (error) {
    logError(`命令执行失败: ${command}`);
    return false;
  }
}

/**
 * 检查目录是否存在
 */
function checkDirectory(dir, name) {
  if (!existsSync(dir)) {
    logError(`${name} 目录不存在: ${dir}`);
    return false;
  }
  logSuccess(`${name} 目录存在: ${dir}`);
  return true;
}

/**
 * 获取目录大小
 */
async function getDirectorySize(dirPath) {
  let totalSize = 0;
  
  async function calculateSize(currentPath) {
    const stats = await stat(currentPath);
    
    if (stats.isFile()) {
      totalSize += stats.size;
    } else if (stats.isDirectory()) {
      const files = await readdir(currentPath);
      await Promise.all(
        files.map(file => calculateSize(join(currentPath, file)))
      );
    }
  }
  
  await calculateSize(dirPath);
  return totalSize;
}

/**
 * 格式化文件大小
 */
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * 创建 ZIP 压缩包
 */
async function createZip(sourceDir, outputPath, manifestPath) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // 最高压缩级别
    });

    output.on('close', () => {
      resolve(archive.pointer());
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);
    
    // 添加整个 dist 目录的内容（不包含 dist 目录本身）
    archive.directory(sourceDir, false);
    
    // 如果提供了自定义 manifest，替换默认的
    if (manifestPath && existsSync(manifestPath)) {
      archive.file(manifestPath, { name: 'manifest.json' });
    }
    
    archive.finalize();
  });
}

/**
 * 主流程
 */
async function main() {
  log('\n' + '='.repeat(60), colors.bright);
  log('  浏览器扩展构建和打包工具', colors.bright);
  log('='.repeat(60) + '\n', colors.bright);

  try {
    // 步骤 1: 检查环境
    logStep('1/6', '检查环境');
    if (!checkDirectory(TAB_ROOT, 'Tab 项目根目录')) {
      process.exit(1);
    }
    if (!checkDirectory(TMARKS_PUBLIC_DIR, 'TMarks public 目录')) {
      logWarning('TMarks public 目录不存在，将创建');
      mkdirSync(TMARKS_PUBLIC_DIR, { recursive: true });
      logSuccess('已创建 TMarks public 目录');
    }
    
    // 创建 extensions 子目录
    if (!existsSync(TMARKS_EXTENSIONS_DIR)) {
      mkdirSync(TMARKS_EXTENSIONS_DIR, { recursive: true });
      logSuccess('已创建 extensions 目录');
    }
    
    // 检查 manifest 文件
    if (!existsSync(MANIFEST_CHROME)) {
      logError('Chrome manifest.json 不存在');
      process.exit(1);
    }
    if (!existsSync(MANIFEST_FIREFOX)) {
      logWarning('Firefox manifest.firefox.json 不存在，将只构建 Chrome 版本');
    }

    // 步骤 2: 清理旧的构建产物
    logStep('2/6', '清理旧的构建产物');
    if (existsSync(DIST_DIR)) {
      log('  删除旧的 dist 目录...', colors.yellow);
      await rm(DIST_DIR, { recursive: true, force: true });
      logSuccess('已清理旧的构建产物');
    } else {
      log('  没有旧的构建产物需要清理', colors.yellow);
    }
    
    // 删除旧的 ZIP 文件
    if (existsSync(OUTPUT_CHROME_ZIP)) {
      await rm(OUTPUT_CHROME_ZIP, { force: true });
      log('  已删除旧的 Chrome ZIP', colors.yellow);
    }
    if (existsSync(OUTPUT_FIREFOX_ZIP)) {
      await rm(OUTPUT_FIREFOX_ZIP, { force: true });
      log('  已删除旧的 Firefox ZIP', colors.yellow);
    }

    // 步骤 3: 构建扩展
    logStep('3/6', '构建浏览器扩展');
    if (!runCommand('npm run build:only')) {
      logError('构建失败');
      process.exit(1);
    }
    logSuccess('构建完成');

    // 验证构建产物
    if (!existsSync(DIST_DIR)) {
      logError('构建产物目录不存在');
      process.exit(1);
    }

    // 获取构建产物大小
    const distSize = await getDirectorySize(DIST_DIR);
    log(`  构建产物大小: ${formatSize(distSize)}`, colors.yellow);

    // 步骤 4: 创建 Chrome 版本 ZIP
    logStep('4/6', '创建 Chrome 版本 ZIP');
    log('  正在压缩 Chrome 版本...', colors.yellow);
    const chromeZipSize = await createZip(DIST_DIR, OUTPUT_CHROME_ZIP, null);
    logSuccess(`Chrome ZIP 创建成功: ${OUTPUT_CHROME_ZIP}`);
    log(`  压缩包大小: ${formatSize(chromeZipSize)}`, colors.yellow);
    log(`  压缩率: ${((1 - chromeZipSize / distSize) * 100).toFixed(2)}%`, colors.yellow);

    // 步骤 5: 创建 Firefox 版本 ZIP
    logStep('5/6', '创建 Firefox 版本 ZIP');
    if (existsSync(MANIFEST_FIREFOX)) {
      log('  正在压缩 Firefox 版本...', colors.yellow);
      const firefoxZipSize = await createZip(DIST_DIR, OUTPUT_FIREFOX_ZIP, MANIFEST_FIREFOX);
      logSuccess(`Firefox ZIP 创建成功: ${OUTPUT_FIREFOX_ZIP}`);
      log(`  压缩包大小: ${formatSize(firefoxZipSize)}`, colors.yellow);
      log(`  压缩率: ${((1 - firefoxZipSize / distSize) * 100).toFixed(2)}%`, colors.yellow);
    } else {
      logWarning('跳过 Firefox 版本（manifest.firefox.json 不存在）');
    }

    // 步骤 6: 验证结果
    logStep('6/6', '验证结果');
    
    // 验证 Chrome 版本
    if (existsSync(OUTPUT_CHROME_ZIP)) {
      const stats = await stat(OUTPUT_CHROME_ZIP);
      logSuccess('Chrome 扩展包已成功打包');
      log(`  文件路径: ${OUTPUT_CHROME_ZIP}`, colors.yellow);
      log(`  文件大小: ${formatSize(stats.size)}`, colors.yellow);
    } else {
      logError('Chrome ZIP 文件创建失败');
      process.exit(1);
    }
    
    // 验证 Firefox 版本
    if (existsSync(MANIFEST_FIREFOX)) {
      if (existsSync(OUTPUT_FIREFOX_ZIP)) {
        const stats = await stat(OUTPUT_FIREFOX_ZIP);
        logSuccess('Firefox 扩展包已成功打包');
        log(`  文件路径: ${OUTPUT_FIREFOX_ZIP}`, colors.yellow);
        log(`  文件大小: ${formatSize(stats.size)}`, colors.yellow);
      } else {
        logError('Firefox ZIP 文件创建失败');
        process.exit(1);
      }
    }

    // 完成
    log('\n' + '='.repeat(60), colors.green + colors.bright);
    log('  ✓ 构建和打包完成！', colors.green + colors.bright);
    log('='.repeat(60) + '\n', colors.green + colors.bright);

    log('下一步操作:', colors.bright);
    log('\n开发测试:');
    log('  1. 在浏览器中打开扩展管理页面');
    log('     Chrome/Edge: chrome://extensions/');
    log('     Firefox: about:debugging#/runtime/this-firefox');
    log('  2. 启用"开发者模式"');
    log('  3. 点击"加载已解压的扩展程序"');
    log(`  4. 选择目录: ${DIST_DIR}`);
    log('\n用户下载:');
    log('  Chrome/Edge 用户: 下载 tmarks-extension-chrome.zip');
    log('  Firefox 用户: 下载 tmarks-extension-firefox.zip');
    log(`  下载地址: /extensions/tmarks-extension-[chrome|firefox].zip\n`);

  } catch (error) {
    logError(`发生错误: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// 运行主流程
main();
