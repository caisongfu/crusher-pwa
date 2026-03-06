/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDateToISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * 格式化日期为 MM/DD（用于图表显示）
 */
export function formatDateToMD(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * 格式化日期为中文日期格式
 */
export function formatDateToCN(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

/**
 * 格式化金额（分转元）
 */
export function formatFenToYuan(fen: number): string {
  return `¥${(fen / 100).toFixed(2)}`;
}

/**
 * 格式化收入（分转元）
 */
export function formatRevenue(revenue: number): string {
  return formatFenToYuan(revenue);
}

/**
 * 格式化数字为千分位
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN');
}
