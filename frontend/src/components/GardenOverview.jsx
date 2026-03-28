import { useMemo, useRef } from 'react'
import { Stage, Layer, Group, Rect, Line, Circle, Text, Arrow } from 'react-konva'
import './GardenOverview.css'

const CANVAS_W = 580
const CANVAS_H = 500
const PAD = 40          // pixels of padding around all beds
const MIN_SCALE = 10    // px/ft minimum
const MAX_SCALE = 60    // px/ft maximum

const BED_FILL = '#d8f3dc'
const BED_STROKE = '#2d6a4f'
const BED_ACTIVE_STROKE = '#e76f51'
const GRID_COLOR = '#b7dfc5'
const PLANT_COLORS = [
  '#e63946','#f4a261','#2a9d8f','#e9c46a','#264653',
  '#6a4c93','#1982c4','#8ac926','#ff595e','#6a994e'
]

function bedBounds(bed) {
  const h = bed.shape === 'square' ? bed.width : (bed.height || bed.width)
  return { w: bed.width, h }
}

// Compute axis-aligned bounding box of a rotated rectangle
function rotatedAABB(cx, cy, w, h, deg) {
  const r = (deg * Math.PI) / 180
  const cos = Math.abs(Math.cos(r))
  const sin = Math.abs(Math.sin(r))
  return {
    minX: cx - (w * cos + h * sin) / 2,
    minY: cy - (w * sin + h * cos) / 2,
    maxX: cx + (w * cos + h * sin) / 2,
    maxY: cy + (w * sin + h * cos) / 2,
  }
}

function computeScale(beds) {
  if (!beds.length) return 30
  // Find the bounding box across all beds using their current x/y/rotation
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  beds.forEach(bed => {
    const { w, h } = bedBounds(bed)
    const cx = (bed.x ?? 0) + w / 2
    const cy = (bed.y ?? 0) + h / 2
    const aabb = rotatedAABB(cx, cy, w, h, bed.rotation ?? 0)
    minX = Math.min(minX, aabb.minX)
    minY = Math.min(minY, aabb.minY)
    maxX = Math.max(maxX, aabb.maxX)
    maxY = Math.max(maxY, aabb.maxY)
  })
  const rangeX = maxX - minX || 10
  const rangeY = maxY - minY || 10
  const scale = Math.min(
    (CANVAS_W - PAD * 2) / rangeX,
    (CANVAS_H - PAD * 2) / rangeY,
    MAX_SCALE
  )
  return Math.max(scale, MIN_SCALE)
}

function computeOrigin(beds, scale) {
  if (!beds.length) return { ox: PAD, oy: PAD }
  let minX = Infinity, minY = Infinity
  beds.forEach(bed => {
    const { w, h } = bedBounds(bed)
    const cx = (bed.x ?? 0) + w / 2
    const cy = (bed.y ?? 0) + h / 2
    const aabb = rotatedAABB(cx, cy, w, h, bed.rotation ?? 0)
    minX = Math.min(minX, aabb.minX)
    minY = Math.min(minY, aabb.minY)
  })
  return {
    ox: PAD - minX * scale,
    oy: PAD - minY * scale,
  }
}

function BedShape({ bed, scale, isActive, onDragEnd, onClick }) {
  const { w, h } = bedBounds(bed)
  const cx = ((bed.x ?? 0) + w / 2) * scale
  const cy = ((bed.y ?? 0) + h / 2) * scale
  const pw = w * scale
  const ph = h * scale
  const stroke = isActive ? BED_ACTIVE_STROKE : BED_STROKE
  const strokeWidth = isActive ? 2.5 : 1.5

  const shapeProps = {
    fill: BED_FILL,
    stroke,
    strokeWidth,
    shadowColor: isActive ? BED_ACTIVE_STROKE : 'transparent',
    shadowBlur: isActive ? 8 : 0,
  }

  let shape
  if (bed.shape === 'circle') {
    shape = <Circle x={0} y={0} radius={pw / 2} {...shapeProps} />
  } else if (bed.shape === 'l-shape') {
    const nw = (bed.notchW ?? Math.floor(w / 2)) * scale
    const nh = (bed.notchH ?? Math.floor(h / 2)) * scale
    const ox = -pw / 2, oy = -ph / 2
    shape = (
      <Line
        points={[
          ox, oy,
          ox + pw - nw, oy,
          ox + pw - nw, oy + nh,
          ox + pw, oy + nh,
          ox + pw, oy + ph,
          ox, oy + ph,
        ]}
        closed
        {...shapeProps}
      />
    )
  } else {
    shape = <Rect x={-pw / 2} y={-ph / 2} width={pw} height={ph} {...shapeProps} />
  }

  return (
    <Group
      x={cx}
      y={cy}
      rotation={bed.rotation ?? 0}
      draggable
      onClick={onClick}
      onTap={onClick}
      onDragEnd={e => {
        const node = e.target
        // node x/y is now the new center in canvas pixels
        const newCx = node.x() / scale
        const newCy = node.y() / scale
        onDragEnd(newCx - w / 2, newCy - h / 2)
      }}
    >
      {shape}
      <Text
        text={bed.name}
        fontSize={Math.max(10, Math.min(14, scale * 0.8))}
        fill={isActive ? BED_ACTIVE_STROKE : '#2d6a4f'}
        fontStyle="bold"
        align="center"
        verticalAlign="middle"
        width={pw}
        height={ph}
        x={-pw / 2}
        y={-ph / 2}
        listening={false}
      />
    </Group>
  )
}

