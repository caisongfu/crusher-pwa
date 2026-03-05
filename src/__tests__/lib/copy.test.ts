import { stripMarkdown, markdownToHtml } from '@/lib/copy'

describe('stripMarkdown', () => {
  it('removes bold markers', () => {
    expect(stripMarkdown('**bold**')).toBe('bold')
  })

  it('removes italic markers', () => {
    expect(stripMarkdown('_italic_')).toBe('italic')
  })

  it('removes heading markers', () => {
    expect(stripMarkdown('# Heading')).toBe('Heading')
  })

  it('removes link syntax, keeps text', () => {
    expect(stripMarkdown('[text](url)')).toBe('text')
  })

  it('removes code backticks', () => {
    expect(stripMarkdown('`code`')).toBe('code')
  })

  it('removes list markers', () => {
    expect(stripMarkdown('- item')).toBe('item')
  })

  it('handles plain text unchanged', () => {
    expect(stripMarkdown('plain text')).toBe('plain text')
  })
})

describe('markdownToHtml', () => {
  it('converts bold to <strong>', async () => {
    const html = await markdownToHtml('**bold**')
    expect(html).toContain('<strong>bold</strong>')
  })

  it('converts heading to h1', async () => {
    const html = await markdownToHtml('# Title')
    expect(html).toContain('<h1>Title</h1>')
  })
})
