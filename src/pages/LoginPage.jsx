import { useState } from 'react'
import api from '../services/apiClient.js'
import { clearStoredToken, getValidToken } from '../services/authToken.js'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const hasSession = Boolean(getValidToken())

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const { data } = await api.post('/auth/login', { username, password })
      localStorage.setItem('token', data.access_token)
      alert('Login exitoso')
    } catch (e) {
      setError('Credenciales inválidas o servidor no disponible')
    }
  }

  const handleLogout = () => {
    clearStoredToken()
    alert('Sesion cerrada')
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2 style={{ marginTop: 0 }}>Login</h2>
      <div className="grid cols-2">
        <div>
          <label>Usuario</label>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div>
          <label>Contraseña</label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>
      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      <button className="btn primary" style={{ marginTop: 12 }}>
        Ingresar
      </button>
      {hasSession && (
        <button
          type="button"
          className="btn"
          style={{ marginTop: 12, marginLeft: 8 }}
          onClick={handleLogout}
        >
          Cerrar sesion
        </button>
      )}
    </form>
  )
}
