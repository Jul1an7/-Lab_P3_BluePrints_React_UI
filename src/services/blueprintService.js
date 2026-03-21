import api from './apiClient.js'
import apimock from './apimock.js'

const useMock = import.meta.env.VITE_USE_MOCK === 'true'

const service = {
  getAll: async () => {
    if (useMock) return apimock.getAll()
    const { data } = await api.get('/blueprints')
    return data
  },

  getByAuthor: async (author) => {
    if (useMock) return apimock.getByAuthor(author)
    const { data } = await api.get(`/blueprints/${encodeURIComponent(author)}`)
    return data
  },

  getByAuthorAndName: async (author, name) => {
    if (useMock) return apimock.getByAuthorAndName(author, name)
    const { data } = await api.get(
      `/blueprints/${encodeURIComponent(author)}/${encodeURIComponent(name)}`
    )
    return data
  },

  create: async (blueprint) => {
    if (useMock) return apimock.create(blueprint)
    const { data } = await api.post('/blueprints', blueprint)
    return data
  },
}

export default service