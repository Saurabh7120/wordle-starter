export default function StatusBanner({ game }) {
  if (game.status === 'in_progress') return null
  return (
    <div className={`banner ${game.status}`}>
      {game.status === 'won' ? 'You won!' : 'You lost.'} The word was <b>{game.word}</b>.
    </div>
  )
}
