import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import service from '../../services/blueprintService.js'

export const fetchAuthors = createAsyncThunk(
  'blueprints/fetchAuthors',
  async () => {
    const data = await service.getAll()
    const list = Array.isArray(data) ? data : []
    const authors = [...new Set(list.map((bp) => bp.author).filter(Boolean))]
    return authors
  }
)

export const fetchByAuthor = createAsyncThunk(
  'blueprints/fetchByAuthor',
  async (author, { rejectWithValue }) => {
    try {
      const data = await service.getByAuthor(author)
      return { author, items: Array.isArray(data) ? data : [] }
    } catch (err) {
      const status = err?.response?.status
      if (status === 404) {
        return { author, items: [] }
      }
      const msg = err?.response?.data?.message || err?.message || 'No se pudo consultar por autor'
      return rejectWithValue(msg)
    }
  }
)

export const fetchBlueprint = createAsyncThunk(
  'blueprints/fetchBlueprint',
  async ({ author, name }) => {
    const data = await service.getByAuthorAndName(author, name)
    if (!data || typeof data !== 'object') return null
    return {
      ...data,
      points: Array.isArray(data.points) ? data.points : [],
    }
  }
)

export const createBlueprint = createAsyncThunk(
  'blueprints/createBlueprint',
  async (payload, { rejectWithValue }) => {
    try {
      const data = await service.create(payload)
      return data
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'No se pudo crear el blueprint'
      return rejectWithValue(msg)
    }
  }
)

export const updateBlueprint = createAsyncThunk(
  'blueprints/updateBlueprint',
  async (payload, { rejectWithValue }) => {
    try {
      const data = await service.update(payload)
      return data
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'No se pudo actualizar el blueprint'
      return rejectWithValue(msg)
    }
  },
)

export const deleteBlueprint = createAsyncThunk(
  'blueprints/deleteBlueprint',
  async ({ author, name }, { rejectWithValue }) => {
    try {
      await service.remove({ author, name })
      return { author, name }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'No se pudo eliminar el blueprint'
      return rejectWithValue(msg)
    }
  },
)

const slice = createSlice({
  name: 'blueprints',
  initialState: {
    authors: [],
    byAuthor: {},
    current: null,
    status: 'idle',
    error: null,
  },
  reducers: {
    setCurrentBlueprint: (state, action) => {
      state.current = action.payload
    },
    appendPointToCurrent: (state, action) => {
      if (!state.current) return
      if (!Array.isArray(state.current.points)) state.current.points = []
      const last = state.current.points[state.current.points.length - 1]
      if (last?.x === action.payload?.x && last?.y === action.payload?.y) return
      state.current.points.push(action.payload)
    },
    appendPointsToCurrent: (state, action) => {
      if (!state.current) return
      if (!Array.isArray(state.current.points)) state.current.points = []
      const incoming = Array.isArray(action.payload) ? action.payload : []
      for (const p of incoming) {
        const last = state.current.points[state.current.points.length - 1]
        if (last?.x === p?.x && last?.y === p?.y) continue
        state.current.points.push(p)
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAuthors.pending, (s) => {
        s.status = 'loading'
      })
      .addCase(fetchAuthors.fulfilled, (s, a) => {
        s.status = 'succeeded'
        s.authors = a.payload
      })
      .addCase(fetchAuthors.rejected, (s, a) => {
        s.status = 'failed'
        s.error = a.error.message
      })
      .addCase(fetchByAuthor.pending, (s) => {
        s.status = 'loading'
        s.error = null
      })
      .addCase(fetchByAuthor.fulfilled, (s, a) => {
        s.status = 'succeeded'
        s.byAuthor[a.payload.author] = a.payload.items
      })
      .addCase(fetchByAuthor.rejected, (s, a) => {
        s.status = 'failed'
        s.error = a.error.message
      })
      .addCase(fetchBlueprint.pending, (s) => {
        s.status = 'loading'
        s.error = null
      })
      .addCase(fetchBlueprint.fulfilled, (s, a) => {
        s.status = 'succeeded'
        s.current = a.payload
      })
      .addCase(fetchBlueprint.rejected, (s, a) => {
        s.status = 'failed'
        s.error = a.error.message
      })
      .addCase(createBlueprint.fulfilled, (s, a) => {
        const bp = a.payload
        if (s.byAuthor[bp.author]) s.byAuthor[bp.author].push(bp)
      })
      .addCase(createBlueprint.rejected, (s, a) => {
        s.status = 'failed'
        s.error = a.payload || a.error.message
      })
      .addCase(updateBlueprint.fulfilled, (s, a) => {
        s.current = a.payload
        const authorList = s.byAuthor[a.payload.author] || []
        const idx = authorList.findIndex((bp) => bp.name === a.payload.name)
        if (idx >= 0) {
          authorList[idx] = {
            ...authorList[idx],
            totalPoints: a.payload.points?.length || 0,
            points: a.payload.points,
          }
        }
      })
      .addCase(updateBlueprint.rejected, (s, a) => {
        s.status = 'failed'
        s.error = a.payload || a.error.message
      })
      .addCase(deleteBlueprint.fulfilled, (s, a) => {
        const { author, name } = a.payload
        const list = s.byAuthor[author] || []
        s.byAuthor[author] = list.filter((bp) => bp.name !== name)
        if (s.current?.author === author && s.current?.name === name) {
          s.current = null
        }
      })
      .addCase(deleteBlueprint.rejected, (s, a) => {
        s.status = 'failed'
        s.error = a.payload || a.error.message
      })
  },
})

export default slice.reducer
export const { setCurrentBlueprint, appendPointToCurrent, appendPointsToCurrent } = slice.actions