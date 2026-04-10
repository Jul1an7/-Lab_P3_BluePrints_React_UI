import { Client } from '@stomp/stompjs'

let client = null
let subscriptions = new Map()

const getToken = () => localStorage.getItem('token')

export const connectWebSocket = () => {
  return new Promise((resolve, reject) => {
    if (client && client.active) {
      resolve(client)
      return
    }

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'
    const serverUrl = apiBaseUrl.replace(/\/api$/, '')
    const wsUrl = `${serverUrl}/ws-blueprints`
    const wsProtocol = wsUrl.startsWith('https') ? 'wss' : 'ws'
    const wsUrlFinal = wsUrl.replace(/^https?/, wsProtocol)

    const token = getToken()
    if (!token) {
      reject(new Error('No JWT token found. Please login first.'))
      return
    }

    client = new Client({
      brokerURL: wsUrlFinal,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      onConnect: () => {
        console.log('WebSocket connected')
        resolve(client)
      },
      onDisconnect: () => {
        console.log('WebSocket disconnected')
      },
      onStompError: (error) => {
        console.error('STOMP error:', error)
        reject(error)
      },
      onWebSocketError: (error) => {
        console.error('WebSocket error:', error)
        reject(error)
      },
      onWebSocketClose: () => {
        console.log('WebSocket closed')
        client = null
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    })

    client.activate()
  })
}

export const subscribeToBlueprint = (author, name, onMessage) => {
  if (!client || !client.active) {
    console.error('WebSocket not connected')
    return null
  }

  const key = `${author}/${name}`

  // Unsubscribe if already subscribed
  if (subscriptions.has(key)) {
    subscriptions.get(key).unsubscribe()
  }

  const subscription = client.subscribe(
    `/topic/blueprints.${author}.${name}`,
    (message) => {
      try {
        const data = JSON.parse(message.body)
        onMessage(data)
      } catch (err) {
        console.error('Error parsing WebSocket message:', err)
      }
    },
    { id: key }
  )

  subscriptions.set(key, subscription)
  return subscription
}

export const unsubscribeFromBlueprint = (author, name) => {
  const key = `${author}/${name}`
  if (subscriptions.has(key)) {
    subscriptions.get(key).unsubscribe()
    subscriptions.delete(key)
  }
}

export const sendDrawPoint = (author, name, x, y) => {
  if (!client || !client.active) {
    console.error('WebSocket not connected')
    return
  }

  client.publish({
    destination: '/app/draw',
    body: JSON.stringify({
      author,
      name,
      point: { x, y },
    }),
  })
}

export const disconnectWebSocket = () => {
  subscriptions.forEach((sub) => {
    try {
      sub.unsubscribe()
    } catch (err) {
      console.warn('Error unsubscribing:', err)
    }
  })
  subscriptions.clear()

  if (client && client.active) {
    client.deactivate()
  }
  client = null
}

export const isWebSocketConnected = () => {
  return client && client.active
}
