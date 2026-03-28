import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'

export const replaceRoute = Router()

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

replaceRoute.post('/', async (req, res) => {
  const { deadPlant, bed, allPlacements, allBeds } = req.body

  if (!deadPlant || !bed) {
    return res.status(400).json({ error: 'deadPlant and bed are required' })
  }

  const neighbours = (allPlacements || [])
    .filter(p => p.bedId === bed.id && p.plant !== deadPlant.plant)
    .map(p => p.plant)
    .join(', ') || 'none'

  const prompt = `A gardener's plant has died and they need a replacement recommendation.

Dead plant: ${deadPlant.plant}
Location: ${deadPlant.location || 'not specified'}
Bed: "${bed.name}" (${bed.shape}, ${bed.width} × ${bed.height || bed.width} ${bed.unit})
Neighbouring plants in this bed: ${neighbours}

Please recommend 2-3 replacement plants that would do well in the same spot, considering:
- Compatibility with the neighbouring plants
- Similar space/sun requirements as the original plant
- The current time of year (late spring / early summer, northern hemisphere)

Respond ONLY with a valid JSON array (no markdown):

[
  {
    "plant": "Plant Name",
    "reason": "One sentence explaining why this is a good replacement.",
    "spacing": "e.g. 12 inches apart",
    "watering": "e.g. Every 2-3 days"
  }
]`

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = message.content[0].text.trim()
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('Model did not return valid JSON')

    res.json({ replacements: JSON.parse(jsonMatch[0]) })
  } catch (err) {
    console.error('Replacement error:', err)
    res.status(500).json({ error: err.message || 'Failed to get replacement recommendation' })
  }
})
