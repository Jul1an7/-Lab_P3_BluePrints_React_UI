const TOKEN_KEY = 'token'

function decodeBase64Url(input) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const pad = normalized.length % 4
  const padded = pad ? normalized + '='.repeat(4 - pad) : normalized
  return atob(padded)
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function isTokenValid(token = getStoredToken()) {
  if (!token || typeof token !== 'string') return false

  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false

    const payload = JSON.parse(decodeBase64Url(parts[1]))
    if (!payload || typeof payload !== 'object') return false

    if (!payload.exp) return true
    const nowSeconds = Math.floor(Date.now() / 1000)
    return payload.exp > nowSeconds
  } catch {
    return false
  }
}

export function getValidToken() {
  const token = getStoredToken()
  if (!isTokenValid(token)) {
    clearStoredToken()
    return null
  }
  return token
}
