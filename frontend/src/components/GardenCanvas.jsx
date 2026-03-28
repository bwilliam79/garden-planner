import { useRef, useEffect } from 'react'
import './GardenCanvas.css'

const CANVAS_SIZE = 560
const PADDING = 30

// Map a colour name/string to a pastel for plant dots
const PLANT_COLORS = [
  '#e63946','#f4a261','#2a9d8f','#e9c46a','#264653',
  '#6a4c93','#1982c4','#8ac926','#ff595e','#6a994e'
]

export default function GardenCanvas({ garden, placements, plan }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    draw(ctx, garden, placements, plan)
  }, [garden, placements, plan])

  return (
    <div className="card canvas-wrapper">
      <div className="section-title">Garden Preview</div>
      <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="garden-canvas" />
      {placements?.length > 0 && (
        <div className="canvas-legend">
          {placements.map((p, i) => (
            <div key={i} className="legend-item">
              <span className="legend-dot" style={{ background: PLANT_COLORS[i % PLANT_COLORS.length] }} />
              {p.plant}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function draw(ctx, garden, placements, plan) {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  const { shape, width, height, unit, notchW, notchH } = garden
  const effectiveH = shape === 'square' || shape === 'circle' ? width : (height || width)
  const notchWv = notchW ?? Math.floor(width / 2)
  const notchHv = notchH ?? Math.floor(effectiveH / 2)

  // Scale to fit canvas
  const scale = Math.min(
    (CANVAS_SIZE - PADDING * 2) / width,
    (CANVAS_SIZE - PADDING * 2) / effectiveH
  )
  const pw = width * scale
  const ph = effectiveH * scale
  const ox = (CANVAS_SIZE - pw) / 2
  const oy = (CANVAS_SIZE - ph) / 2

  // Draw grid
  ctx.strokeStyle = '#e0ede6'
  ctx.lineWidth = 0.5
  const gridStep = scale
  for (let x = ox; x <= ox + pw; x += gridStep) {
    ctx.beginPath(); ctx.moveTo(x, oy); ctx.lineTo(x, oy + ph); ctx.stroke()
  }
  for (let y = oy; y <= oy + ph; y += gridStep) {
    ctx.beginPath(); ctx.moveTo(ox, y); ctx.lineTo(ox + pw, y); ctx.stroke()
  }

  // Draw garden shape
  ctx.save()
  ctx.fillStyle = '#e8f5e9'
  ctx.strokeStyle = '#2d6a4f'
  ctx.lineWidth = 2

  if (shape === 'circle') {
    const cx = ox + pw / 2, cy = oy + ph / 2
    ctx.beginPath()
    ctx.ellipse(cx, cy, pw / 2, ph / 2, 0, 0, Math.PI * 2)
    ctx.fill(); ctx.stroke()
  } else if (shape === 'l-shape') {
    const nw = notchWv * scale
    const nh = notchHv * scale
    ctx.beginPath()
    ctx.moveTo(ox, oy)
    ctx.lineTo(ox + pw - nw, oy)
    ctx.lineTo(ox + pw - nw, oy + nh)
    ctx.lineTo(ox + pw, oy + nh)
    ctx.lineTo(ox + pw, oy + ph)
    ctx.lineTo(ox, oy + ph)
    ctx.closePath()
    ctx.fill(); ctx.stroke()
  } else {
    ctx.beginPath()
    ctx.rect(ox, oy, pw, ph)
    ctx.fill(); ctx.stroke()
  }
  ctx.restore()

  // Draw dimension labels
  ctx.fillStyle = '#2d6a4f'
  ctx.font = '12px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText(`${width} ${unit}`, ox + pw / 2, oy - 8)
  ctx.save()
  ctx.translate(ox - 10, oy + ph / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText(`${effectiveH} ${unit}`, 0, 0)
  ctx.restore()

  // Draw placements
  if (placements?.length > 0) {
    placements.forEach((p, i) => {
      if (!p.x || !p.y) return
      const cx = ox + (p.x / width) * pw
      const cy = oy + (p.y / effectiveH) * ph
      const r = Math.max(6, (p.spacingFt ?? 1) * scale * 0.35)

      ctx.save()
      ctx.globalAlpha = 0.75
      ctx.fillStyle = PLANT_COLORS[i % PLANT_COLORS.length]
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.restore()

      // Label
      ctx.fillStyle = '#1b1b1b'
      ctx.font = 'bold 10px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText(p.plant.split(' ')[0], cx, cy + r + 11)
    })
  }
}
