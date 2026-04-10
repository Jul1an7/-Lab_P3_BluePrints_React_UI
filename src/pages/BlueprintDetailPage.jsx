import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'
import { fetchBlueprint, appendPointsToCurrent } from '../features/blueprints/blueprintsSlice.js'
import BlueprintCanvas from '../components/BlueprintCanvas.jsx'
import {
  connectWebSocket,
  subscribeToBlueprint,
  unsubscribeFromBlueprint,
  sendDrawPoint,
  disconnectWebSocket,
  isWebSocketConnected,
} from '../services/websocketService.js'

export default function BlueprintDetailPage() {
  const { author, name } = useParams()
  const dispatch = useDispatch()
  const bp = useSelector((s) => s.blueprints.current)

  useEffect(() => {
    dispatch(fetchBlueprint({ author, name }))
  }, [author, name, dispatch])

  useEffect(() => {
    const setupWebSocket = async () => {
      try {
        await connectWebSocket()
        subscribeToBlueprint(author, name, (broadcast) => {
          if (broadcast.points && Array.isArray(broadcast.points)) {
            dispatch(appendPointsToCurrent(broadcast.points))
          }
        })
      } catch (err) {
        console.error('Failed to connect WebSocket:', err)
      }
    }

    if (author && name) {
      setupWebSocket()
    }

    return () => {
      unsubscribeFromBlueprint(author, name)
    }
  }, [author, name, dispatch])

  const handlePointAdd = (point) => {
    if (isWebSocketConnected()) {
      sendDrawPoint(author, name, point.x, point.y)
    } else {
      console.warn('WebSocket not connected')
    }
  }

  if (!bp)
    return (
      <div className="card">
        <p>Cargando...</p>
      </div>
    )

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>{bp.name}</h2>
      <p>
        <strong>Autor:</strong> {bp.author}
      </p>
      <p>
        <strong>Puntos:</strong> {bp.points?.length || 0}
      </p>
      <BlueprintCanvas
        points={bp.points || []}
        width={520}
        height={360}
        onPointAdd={handlePointAdd}
      />
    </div>
  )
}
