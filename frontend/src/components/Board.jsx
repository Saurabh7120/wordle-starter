export default function Board({ game, current, shake }) {
  const rows = Array.from({ length: game.max_guesses }, (_, r) => {
    const g = game.guesses[r]
    const word = g ? g.word : r === game.guesses.length ? current : ''
    return Array.from({ length: game.length }, (_, c) => ({
      letter: word[c] || '',
      state: g ? g.feedback[c] : '',
    }))
  })
  return (
    <div className="board" style={{ '--cols': game.length }}>
      {rows.map((row, r) => (
        <div className={`row ${shake?.row === r ? 'shake' : ''}`} key={shake?.row === r ? `${r}-${shake.n}` : r}>
          {row.map((t, c) => (
            <div key={c} role="img" className={`tile ${t.state} ${t.letter ? 'filled' : ''}`}
              aria-label={`Row ${r + 1}, letter ${c + 1}: ${t.letter || 'empty'}${t.state ? `, ${t.state}` : ''}`}>{t.letter}</div>
          ))}
        </div>
      ))}
    </div>
  )
}
