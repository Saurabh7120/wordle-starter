import { useState, useEffect, useCallback } from 'react'
import './App.css'
import * as api from './api'
import NewGame from './components/NewGame'
import GameList from './components/GameList'
import Board from './components/Board'
import Keyboard from './components/Keyboard'
import StatusBanner from './components/StatusBanner'

function App() {
  const [games, setGames] = useState([])
  const [activeId, setActiveId] = useState(() => localStorage.getItem('activeGame'))
  const [current, setCurrent] = useState('')
  const [error, setError] = useState('')

  const game = games.find((g) => g.id === activeId)
  const live = game?.status === 'in_progress'

  useEffect(() => {
    api.listGames().then(setGames).catch((e) => setError(e.message))
  }, [])

  const upsert = (g) => setGames((gs) => [g, ...gs.filter((x) => x.id !== g.id)])

  const select = (id) => {
    setActiveId(id)
    localStorage.setItem('activeGame', id)
    setCurrent('')
    setError('')
  }

  const create = async (length) => {
    try {
      const g = await api.createGame(length)
      upsert(g)
      select(g.id)
    } catch (e) {
      setError(e.message)
    }
  }

  const onKey = useCallback(async (key) => {
    if (!live) return
    setError('')
    if (key === 'Enter') {
      try {
        const g = await api.guess(game.id, current)
        // keep list order stable: replace in place
        setGames((gs) => gs.map((x) => (x.id === g.id ? g : x)))
        setCurrent('')
      } catch (e) {
        setError(e.message)
      }
    } else if (key === 'Backspace') setCurrent((c) => c.slice(0, -1))
    else if (/^[a-z]$/.test(key)) setCurrent((c) => (c.length < game.length ? c + key : c))
  }, [live, game, current])

  useEffect(() => {
    const h = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest('button, select')) return
      onKey(e.key.length === 1 ? e.key.toLowerCase() : e.key)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onKey])

  return (
    <main>
      <h1>Wordle</h1>
      <NewGame onCreate={create} />
      <GameList games={games} activeId={activeId} onSelect={select} />
      {error && <p className="error" role="alert">{error}</p>}
      {game && (
        <>
          <StatusBanner game={game} />
          <Board game={game} current={current} />
          <Keyboard guesses={game.guesses} onKey={onKey} />
        </>
      )}
    </main>
  )
}

export default App
