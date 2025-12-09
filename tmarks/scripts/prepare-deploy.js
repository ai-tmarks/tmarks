#!/usr/bin/env node

/**
 * 准备Cloudflare Pages部署
 * 将dist内容和functions目录合并到同一层级
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '../dist');
const functionsDir = path.join(__dirname, '../functions');
const deployDir = path.join(__dirname, '../.deploy');

console.log('🚀 准备Cloudflare Pages部署...');

// 清理旧的部署目录（尝试删除，失败则跳过）
if (fs.existsSync(deployDir)) {
  try {
    fs.rmSync(deployDir, { recursive: true, force: true });
    console.log('✓ 清理旧部署目录');
  } catch (error) {
    console.log('⚠ 无法删除旧目录，将覆盖文件');
  }
}

// 创建部署目录
fs.mkdirSync(deployDir, { recursive: true });

// 复制dist内容到部署目录
console.log('📦 复制静态文件...');
copyDir(distDir, deployDir);

// 复制functions目录到部署目录
console.log('⚡ 复制Functions...');
const targetFunctionsDir = path.join(deployDir, 'functions');
copyDir(functionsDir, targetFunctionsDir);

console.log('✅ 部署准备完成!');
console.log(`� 部署目录库: ${deployDir}`);

/**
 * 递归复制目录
 */
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    // 跳过废弃的备份目录
    if (entry.name.startsWith('_deprecated')) {
      console.log(`⏭ 跳过废弃目录: ${entry.name}`);
      continue;
    }

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

