export default function GameList({ games, activeId, onSelect }) {
  if (!games.length) return null
  return (
    <ul className="game-list">
      {games.map((g) => (
        <li key={g.id}>
          <button className={g.id === activeId ? 'active' : ''} onClick={() => onSelect(g.id)}>
            {g.length} letters · {g.guesses.length}/{g.max_guesses} · {g.status.replace('_', ' ')}
          </button>
        </li>
      ))}
    </ul>
  )
}
