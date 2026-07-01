import { describe, expect, it } from 'vitest'

import { escapeHtml, renderMarkdown } from './markdown'

describe('escapeHtml', () => {
  it('экранирует спецсимволы', () => {
    expect(escapeHtml('<script>"a" & \'b\'')).toBe(
      '&lt;script&gt;&quot;a&quot; &amp; &#39;b&#39;',
    )
  })
})

describe('renderMarkdown', () => {
  it('пустой/пробельный вход → пустая строка', () => {
    expect(renderMarkdown('')).toBe('')
    expect(renderMarkdown('   \n  ')).toBe('')
  })

  it('экранирует HTML — инъекция не проходит', () => {
    const out = renderMarkdown('<img src=x onerror=alert(1)>')
    expect(out).not.toContain('<img')
    expect(out).toContain('&lt;img')
  })

  it('заголовки разных уровней', () => {
    expect(renderMarkdown('# Заголовок')).toBe('<h1>Заголовок</h1>')
    expect(renderMarkdown('### Три')).toBe('<h3>Три</h3>')
  })

  it('жирный и курсив', () => {
    expect(renderMarkdown('**bold**')).toBe('<p><strong>bold</strong></p>')
    expect(renderMarkdown('текст *кур* тут')).toBe('<p>текст <em>кур</em> тут</p>')
    expect(renderMarkdown('_em_')).toBe('<p><em>em</em></p>')
  })

  it('инлайн-код не трогает * внутри', () => {
    expect(renderMarkdown('`a*b*c`')).toBe('<p><code>a*b*c</code></p>')
  })

  it('безопасная ссылка превращается в <a>, target/rel выставлены', () => {
    const out = renderMarkdown('[сайт](https://example.com)')
    expect(out).toContain('<a href="https://example.com"')
    expect(out).toContain('target="_blank"')
    expect(out).toContain('rel="noreferrer noopener"')
    expect(out).toContain('>сайт</a>')
  })

  it('javascript:-ссылка НЕ превращается в <a>', () => {
    const out = renderMarkdown('[x](javascript:alert(1))')
    expect(out).not.toContain('<a ')
    expect(out).toContain('[x]')
  })

  it('маркированный список', () => {
    expect(renderMarkdown('- один\n- два')).toBe('<ul><li>один</li><li>два</li></ul>')
  })

  it('абзацы и переносы строк', () => {
    expect(renderMarkdown('строка1\nстрока2\n\nабзац2')).toBe(
      '<p>строка1<br />строка2</p><p>абзац2</p>',
    )
  })

  it('смешанный документ: заголовок + абзац + список', () => {
    const out = renderMarkdown('# T\n\nтекст\n\n- a\n- b')
    expect(out).toBe('<h1>T</h1><p>текст</p><ul><li>a</li><li>b</li></ul>')
  })
})
