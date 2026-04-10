import axios from 'axios'
import { getValidToken } from './authToken.js'

function normalizeBaseUrl(raw) {
  const input = (raw || 'http://localhost:8080').trim()
  const noTrailingSlash = input.replace(/\/+$/, '')
  // Evita duplicar prefijo cuando los servicios ya usan rutas que empiezan por /api/...
  return noTrailingSlash.replace(/\/api$/i, '')
}

const api = axios.create({
  baseURL: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL),
  timeout: 8000,
})

api.interceptors.request.use((config) => {
  const token = getValidToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      // Optionally redirect to login or clear token
      localStorage.removeItem('token')
    }
    return Promise.reject(err)
  },
)

export default api
