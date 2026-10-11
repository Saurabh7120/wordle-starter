export default function StatusBanner({ game }) {
  if (game.status === 'in_progress') return null
  return (
    <div className={`banner ${game.status}`} role="status">
      {game.status === 'won' ? 'Nicely done!' : 'Out of guesses.'} The word was <b>{game.word}</b>.
    </div>
  )
}
