export default function Board({ game, current }) {
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
        <div className="row" key={r}>
          {row.map((t, c) => (
            <div key={c} className={`tile ${t.state}`}>{t.letter}</div>
          ))}
        </div>
      ))}
    </div>
  )
}
