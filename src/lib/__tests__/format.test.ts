import { describe, it, expect } from 'vitest'
import {
  formatDateToISO,
  formatDateToMD,
  formatDateToCN,
  formatFenToYuan,
  formatRevenue,
  formatNumber
} from '../format/index'

describe('formatDateToISO', () => {
  it('应该正确格式化日期为 ISO 格式', () => {
    const date = new Date('2026-03-06T12:00:00Z')
    expect(formatDateToISO(date)).toBe('2026-03-06')
  })

  it('应该正确处理闰年日期', () => {
    const date = new Date('2024-02-29T00:00:00Z')
    expect(formatDateToISO(date)).toBe('2024-02-29')
  })

  it('应该正确处理跨时区日期', () => {
    const date = new Date('2026-01-01T23:59:59Z')
    const result = formatDateToISO(date)
    // 根据本地时区，结果可能不同，但应该匹配 YYYY-MM-DD 格式
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('formatDateToMD', () => {
  it('应该正确格式化日期为 MM/DD 格式', () => {
    expect(formatDateToMD('2026-03-06')).toBe('3/6')
    expect(formatDateToMD('2026-12-31')).toBe('12/31')
  })

  it('应该正确处理月份和日期为个位数的情况', () => {
    expect(formatDateToMD('2026-01-01')).toBe('1/1')
    expect(formatDateToMD('2026-09-09')).toBe('9/9')
  })
})

describe('formatDateToCN', () => {
  it('应该正确格式化日期为中文格式', () => {
    const result = formatDateToCN('2026-03-06')
    expect(result).toMatch(/\d{4}年\d{1,2}月\d{1,2}日/)
  })
})

describe('formatFenToYuan', () => {
  it('应该正确将分转换为元', () => {
    expect(formatFenToYuan(100)).toBe('¥1.00')
    expect(formatFenToYuan(1000)).toBe('¥10.00')
    expect(formatFenToYuan(12345)).toBe('¥123.45')
  })

  it('应该正确处理零值', () => {
    expect(formatFenToYuan(0)).toBe('¥0.00')
  })

  it('应该正确处理小数位', () => {
    expect(formatFenToYuan(1)).toBe('¥0.01')
    expect(formatFenToYuan(99)).toBe('¥0.99')
  })
})

describe('formatRevenue', () => {
  it('应该正确格式化收入', () => {
    expect(formatRevenue(123456)).toBe('¥1234.56')
  })

  it('应该与 formatFenToYuan 行为一致', () => {
    const amount = 99999
    expect(formatRevenue(amount)).toBe(formatFenToYuan(amount))
  })
})

describe('formatNumber', () => {
  it('应该正确格式化数字为千分位', () => {
    expect(formatNumber(1000)).toBe('1,000')
    expect(formatNumber(1000000)).toBe('1,000,000')
    expect(formatNumber(123456789)).toBe('123,456,789')
  })

  it('应该正确处理小数', () => {
    expect(formatNumber(1234.56)).toBe('1,234.56')
  })

  it('应该正确处理负数', () => {
    expect(formatNumber(-1000)).toBe('-1,000')
  })

  it('应该正确处理零值', () => {
    expect(formatNumber(0)).toBe('0')
  })
})
