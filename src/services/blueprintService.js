import api from './apiClient.js'
import apimock from './apimock.js'

const useMock = import.meta.env.VITE_USE_MOCK === 'true'
const basePath = import.meta.env.VITE_BLUEPRINTS_PATH || '/api/v3/blueprints'

function unwrap(responseData) {
  if (responseData && typeof responseData === 'object' && 'data' in responseData) {
    return responseData.data
  }
  return responseData
}

const service = {
  getAll: async () => {
    if (useMock) return apimock.getAll()
    const { data } = await api.get(basePath)
    return unwrap(data)
  },

  getByAuthor: async (author) => {
    if (useMock) return apimock.getByAuthor(author)
    const { data } = await api.get(`${basePath}?author=${encodeURIComponent(author)}`)
    return unwrap(data)
  },

  getByAuthorAndName: async (author, name) => {
    if (useMock) return apimock.getByAuthorAndName(author, name)
    const { data } = await api.get(
      `${basePath}/${encodeURIComponent(author)}/${encodeURIComponent(name)}`
    )
    return unwrap(data)
  },

  create: async (blueprint) => {
    if (useMock) return apimock.create(blueprint)
    const { data } = await api.post(basePath, blueprint)
    return unwrap(data)
  },

  update: async ({ author, name, points }) => {
    if (useMock) {
      return { author, name, points }
    }
    const { data } = await api.put(
      `${basePath}/${encodeURIComponent(author)}/${encodeURIComponent(name)}`,
      { points },
    )
    return unwrap(data)
  },

  remove: async ({ author, name }) => {
    if (useMock) {
      return true
    }
    await api.delete(`${basePath}/${encodeURIComponent(author)}/${encodeURIComponent(name)}`)
    return true
  },
}

export default service