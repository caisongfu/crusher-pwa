import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('cn', () => {
  it('应该正确合并类名', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
    expect(cn('foo', 'bar', 'baz')).toBe('foo bar baz')
  })

  it('应该正确处理条件类名', () => {
    expect(cn('foo', true && 'bar', false && 'baz')).toBe('foo bar')
    expect(cn('foo', 'bar', null, undefined)).toBe('foo bar')
  })

  it('应该正确处理数组类名', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz')
  })

  it('应该正确处理对象类名', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
    expect(cn('base', { foo: true, bar: false })).toBe('base foo')
  })

  it('应该使用 tailwind-merge 合并 Tailwind 类名', () => {
    // tailwind-merge 会移除冲突的类名
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('text-sm', 'text-lg')).toBe('text-lg')
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500')
  })

  it('应该正确处理复杂的类名组合', () => {
    const result = cn(
      'base-class',
      'conditional-class',
      ['array-class-1', 'array-class-2'],
      { object: true, notObject: false }
    )

    expect(result).toBe('base-class conditional-class array-class-1 array-class-2 object')
  })

  it('应该正确处理空输入', () => {
    expect(cn()).toBe('')
    expect(cn('')).toBe('')
    expect(cn(null, undefined)).toBe('')
  })
})
