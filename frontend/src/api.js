const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function request(path, body) {
  let res
  try {
    res = await fetch(BASE + path, {
      signal: AbortSignal.timeout(10000),
      ...(body && {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      }),
    })
  } catch {
    throw new Error('Cannot reach the server')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const d = data.detail
    // 422 from validation may return a list of {msg}
    throw Object.assign(new Error(typeof d === 'string' ? d : d?.[0]?.msg || `Error ${res.status}`), { status: res.status })
  }
  return data
}

export const listGames = (limit, offset) => request(`/games?limit=${limit}&offset=${offset}`)
export const getGame = (id) => request(`/games/${id}`)
export const createGame = (length) => request('/games', { length })
export const guess = (id, word) => request(`/games/${id}/guesses`, { guess: word })
