import { useState } from 'react'

export default function NewGame({ onCreate }) {
  const [length, setLength] = useState(5)
  return (
    <div className="new-game">
      <label>
        Word length{' '}
        <select value={length} onChange={(e) => setLength(Number(e.target.value))}>
          {[5, 6, 7, 8].map((n) => <option key={n}>{n}</option>)}
        </select>
      </label>
      <button onClick={() => onCreate(length)}>New game</button>
    </div>
  )
}
