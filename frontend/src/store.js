// localStorage can throw (blocked storage); the app must work without it
export const get = (k) => { try { return localStorage.getItem(k) } catch { return null } }
export const set = (k, v) => { try { localStorage.setItem(k, v) } catch { /* ignore */ } }
export const remove = (k) => { try { localStorage.removeItem(k) } catch { /* ignore */ } }
