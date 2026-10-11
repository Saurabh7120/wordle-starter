import { render, screen, fireEvent, waitFor, act, configure } from '@testing-library/react'
import App from './App'
import Keyboard from './components/Keyboard'
import * as api from './api'

configure({ asyncUtilTimeout: 3000 }) // cold-start renders can exceed the 1s default

vi.mock('./api')

const mk = (id, length, guesses = [], status = 'in_progress') =>
  ({ id, length, max_guesses: length + 1, status, guesses, word: status === 'in_progress' ? null : 'crane' })
const A = mk('a', 5)
const B = mk('b', 6)
const type = (s) => [...s].forEach((key) => fireEvent.keyDown(document.body, { key }))

// findBy resolves on commit, before passive effects re-register the keydown handler with the loaded game
const ready = async () => {
  await screen.findByText('5 letters', { selector: 'h2' })
  await act(async () => {})
}

beforeEach(() => {
  localStorage.setItem('activeGame', 'a')
  api.listGames.mockResolvedValue({ games: [A, B], total: 2 })
  api.getGame.mockImplementation(async (id) => (id === 'a' ? A : B))
})

test('a guess resolving after switching games does not touch the new game', async () => {
  let resolve
  api.guess.mockReturnValue(new Promise((r) => { resolve = r }))
  const { container } = render(<App />)
  await ready()
  type('crane')
  fireEvent.keyDown(document.body, { key: 'Enter' })
  fireEvent.click(await screen.findByRole('button', { name: /6 letters/ }))
  await act(async () => resolve(mk('a', 5, [{ word: 'crane', feedback: Array(5).fill('green') }], 'won')))
  await waitFor(() => expect(api.guess).toHaveBeenCalled())
  expect(screen.getByText('6 letters', { selector: 'h2' })).toBeTruthy()
  expect(container.querySelectorAll('.tile')).toHaveLength(42)
  expect(container.querySelector('.confetti')).toBeNull()
  expect(container.querySelector('.shake')).toBeNull()
})

test('a rejected guess shakes the typed row', async () => {
  api.guess.mockRejectedValue(Object.assign(new Error('Not in word list'), { status: 422 }))
  const { container } = render(<App />)
  await ready()
  type('zzzzz')
  fireEvent.keyDown(document.body, { key: 'Enter' })
  await screen.findByText('Not in word list')
  expect(container.querySelector('.shake')).toBeTruthy()
})

test('a network error resyncs from the server and clears the typed word', async () => {
  const saved = mk('a', 5, [{ word: 'zzzzz', feedback: Array(5).fill('gray') }])
  api.guess.mockRejectedValue(new Error('Cannot reach the server'))
  const { container } = render(<App />)
  await ready()
  api.getGame.mockResolvedValue(saved)
  type('zzzzz')
  fireEvent.keyDown(document.body, { key: 'Enter' })
  await screen.findByText('1 of 6 guesses')
  expect(screen.getByText('Cannot reach the server')).toBeTruthy()
  expect(container.querySelectorAll('.tile.filled')).toHaveLength(5) // only the saved row
})

test('selecting a game refreshes a stale list copy', async () => {
  api.getGame.mockImplementation(async (id) => (id === 'a' ? A : mk('b', 6, [], 'won')))
  render(<App />)
  await ready()
  fireEvent.click(await screen.findByRole('button', { name: /6 letters/ }))
  await screen.findByText(/You won|The word was/i)
})

test('a slow refresh on select does not overwrite a newer board', async () => {
  let resolveGet
  api.getGame.mockImplementation((id) => (id === 'a' ? Promise.resolve(A) : new Promise((r) => { resolveGet = r })))
  api.guess.mockResolvedValue(mk('b', 6, [{ word: 'zzzzzz', feedback: Array(6).fill('gray') }]))
  render(<App />)
  await ready()
  fireEvent.click(await screen.findByRole('button', { name: /6 letters/ }))
  await screen.findByText('6 letters', { selector: 'h2' })
  await act(async () => {})
  type('zzzzzz')
  fireEvent.keyDown(document.body, { key: 'Enter' })
  await screen.findByText('1 of 7 guesses')
  await act(async () => resolveGet(B))
  expect(screen.getByText('1 of 7 guesses')).toBeTruthy()
})