export default function GardenOverview({ beds, placements, activeBedId, onActivate, onMoveBed }) {
  const scale = useMemo(() => computeScale(beds), [beds])
  const { ox, oy } = useMemo(() => computeOrigin(beds, scale), [beds, scale])

  // Draw grid lines (1 ft apart)
  const gridLines = useMemo(() => {
    const lines = []
    const cols = Math.ceil(CANVAS_W / scale) + 2
    const rows = Math.ceil(CANVAS_H / scale) + 2
    const startX = (ox % scale)
    const startY = (oy % scale)
    for (let i = 0; i <= cols; i++) {
      const x = startX + i * scale
      lines.push(<Line key={`v${i}`} points={[x, 0, x, CANVAS_H]} stroke={GRID_COLOR} strokeWidth={0.5} listening={false} />)
    }
    for (let i = 0; i <= rows; i++) {
      const y = startY + i * scale
      lines.push(<Line key={`h${i}`} points={[0, y, CANVAS_W, y]} stroke={GRID_COLOR} strokeWidth={0.5} listening={false} />)
    }
    return lines
  }, [scale, ox, oy])

  // Plant dots (per placement)
  const plantDots = useMemo(() => {
    if (!placements?.length) return []
    return placements.map((p, i) => {
      const bed = beds.find(b => b.id === p.bedId)
      if (!bed || !p.x || !p.y) return null
      const { w, h } = bedBounds(bed)
      const bedCx = ((bed.x ?? 0) + w / 2) * scale
      const bedCy = ((bed.y ?? 0) + h / 2) * scale
      const rot = ((bed.rotation ?? 0) * Math.PI) / 180
      // Rotate plant position around bed center
      const relX = (p.x - w / 2) * scale
      const relY = (p.y - h / 2) * scale
      const dotX = ox + bedCx + relX * Math.cos(rot) - relY * Math.sin(rot)
      const dotY = oy + bedCy + relX * Math.sin(rot) + relY * Math.cos(rot)
      const r = Math.max(4, (p.spacingFt ?? 1) * scale * 0.3)
      return (
        <Circle
          key={i}
          x={dotX}
          y={dotY}
          radius={r}
          fill={PLANT_COLORS[i % PLANT_COLORS.length]}
          stroke="#fff"
          strokeWidth={1}
          opacity={0.8}
          listening={false}
        />
      )
    }).filter(Boolean)
  }, [placements, beds, scale, ox, oy])

  return (
    <div className="card garden-overview-card">
      <div className="overview-header">
        <div className="section-title" style={{ margin: 0 }}>Garden Overview</div>
        <span className="overview-hint">Drag beds to position them · Use rotate buttons in the editor</span>
      </div>
      <Stage width={CANVAS_W} height={CANVAS_H} style={{ background: '#f0faf3', borderRadius: 6, border: '1px solid #ccc' }}>
        <Layer>
          {/* Grid */}
          {gridLines}

          {/* Beds */}
          {beds.map(bed => (
            <Group key={bed.id} x={ox} y={oy}>
              <BedShape
                bed={bed}
                scale={scale}
                isActive={bed.id === activeBedId}
                onClick={() => onActivate(bed.id)}
                onDragEnd={(x, y) => onMoveBed(bed.id, { x, y })}
              />
            </Group>
          ))}

          {/* Plant dots */}
          {plantDots}

          {/* North arrow */}
          <Arrow
            points={[CANVAS_W - 24, CANVAS_H - 44, CANVAS_W - 24, CANVAS_H - 24]}
            pointerLength={6}
            pointerWidth={6}
            fill="#2d6a4f"
            stroke="#2d6a4f"
            strokeWidth={2}
            listening={false}
          />
          <Text text="N" x={CANVAS_W - 30} y={CANVAS_H - 62} fontSize={12} fill="#2d6a4f" fontStyle="bold" listening={false} />

          {/* Scale bar */}
          <Line points={[PAD, CANVAS_H - 16, PAD + scale, CANVAS_H - 16]} stroke="#2d6a4f" strokeWidth={2} listening={false} />
          <Text text="1 ft" x={PAD + scale + 4} y={CANVAS_H - 22} fontSize={11} fill="#2d6a4f" listening={false} />
        </Layer>
      </Stage>
    </div>
  )
}
