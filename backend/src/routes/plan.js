import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'

export const planRoute = Router()

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

planRoute.post('/', async (req, res) => {
  const { beds, plants } = req.body

  if (!beds?.length || !plants?.length) {
    return res.status(400).json({ error: 'beds and plants are required' })
  }

  const bedsDesc = beds.map((b, i) =>
    `  Bed ${i + 1} (id: "${b.id}"): "${b.name}" — ${describeBed(b)}`
  ).join('\n')

  const totalArea = beds.reduce((sum, b) => sum + bedArea(b), 0)

  const plantDesc = plants.map(p =>
    `- ${p.name} (quantity: ${p.quantity}${p.notes ? `, notes: ${p.notes}` : ''})`
  ).join('\n')

  const prompt = `You are an expert gardener and landscape planner. The user has ${beds.length} garden bed${beds.length > 1 ? 's' : ''} with a total area of approximately ${totalArea.toFixed(1)} square feet:

${bedsDesc}

They want to plant the following:
${plantDesc}

Please generate a detailed, practical garden plan that distributes the plants across the available beds intelligently. Consider the size and shape of each bed, companion planting, sun exposure, and spacing when deciding what goes where.

Respond ONLY with a valid JSON object in this exact shape (no markdown, no explanation outside the JSON):

{
  "plan": {
    "overview": "A short paragraph summarizing the overall plan across all beds.",
    "wateringSchedule": [
      { "plant": "Plant Name", "frequency": "e.g. Every 2-3 days", "amount": "e.g. 1 inch", "notes": "optional tip" }
    ],
    "companionPlanting": [
      "Tip about which plants benefit each other or which to keep apart."
    ],
    "tips": [
      "General gardening tip relevant to these plants and layout."
    ]
  },
  "placements": [
    {
      "plant": "Plant Name",
      "bedId": "the bed id string from above",
      "bedName": "Bed name",
      "quantity": 2,
      "x": 3.0,
      "y": 2.5,
      "location": "e.g. North edge of Bed 1, full sun",
      "spacing": "e.g. 18 inches apart",
      "spacingFt": 1.5,
      "sunlight": "e.g. Full sun",
      "watering": "e.g. Every 2 days",
      "notes": "optional specific note"
    }
  ]
}

For each placement, x and y are positions in feet from the top-left corner of that specific bed (within its bounds). Place plants thoughtfully — taller plants to the north, companions near each other, good spacing. Include one placement entry per distinct plant per bed (if a plant appears in two beds, include two entries). spacingFt is the recommended spacing in feet as a number.

Bed dimensions for reference:
${beds.map(b => {
  const h = b.shape === 'square' ? b.width : (b.height || b.width)
  return `  "${b.id}": width=${b.width}, height=${h} ${b.unit}`
}).join('\n')}`

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = message.content[0].text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Model did not return valid JSON')

    const parsed = JSON.parse(jsonMatch[0])
    res.json(parsed)
  } catch (err) {
    console.error('Plan generation error:', err)
    res.status(500).json({ error: err.message || 'Failed to generate plan' })
  }
})

function describeBed(b) {
  const u = b.unit
  if (b.shape === 'circle') return `circular, ${b.width} ${u} diameter`
  if (b.shape === 'square') return `square, ${b.width} × ${b.width} ${u}`
  if (b.shape === 'l-shape') {
    const nw = b.notchW ?? Math.floor(b.width / 2)
    const nh = b.notchH ?? Math.floor((b.height || b.width) / 2)
    return `L-shaped, overall ${b.width} × ${b.height} ${u}, with a ${nw} × ${nh} ${u} notch cut from the top-right corner`
  }
  return `rectangular, ${b.width} × ${b.height} ${u}`
}

function bedArea(b) {
  if (b.shape === 'circle') return Math.PI * (b.width / 2) ** 2
  const h = b.shape === 'square' ? b.width : (b.height || b.width)
  if (b.shape === 'l-shape') {
    const nw = b.notchW ?? Math.floor(b.width / 2)
    const nh = b.notchH ?? Math.floor(h / 2)
    return b.width * h - nw * nh
  }
  return b.width * h
}
