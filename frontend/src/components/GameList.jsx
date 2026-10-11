export default function GameList({ games, activeId, onSelect, page, pages, onPage }) {
  if (!games.length) return <p className="no-games">Your games will appear here.</p>
  return (
    <>
    <ul className="game-list">
      {games.map((g) => (
        <li key={g.id}>
          <button className={g.id === activeId ? 'active' : ''} aria-current={g.id === activeId ? 'true' : undefined} onClick={() => onSelect(g)}>
            <strong>{g.length} letters</strong>
            <small className={g.status}>{g.status === 'won' ? '✓ Solved' : g.status === 'lost' ? 'Missed' : 'In progress'} · {g.guesses.length}/{g.max_guesses}</small>
          </button>
        </li>
      ))}
    </ul>
    {pages > 1 && (
      <nav className="pager" aria-label="Games pages">
        <button disabled={page === 0} onClick={() => onPage(page - 1)}>Previous</button>
        <span>Page {page + 1} of {pages}</span>
        <button disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>Next</button>
      </nav>
    )}
    </>
  )
}
