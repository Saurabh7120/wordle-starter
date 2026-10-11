const ROWS = ['qwertyuiop', 'asdfghjkl', '+zxcvbnm-']
const RANK = { gray: 1, yellow: 2, green: 3 }

export default function Keyboard({ guesses, onKey }) {
  const best = {}
  for (const g of guesses)
    [...g.word].forEach((ch, i) => {
      if ((RANK[g.feedback[i]] || 0) > (RANK[best[ch]] || 0)) best[ch] = g.feedback[i]
    })
  return (
    <div className="keyboard">
      {ROWS.map((row) => (
        <div className="kb-row" key={row}>
          {[...row].map((k) => {
            const label = k === '+' ? 'Enter' : k === '-' ? '⌫' : k
            const key = k === '+' ? 'Enter' : k === '-' ? 'Backspace' : k
            return (
              <button key={k} className={`key ${best[k] || ''} ${label.length > 1 ? 'wide' : ''}`}
                onClick={() => onKey(key)}>{label}</button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
