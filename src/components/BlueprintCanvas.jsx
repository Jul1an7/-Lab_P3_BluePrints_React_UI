import { useEffect, useRef } from 'react'

export default function BlueprintCanvas({ points = [], width = 520, height = 360, onPointAdd }) {
  const ref = useRef(null)

  const drawCanvas = (canvas, renderPoints) => {
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#0b1220'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = 'rgba(148,163,184,0.15)'
    ctx.lineWidth = 1

    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    if (renderPoints.length > 1) {
      ctx.strokeStyle = '#93c5fd'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(renderPoints[0].x, renderPoints[0].y)
      for (let i = 1; i < renderPoints.length; i++) {
        const p = renderPoints[i]
        ctx.lineTo(p.x, p.y)
      }
      ctx.stroke()
    }

    ctx.fillStyle = '#f59e0b'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    for (const p of renderPoints) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  }

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    drawCanvas(canvas, Array.isArray(points) ? points : [])
  }, [points])

  const handleClick = (event) => {
    if (!onPointAdd || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const scaleX = ref.current.width / rect.width
    const scaleY = ref.current.height / rect.height
    const x = Math.round((event.clientX - rect.left) * scaleX)
    const y = Math.round((event.clientY - rect.top) * scaleY)

    onPointAdd({ x, y })
  }

  return (
    <canvas
      id="blueprint-canvas"
      ref={ref}
      onClick={handleClick}
      width={width}
      height={height}
      style={{
        background: '#0b1220',
        border: '1px solid #334155',
        borderRadius: 12,
        width: '100%',
        maxWidth: width,
        cursor: onPointAdd ? 'crosshair' : 'default',
      }}
    />
  )
}
