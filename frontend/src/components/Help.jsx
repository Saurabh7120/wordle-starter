import { useEffect, useRef } from 'react'

export default function Help() {
  const ref = useRef(null)

  useEffect(() => {
    const close = (e) => {
      const d = ref.current
      if (d?.open && (e.key === 'Escape' || (e.type === 'click' && !d.contains(e.target)))) {
        d.open = false
        d.querySelector('summary').blur() // else the game's key handler ignores keys while the summary is focused
      }
    }
    window.addEventListener('keydown', close)
    window.addEventListener('click', close)
    return () => {
      window.removeEventListener('keydown', close)
      window.removeEventListener('click', close)
    }
  }, [])

  return (
    <details className="help" ref={ref}>
      <summary aria-label="How to play">?</summary>
      <div className="rules">
        <h2>How to play</h2>
        <p>Guess a 5–8 letter word in one more turn than its letter count. Each guess must be a valid word.</p>
        <p>Green means the right place, yellow means the letter belongs elsewhere, and gray means it is absent.</p>
        <p>Type with your keyboard or use the keys below. Start new games anytime and switch between them in Your games.</p>
      </div>
    </details>
  )
}
