import { Client } from '@stomp/stompjs'

function getBrokerUrl() {
  const base = import.meta.env.VITE_STOMP_BASE || 'http://localhost:8080'
  const wsBase = base.replace(/^http:\/\//i, 'ws://').replace(/^https:\/\//i, 'wss://')
  return `${wsBase}/ws-blueprints`
}

function topicFor(author, name) {
  return `/topic/blueprints.${author}.${name}`
}

export function createStompClient(handlers = {}) {
  const { onPoint, onStatus, onError } = handlers

  let subscribedTopic = null
  let subscription = null
  let errorSubscription = null

  const client = new Client({
    brokerURL: getBrokerUrl(),
    reconnectDelay: 1500,
    connectHeaders: {
      Authorization: localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '',
    },
    onConnect: () => {
      console.log('STOMP onConnect fired')
      onStatus?.('connected')

      errorSubscription = client.subscribe('/user/queue/errors', (message) => {
        const backendError = message?.body || 'Backend STOMP error'
        onError?.(backendError)
      })

      if (subscribedTopic) {
        subscription = client.subscribe(subscribedTopic, (message) => {
          const payload = JSON.parse(message.body)
          if (payload?.points?.length) onPoint?.(payload.points)
        })
      }
    },
    onWebSocketClose: () => {
      console.log('STOMP onWebSocketClose fired')
      onStatus?.('disconnected')
    },
    onWebSocketError: (error) => {
      console.error('STOMP WebSocket error:', error)
      onError?.(`WebSocket error: ${error?.message || 'Unknown error'}`)
    },
    onStompError: (frame) => {
      console.error('STOMP error frame:', frame)
      const msg = frame?.headers?.message || 'STOMP error'
      onError?.(msg)
    },
  })

  return {
    connect() {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          console.error('STOMP: No JWT token found in localStorage')
          onError?.('No JWT token. Please login first.')
          return
        }

        console.log('STOMP connecting to', getBrokerUrl(), 'with token:', token.substring(0, 20) + '...')
        if (!client.active) {
          onStatus?.('connecting')
          client.activate()
        }
      } catch (err) {
        console.error('STOMP activation error:', err)
        onError?.(`Connection error: ${err.message}`)
      }
    },

    disconnect() {
      if (subscription) {
        subscription.unsubscribe()
        subscription = null
      }
      if (errorSubscription) {
        errorSubscription.unsubscribe()
        errorSubscription = null
      }
      subscribedTopic = null
      if (client.active) client.deactivate()
      onStatus?.('disconnected')
    },

    setRoom(author, name) {
      const nextTopic = topicFor(author, name)
      if (subscribedTopic === nextTopic) return

      console.log('STOMP setRoom', author, name, 'topic:', nextTopic, 'connected:', client.connected)
      subscribedTopic = nextTopic
      if (subscription) {
        subscription.unsubscribe()
        subscription = null
      }
      if (client.connected) {
        subscription = client.subscribe(subscribedTopic, (message) => {
          const payload = JSON.parse(message.body)
          if (payload?.points?.length) onPoint?.(payload.points)
        })
      }
    },

    sendPoint({ author, name, point }) {
      if (!client.connected) {
        console.warn('STOMP not connected, cannot send point')
        return
      }
      console.log('STOMP sendPoint', author, name, point)
      client.publish({
        destination: '/app/draw',
        headers: {
          Authorization: localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '',
        },
        body: JSON.stringify({ author, name, point }),
      })
    },

    isConnected() {
      return client.connected
    },
  }
}
