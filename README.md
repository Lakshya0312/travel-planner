# AI Travel Planner

A full-stack AI travel planning app powered by Claude.

## Prerequisites
- Node.js 18+ (download from https://nodejs.org)
- An Anthropic API key (get one from https://console.anthropic.com)

## Setup & Run

### 1. Install dependencies
```bash
npm install
```

### 2. Add your API key
```bash
# Copy the example env file
cp .env.example .env

# Open .env and replace with your actual key:
# ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Start the app
```bash
npm run dev
```

This starts both:
- **Backend** (Express) on http://localhost:3001
- **Frontend** (React/Vite) on http://localhost:5173

Open http://localhost:5173 in your browser.

## Project Structure
```
travel-planner/
├── server.js          # Express backend (proxies Anthropic API calls)
├── src/
│   ├── main.jsx       # React entry point
│   └── App.jsx        # Main app component
├── index.html
├── vite.config.js
├── package.json
└── .env               # Your API key (never commit this!)
```

## How it works
- The React frontend sends trip details to `/api/claude`
- The Express backend adds your secret API key and forwards to Anthropic
- Your API key is never exposed to the browser
