import { readFileSync } from 'node:fs'

// every animation selector must be neutralised inside the reduced-motion block
test('reduced-motion block covers every animation', () => {
  const css = ['./App.css', './index.css'].map((f) => readFileSync(new URL(f, import.meta.url), 'utf8')).join('\n').replace(/\/\*[\s\S]*?\*\//g, '')
  const m = css.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/)
  expect(m).toBeTruthy()
  const outside = css.replace(m[0], '')
  const animated = [...outside.matchAll(/([^{}]+)\{[^{}]*\b(?:animation|transition)\b[^{}]*\}/g)].map((x) => x[1].trim())
  expect(animated.length).toBeGreaterThan(0)
  for (const sel of animated) expect(m[1]).toContain(sel.split(' ')[0]) // `.confetti i` is hidden via `.confetti`
})
