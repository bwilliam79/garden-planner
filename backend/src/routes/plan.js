import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'

export const planRoute = Router()

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

planRoute.post('/', async (req, res) => {
  const { garden, plants } = req.body

  if (!garden || !plants?.length) {
    return res.status(400).json({ error: 'garden and plants are required' })
  }

  const gardenDesc = describeGarden(garden)
  const plantDesc = plants.map(p =>
    `- ${p.name} (quantity: ${p.quantity}${p.notes ? `, notes: ${p.notes}` : ''})`
  ).join('\n')

  const prompt = `You are an expert gardener and landscape planner. The user has a garden with the following layout:

${gardenDesc}

They want to plant the following:
${plantDesc}

Please generate a detailed, practical garden plan. Respond ONLY with a valid JSON object in this exact shape (no markdown, no explanation outside the JSON):

{
  "plan": {
    "overview": "A short paragraph summarizing the overall plan and any key advice.",
    "wateringSchedule": [
      { "plant": "Plant Name", "frequency": "e.g. Every 2-3 days", "amount": "e.g. 1 inch", "notes": "optional tip" }
    ],
    "companionPlanting": [
      "Tip about which plants benefit each other or which to keep apart."
    ],
    "tips": [
      "General gardening tip relevant to these plants and this layout."
    ]
  },
  "placements": [
    {
      "plant": "Plant Name",
      "quantity": 2,
      "x": 3.0,
      "y": 2.5,
      "location": "e.g. North edge, gets full sun",
      "spacing": "e.g. 18 inches apart",
      "spacingFt": 1.5,
      "sunlight": "e.g. Full sun",
      "watering": "e.g. Every 2 days",
      "notes": "optional specific note"
    }
  ]
}

For placements, x and y are positions in ${garden.unit} from the top-left corner of the garden, within the garden bounds (width: ${garden.width}, height: ${garden.shape === 'square' ? garden.width : (garden.height || garden.width)} ${garden.unit}). Place plants thoughtfully — taller plants to the north, companions near each other, good spacing. Include one placement entry per distinct plant (not per individual plant instance). spacingFt is the recommended spacing in feet as a number.`

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = message.content[0].text.trim()

    // Extract JSON even if model wraps it in backticks
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Model did not return valid JSON')

    const parsed = JSON.parse(jsonMatch[0])
    res.json(parsed)
  } catch (err) {
    console.error('Plan generation error:', err)
    res.status(500).json({ error: err.message || 'Failed to generate plan' })
  }
})

function describeGarden(g) {
  const u = g.unit
  if (g.shape === 'circle') return `Circular garden, ${g.width} ${u} diameter`
  if (g.shape === 'square') return `Square garden, ${g.width} × ${g.width} ${u}`
  if (g.shape === 'l-shape') {
    const nw = g.notchW ?? Math.floor(g.width / 2)
    const nh = g.notchH ?? Math.floor(g.height / 2)
    return `L-shaped garden, overall ${g.width} × ${g.height} ${u}, with a ${nw} × ${nh} ${u} notch cut from the top-right corner`
  }
  return `Rectangular garden, ${g.width} × ${g.height} ${u}`
}