test('mouse clicks blur the button so Enter submits; keyboard clicks keep focus', async () => {
  api.guess.mockResolvedValue(mk('a', 5, [{ word: 'zzzzz', feedback: Array(5).fill('gray') }]))
  render(<App />)
  await ready()
  const key = screen.getByRole('button', { name: 'z' })
  key.focus()
  fireEvent.click(key, { detail: 1 })
  expect(document.activeElement).toBe(document.body)
  type('zzzz')
  fireEvent.keyDown(document.body, { key: 'Enter' })
  await waitFor(() => expect(api.guess).toHaveBeenCalledTimes(1))
  expect(api.guess).toHaveBeenCalledWith('a', 'zzzzz')
  const other = screen.getByRole('button', { name: 'q' })
  other.focus()
  fireEvent.click(other, { detail: 0 })
  expect(document.activeElement).toBe(other)
})

test('closing Help with Escape returns focus to the game', async () => {
  const { container } = render(<App />)
  await ready()
  const summary = container.querySelector('summary')
  summary.focus()
  fireEvent.click(summary, { detail: 1 })
  container.querySelector('details').open = true
  fireEvent.keyDown(summary, { key: 'Escape' })
  expect(container.querySelector('details').open).toBe(false)
  expect(document.activeElement).not.toBe(summary)
  type('c')
  expect(container.querySelectorAll('.tile.filled')).toHaveLength(1)
})

test('works with blocked storage', async () => {
  const g = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
  const st = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
  try {
    render(<App />)
    await screen.findByText('A fresh word awaits.')
    fireEvent.click(await screen.findByRole('button', { name: /6 letters/ }))
    await screen.findByText('6 letters', { selector: 'h2' })
  } finally {
    g.mockRestore()
    st.mockRestore()
  }
})

test('creating a game skips the stale-copy refresh; clicking a list item does it', async () => {
  api.createGame.mockResolvedValue(mk('c', 7))
  render(<App />)
  await ready()
  api.getGame.mockClear()
  fireEvent.click(screen.getByRole('button', { name: 'New game' }))
  await screen.findByText('7 letters', { selector: 'h2' })
  await act(async () => {})
  expect(api.getGame).not.toHaveBeenCalled()
  fireEvent.click(await screen.findByRole('button', { name: /6 letters/ }))
  await waitFor(() => expect(api.getGame).toHaveBeenCalledWith('b'))
})

const many = (offset, len = 5) => ({
  games: Array.from({ length: Math.min(5, 12 - offset) }, (_, i) => mk(`g${offset + i}`, len)),
  total: 12,
})

test('pager walks pages and disables at the ends', async () => {
  api.listGames.mockImplementation(async (limit, offset) => many(offset))
  render(<App />)
  await ready()
  await screen.findByText('Page 1 of 3')
  expect(screen.getByRole('button', { name: 'Previous' }).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  await screen.findByText('Page 2 of 3')
  expect(api.listGames).toHaveBeenCalledWith(5, 5)
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  await screen.findByText('Page 3 of 3')
  expect(screen.getByRole('button', { name: 'Next' }).disabled).toBe(true)
})

test('a late response for an older page does not overwrite the newest one', async () => {
  let late
  api.listGames.mockImplementation((limit, offset) =>
    offset === 5 ? new Promise((r) => { late = () => r(many(5, 8)) }) : Promise.resolve(many(offset)))
  render(<App />)
  await ready()
  await screen.findByText('Page 1 of 3')
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Previous' }))
  await screen.findByText('Page 1 of 3')
  await act(async () => late())
  expect(screen.queryAllByRole('button', { name: /8 letters/ })).toHaveLength(0)
})

test('keyboard keys show the best known state per letter', () => {
  const fb = (...s) => s
  render(<Keyboard onKey={() => {}} guesses={[
    { word: 'abc', feedback: fb('gray', 'yellow', 'green') },
    { word: 'abc', feedback: fb('green', 'gray', 'gray') },
  ]} />)
  expect(screen.getByRole('button', { name: 'a, green' })).toBeTruthy() // gray then green
  expect(screen.getByRole('button', { name: 'b, yellow' })).toBeTruthy() // yellow beats gray
  expect(screen.getByRole('button', { name: 'c, green' })).toBeTruthy() // green not downgraded
})
