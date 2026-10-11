const BASE = 'http://localhost:8000'

async function request(path, body) {
  let res
  try {
    res = await fetch(BASE + path, body && {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('Cannot reach the server')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const d = data.detail
    // 422 from validation may return a list of {msg}
    throw new Error(typeof d === 'string' ? d : d?.[0]?.msg || `Error ${res.status}`)
  }
  return data
}

export const listGames = () => request('/games')
export const getGame = (id) => request(`/games/${id}`)
export const createGame = (length) => request('/games', { length })
export const guess = (id, word) => request(`/games/${id}/guesses`, { guess: word })
