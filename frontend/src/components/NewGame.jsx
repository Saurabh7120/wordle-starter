import { useState } from 'react'

export default function NewGame({ onCreate, initial = 5 }) {
  const [length, setLength] = useState(initial)
  return (
    <div className="new-game">
      <label>
        Word length
        <select value={length} onChange={(e) => setLength(Number(e.target.value))}>
          {[5, 6, 7, 8].map((n) => <option key={n} value={n}>{n} letters</option>)}
        </select>
      </label>
      <button onClick={() => onCreate(length)}>New game</button>
    </div>
  )
}
