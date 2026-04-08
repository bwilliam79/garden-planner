# Garden Planner

An AI-powered garden design tool. Define your garden beds, add the plants you want to grow, and generate a complete planting plan — including placement coordinates, companion planting suggestions, and watering schedules — using Claude.

---

## Features

### Garden Beds
- Create multiple beds with custom shapes: rectangle, square, circle, L-shape
- Configure dimensions in feet or inches
- Position and rotate beds on a visual canvas
- Automatic area calculation per bed and total

### Plants
- Add plants with quantity and notes
- Edit or remove plants from your inventory

### AI Plan Generation
- Sends your beds and plant list to Claude
- Returns:
  - Overview strategy for the full garden
  - Specific placement coordinates (x, y in feet) for each plant in each bed
  - Spacing recommendations
  - Companion planting suggestions
  - Watering schedule (frequency and amount per plant)
  - General gardening tips

### Visualization
- Interactive canvas renders all beds with color-coded plant placements
- Scales automatically to fit all beds in view

### Plant Replacement
- Mark a plant as dead and request replacement suggestions
- Claude considers neighboring plants and bed conditions
- Returns 2–3 alternatives with spacing and watering notes

### Plan Management
- Save and load multiple named plans
- Export garden state as JSON
- Import previously exported JSON
- All state persists in the browser (localStorage)

---

## Setup

### Prerequisites
- Docker and Docker Compose
- An [Anthropic API key](https://console.anthropic.com)

### Start

```bash
ANTHROPIC_API_KEY=your-key-here docker compose up -d
```

The app is available at **http://localhost:8091**.

---

## Local Development

**Backend:**
```bash
cd backend
npm install
ANTHROPIC_API_KEY=your-key npm run dev
# Runs on http://localhost:3001
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
# API calls proxy to http://localhost:3001
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/plan` | Generate a garden plan |
| `POST` | `/api/replace` | Get replacement suggestions for a dead plant |

---

## Tech Stack

- **Backend**: Node.js 20, Express, Anthropic SDK (`claude-opus-4-6`)
- **Frontend**: React 18, Vite, Konva (canvas rendering)
- **Deployment**: Docker Compose, Nginx (frontend static serving + API proxy)
