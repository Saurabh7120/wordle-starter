import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import * as api from './api'
import * as store from './store'
import NewGame from './components/NewGame'
import GameList from './components/GameList'
import Board from './components/Board'
import Keyboard from './components/Keyboard'
import StatusBanner from './components/StatusBanner'
import Help from './components/Help'
import Confetti from './components/Confetti'

const PAGE_SIZE = 5

function App() {
  const [games, setGames] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [game, setGame] = useState(null)
  const [current, setCurrent] = useState('')
  const [error, setError] = useState('')
  const busy = useRef(false)
  const seq = useRef(0)
  const activeRef = useRef(null) // id of the game on screen, for in-flight guess responses
  const [shake, setShake] = useState(null)
  const [confetti, setConfetti] = useState(0)
  const shakeRow = (row) => setShake((s) => ({ row, n: (s?.n ?? 0) + 1 }))
  const stopConfetti = useCallback(() => setConfetti(0), [])

  const live = game?.status === 'in_progress'

  const refresh = useCallback((p) => {
    const n = ++seq.current
    api.listGames(PAGE_SIZE, p * PAGE_SIZE).then((r) => {
      if (n !== seq.current) return // a newer request superseded this one
      // page emptied (e.g. games removed elsewhere): step back
      if (!r.games.length && p > 0) return setPage(Math.max(0, Math.ceil(r.total / PAGE_SIZE) - 1))
      setGames(r.games)
      setTotal(r.total)
    }).catch((e) => setError(e.message))
  }, [])

  useEffect(() => refresh(page), [page, refresh])

  // the active game may be on another page, so load it by id
  useEffect(() => {
    const id = store.get('activeGame')
    if (!id) return
    api.getGame(id).then(setGame).catch((e) => {
      if (e.status === 404) store.remove('activeGame')
      else setError(e.message)
    })
  }, [])

  useEffect(() => { activeRef.current = game?.id ?? null }, [game])

  const select = (g, { fresh } = {}) => {
    setGame(g)
    setShake(null)
    store.set('activeGame', g.id)
    setCurrent('')
    setError('')
    if (fresh) return // just created, nothing stale
    // the list copy may be stale (e.g. finished in another tab): refresh in the background
    api.getGame(g.id).then((fresh) => {
      // never regress a board the user has already played on
      const newer = (x) => (x?.id === fresh.id && fresh.guesses.length >= x.guesses.length ? fresh : x)
      setGames((gs) => gs.map(newer))
      setGame(newer)
    }).catch(() => {})
  }

  const create = async (length) => {
    try {
      const g = await api.createGame(length)
      select(g, { fresh: true })
      if (page === 0) refresh(0)
      else setPage(0)
    } catch (e) {
      setError(e.message)
    }
  }

  const onKey = useCallback(async (key) => {
    if (!live || busy.current) return
    if (key === 'Enter' || key === 'Backspace' || /^[a-z]$/.test(key)) setError('')
    if (key === 'Enter') {
      busy.current = true
      try {
        const g = await api.guess(game.id, current)
        setGame((prev) => (prev?.id === g.id ? g : prev)) // ignore if the user switched games
        setGames((gs) => gs.map((x) => (x.id === g.id ? g : x)))
        setCurrent('')
        if (activeRef.current === g.id) {
          if (g.status === 'won') setConfetti((n) => n + 1)
          else shakeRow(g.guesses.length - 1)
        }
      } catch (e) {
        setError(e.message)
        if (e.status) {
          if (activeRef.current === game.id) shakeRow(game.guesses.length) // rejected guess: shake the typed row
        } else {
          // network error/timeout: the server may have saved the guess, so resync
          try {
            const g = await api.getGame(game.id)
            setGames((gs) => gs.map((x) => (x.id === g.id ? g : x)))
            if (activeRef.current === g.id) {
              setGame(g)
              if (g.guesses.length > game.guesses.length) setCurrent('')
            }
          } catch { /* keep the original error */ }
        }
      } finally {
        busy.current = false
      }
    } else if (key === 'Backspace') setCurrent((c) => c.slice(0, -1))
    else if (/^[a-z]$/.test(key)) setCurrent((c) => (c.length < game.length ? c + key : c))
  }, [live, game, current])

  // after a mouse click, drop button focus so physical Enter/typing go to the game; keyboard clicks (detail 0) keep it
  useEffect(() => {
    const blur = (e) => { if (e.detail > 0) e.target.closest?.('button')?.blur() }
    window.addEventListener('click', blur)
    return () => window.removeEventListener('click', blur)
  }, [])

  useEffect(() => {
    const h = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest('select, summary, a')) return
      // a focused button would also click on Enter/Space; other keys still type
      if (e.target.closest('button') && (e.key === 'Enter' || e.key === ' ')) return
      onKey(e.key.length === 1 ? e.key.toLowerCase() : e.key)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onKey])

  return (
    <main>
      {confetti > 0 && <Confetti key={confetti} onDone={stopConfetti} />}
      <header className="app-header">
        <div>
          <h1>wordle club<span>.</span></h1>
          <p>Good words. Good company.</p>
        </div>
        <Help />
      </header>
      <div className="game-layout">
        <aside className="game-sidebar" aria-label="Game controls">
          <h2>Your wordplay</h2>
          <NewGame key={game?.length} initial={game?.length} onCreate={create} />
          <h3>Your games</h3>
          <GameList games={games} activeId={game?.id} onSelect={select} page={page} pages={Math.ceil(total / PAGE_SIZE)} onPage={setPage} />
        </aside>
        <section className="play-area" aria-label="Puzzle">
          {error && <p className="error" role="alert">{error}</p>}
          {game ? (
            <>
              <div className="puzzle-heading">
                <h2>{game.length} letters</h2>
                <span>{game.guesses.length} of {game.max_guesses} guesses</span>
              </div>
              <StatusBanner game={game} />
              <Board game={game} current={current} shake={shake} />
              <Keyboard guesses={game.guesses} onKey={onKey} disabled={!live} />
              <div className="legend" role="group" aria-label="Letter feedback">
                <span><i className="green" />Right place •</span>
                <span><i className="yellow" />Elsewhere –</span>
                <span><i className="gray" />Absent</span>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h2>A fresh word awaits.</h2>
              <p>Choose a word length and start a new game, or pick one from Your games.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default App
