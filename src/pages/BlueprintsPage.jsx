import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  createBlueprint,
  deleteBlueprint,
  fetchAuthors,
  fetchByAuthor,
  fetchBlueprint,
  updateBlueprint,
} from '../features/blueprints/blueprintsSlice.js'
import BlueprintCanvas from '../components/BlueprintCanvas.jsx'
import BlueprintForm from '../components/BlueprintForm.jsx'
import { createStompClient } from '../services/stompClient.js'
import { getValidToken } from '../services/authToken.js'

export default function BlueprintsPage() {
  const dispatch = useDispatch()
  const { byAuthor, current, status, error } = useSelector((s) => s.blueprints)
  const [authorInput, setAuthorInput] = useState('')
  const [selectedAuthor, setSelectedAuthor] = useState('')
  const [rtMode, setRtMode] = useState('none')
  const [rtStatus, setRtStatus] = useState('disconnected')
  const [rtError, setRtError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [authHint, setAuthHint] = useState('')
  const [draftPoints, setDraftPoints] = useState([])
  const [activeBlueprint, setActiveBlueprint] = useState(null)
  const stompRef = useRef(null)
  const rawItems = byAuthor[selectedAuthor]
  const items = Array.isArray(rawItems) ? rawItems : []
  const currentAuthor = (activeBlueprint?.author || current?.author || '').trim()
  const currentName = (activeBlueprint?.name || current?.name || current?.bpname || '').trim()
  const hasCurrentBlueprint = Boolean(currentAuthor && currentName)
  const isAuthenticated = Boolean(getValidToken())
  const canDraw = isAuthenticated && hasCurrentBlueprint
  const canMutateBlueprint = isAuthenticated && hasCurrentBlueprint

  useEffect(() => {
    const token = getValidToken()
    if (!token) {
      setAuthHint('Inicia sesión para consultar y modificar blueprints.')
      setSelectedAuthor('')
      setAuthorInput('')
      setDraftPoints([])
      setActiveBlueprint(null)
      setRtMode('none')
      setRtStatus('disconnected')
      setRtError('')
      return
    }

    setAuthHint('')
    dispatch(fetchAuthors())
  }, [dispatch])

  const totalPoints = useMemo(
    () =>
      items.reduce((acc, bp) => {
        const fromSummary = Number(bp?.totalPoints)
        if (Number.isFinite(fromSummary)) return acc + fromSummary
        return acc + (Array.isArray(bp?.points) ? bp.points.length : 0)
      }, 0),
    [items],
  )

  const getBlueprints = () => {
    if (!isAuthenticated) {
      setActionMessage('Inicia sesión para consultar blueprints.')
      return
    }
    if (!authorInput) return
    setSelectedAuthor(authorInput)
    dispatch(fetchByAuthor(authorInput))
  }

  const openBlueprint = (bp) => {
    if (!isAuthenticated) {
      setActionMessage('Inicia sesión para abrir blueprints.')
      return
    }
    dispatch(fetchBlueprint({ author: bp.author, name: bp.name }))
      .unwrap()
      .then((blueprint) => {
        setActiveBlueprint({
          author: blueprint?.author || bp.author,
          name: blueprint?.name || bp.name,
        })
        setDraftPoints(Array.isArray(blueprint?.points) ? blueprint.points : [])
      })
  }

  const handleCreate = (bp) => {
    if (!isAuthenticated) {
      setActionMessage('Inicia sesión para crear blueprints.')
      return
    }
    setDraftPoints(Array.isArray(bp.points) ? bp.points : [])
    setActiveBlueprint({ author: bp.author, name: bp.name })

    dispatch(createBlueprint(bp)).then((action) => {
      const created = action?.payload
      if (created?.author && created?.name) {
        setActiveBlueprint({ author: created.author, name: created.name })
        setDraftPoints(Array.isArray(created.points) ? created.points : [])
      }
      dispatch(fetchByAuthor(bp.author))
      setSelectedAuthor(bp.author)
      setAuthorInput(bp.author)
    })
  }

  const handleSave = async () => {
    if (!hasCurrentBlueprint) return
    if (!isAuthenticated) {
      setActionMessage('Inicia sesión para guardar cambios.')
      return
    }
    setActionMessage('')
    try {
      await dispatch(
        updateBlueprint({ author: currentAuthor, name: currentName, points: draftPoints }),
      ).unwrap()
      await dispatch(fetchBlueprint({ author: currentAuthor, name: currentName })).unwrap()
      dispatch(fetchByAuthor(currentAuthor))
      setActionMessage('Blueprint actualizado y guardado correctamente.')
    } catch (e) {
      setActionMessage(`Error al guardar: ${String(e)}`)
    }
  }

  const handleDelete = () => {
    if (!hasCurrentBlueprint) return
    if (!isAuthenticated) {
      setActionMessage('Inicia sesión para eliminar blueprints.')
      return
    }
    setActionMessage('')
    dispatch(deleteBlueprint({ author: currentAuthor, name: currentName }))
      .unwrap()
      .then(() => dispatch(fetchByAuthor(currentAuthor)).unwrap())
      .then(() => {
        setDraftPoints([])
        setActiveBlueprint(null)
        setActionMessage('Blueprint eliminado correctamente.')
      })
      .catch((e) => {
        setActionMessage(`Error al eliminar: ${String(e)}`)
      })
  }

  const onCanvasPoint = (point) => {
    if (!hasCurrentBlueprint) {
      setActionMessage('Abre un blueprint antes de dibujar.')
      return
    }

    if (!isAuthenticated) {
      setActionMessage('Inicia sesión para dibujar y usar tiempo real.')
      return
    }

    // Siempre pintamos local para no bloquear UX mientras llega el broadcast.
    setDraftPoints((previous) => [...previous, point])

    if (rtMode === 'stomp' && stompRef.current?.isConnected()) {
      stompRef.current.sendPoint({ author: currentAuthor, name: currentName, point })
    } else if (rtMode === 'stomp') {
      setRtError('STOMP no está conectado. El punto se dibujó localmente.')
    }
  }

  useEffect(() => {
    if (rtMode !== 'stomp') {
      if (stompRef.current) {
        stompRef.current.disconnect()
        stompRef.current = null
      }
      setRtStatus('disconnected')
      return
    }

    if (!isAuthenticated) {
      setRtStatus('disconnected')
      setRtError('Inicia sesión para habilitar STOMP.')
      return
    }

    setRtError('')
    const stomp = createStompClient({
      onStatus: setRtStatus,
      onError: (msg) => setRtError(String(msg || 'STOMP error')),
      onPoint: (points) => {
        setDraftPoints((previous) => {
          const incoming = Array.isArray(points) ? points : []
          if (!incoming.length) return previous
          const next = [...previous]
          for (const p of incoming) {
            const last = next[next.length - 1]
            if (last?.x === p?.x && last?.y === p?.y) continue
            next.push(p)
          }
          return next
        })
      },
    })
    stompRef.current = stomp
    stomp.connect()

    return () => {
      stomp.disconnect()
      stompRef.current = null
    }
  }, [dispatch, rtMode, isAuthenticated])

  useEffect(() => {
    if (rtMode !== 'stomp' || !stompRef.current || !hasCurrentBlueprint) return
    stompRef.current.setRoom(currentAuthor, currentName)
  }, [rtMode, hasCurrentBlueprint, currentAuthor, currentName])

  return (
    <div className="grid" style={{ gridTemplateColumns: '1.1fr 1.4fr', gap: 24 }}>
      <section className="grid" style={{ gap: 16 }}>
        <div className="card">
          <BlueprintForm onSubmit={handleCreate} />
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Blueprints</h2>
          {authHint && <p style={{ color: '#fbbf24', marginTop: 0 }}>{authHint}</p>}
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              className="input"
              placeholder="Author"
              value={authorInput}
              onChange={(e) => setAuthorInput(e.target.value)}
            />
            <button className="btn primary" onClick={getBlueprints}>
              Get blueprints
            </button>
          </div>
          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            <label htmlFor="rt-mode">Real-time</label>
            <select
              id="rt-mode"
              className="input"
              value={rtMode}
              onChange={(e) => setRtMode(e.target.value)}
            >
              <option value="none">None</option>
              <option value="stomp">STOMP</option>
            </select>
            <small>Estado RT: {rtStatus}</small>
            {rtError && <small style={{ color: '#f87171' }}>{rtError}</small>}
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>
            {selectedAuthor ? `${selectedAuthor}'s blueprints:` : 'Results'}
          </h3>
          {status === 'loading' && <p>Cargando...</p>}
          {!items.length && status !== 'loading' && (
            <p>
              Sin resultados. Consulta un autor con blueprints o crea uno nuevo. Luego usa el boton
              "Abrir" para cargarlo en el canvas.
            </p>
          )}
          {status === 'failed' && error && <p style={{ color: '#f87171' }}>{error}</p>}
          {!!items.length && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '8px',
                        borderBottom: '1px solid #334155',
                      }}
                    >
                      Blueprint name
                    </th>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: '8px',
                        borderBottom: '1px solid #334155',
                      }}
                    >
                      Number of points
                    </th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #334155' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((bp) => (
                    <tr key={bp.name}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #1f2937' }}>
                        {bp.name}
                      </td>
                      <td
                        style={{
                          padding: '8px',
                          textAlign: 'right',
                          borderBottom: '1px solid #1f2937',
                        }}
                      >
                        {bp.totalPoints ?? bp.points?.length ?? 0}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #1f2937', textAlign: 'center' }}>
                        <button
                          className="btn primary"
                          onClick={() => openBlueprint(bp)}
                          disabled={!isAuthenticated}
                        >
                          Abrir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p style={{ marginTop: 12, fontWeight: 700 }}>Total user points: {totalPoints}</p>
        </div>
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Current blueprint: {currentName || '—'}</h3>
        {!hasCurrentBlueprint && (
          <p style={{ marginTop: 0, color: '#94a3b8' }}>
            Selecciona un blueprint con el boton "Abrir" para cargar y visualizar sus puntos en el
            canvas.
          </p>
        )}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button className="btn primary" onClick={handleSave} disabled={!canMutateBlueprint}>
            Save/Update
          </button>
          <button className="btn danger" onClick={handleDelete} disabled={!canMutateBlueprint}>
            Delete
          </button>
        </div>
        {error && <p style={{ color: '#f87171' }}>{error}</p>}
        {!!actionMessage && (
          <p style={{ color: actionMessage.startsWith('Error') ? '#f87171' : '#4ade80' }}>
            {actionMessage}
          </p>
        )}
        <BlueprintCanvas
          points={Array.isArray(draftPoints) ? draftPoints : []}
          onPointAdd={canDraw ? onCanvasPoint : undefined}
        />
        <p style={{ marginTop: 8, color: '#94a3b8' }}>
          Haz clic sobre el canvas para agregar puntos. Con 1 punto verás un punto; desde el 2do se dibuja la línea.
        </p>
        <p style={{ marginBottom: 0, color: '#94a3b8' }}>
          Puntos actuales: {Array.isArray(draftPoints) ? draftPoints.length : 0}
        </p>
      </section>
    </div>
  )
}
