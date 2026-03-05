// src/lib/copy.ts
import { marked } from 'marked'

// 去除所有 Markdown 标记，保留纯文字
export function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '')           // 标题
    .replace(/\*\*(.+?)\*\*/g, '$1')     // 粗体
    .replace(/\*(.+?)\*/g, '$1')         // 斜体
    .replace(/_(.+?)_/g, '$1')           // 斜体（下划线形式）
    .replace(/`{3}[\s\S]*?`{3}/g, '')    // 代码块
    .replace(/`(.+?)`/g, '$1')           // 行内代码
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // 链接
    .replace(/^[-*+]\s+/gm, '')          // 无序列表
    .replace(/^\d+\.\s+/gm, '')          // 有序列表
    .replace(/^>\s+/gm, '')              // 引用
    .replace(/!\[.*?\]\(.*?\)/g, '')     // 图片
    .replace(/\n{3,}/g, '\n\n')          // 多余空行
    .trim()
}

// Markdown 转 HTML（用于富文本复制）
export async function markdownToHtml(markdown: string): Promise<string> {
  return await marked(markdown)
}

// 复制 Markdown 原文
export async function copyAsMarkdown(markdown: string): Promise<void> {
  await navigator.clipboard.writeText(markdown)
}

// 复制纯文本（去除所有 Markdown 标记）
export async function copyAsPlainText(markdown: string): Promise<void> {
  await navigator.clipboard.writeText(stripMarkdown(markdown))
}

// 复制富文本（HTML + 纯文本，支持 Word/企业微信）
// 非 HTTPS 或不支持 ClipboardItem 时降级为纯文本
export async function copyAsRichText(markdown: string): Promise<void> {
  if (typeof ClipboardItem === 'undefined') {
    // 降级：复制纯文本
    await copyAsPlainText(markdown)
    return
  }

  const html = await markdownToHtml(markdown)
  const plain = stripMarkdown(markdown)

  await navigator.clipboard.write([
    new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([plain], { type: 'text/plain' }),
    }),
  ])
}
