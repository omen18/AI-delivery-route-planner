# AI Delivery Route Planner — 3D Edition

A visually rich, animated single-page web application for AI graph search route optimization.

## Features

### Visuals & Animation
- **Three.js 3D Graph** — Interactive 3D node-edge graph with drag-to-rotate, scroll-to-zoom
- **Animated Path Traversal** — Watch the algorithm travel node-by-node in 3D space with color reveals
- **Particle Background** — Floating connected particle network across the full page
- **Scroll Reveal Animations** — Sections and cards animate in as you scroll
- **Glowing Nodes & Edges** — Path nodes glow in purple/amber with ring highlights
- **2D Animated Step Demo** — Watch the algorithm visit nodes step-by-step on a 2D canvas

### Algorithms (All 5)
- **BFS** — Breadth-First Search
- **DFS** — Depth-First Search
- **UCS** — Uniform Cost Search / Dijkstra
- **A★** — A* Algorithm with 3D heuristic
- **Greedy Best-First Search**

## How to Run

Open `index.html` in any modern browser. No build step required.

```
ai-route-planner-3d/
├── index.html   — Main page structure
├── style.css    — Dark futuristic theme (Orbitron + Rajdhani fonts)
├── script.js    — Three.js 3D scene + algorithms + 2D animation
└── README.md    — This file
```

## Controls

**3D Graph:**
- Drag to orbit the camera
- Scroll to zoom in/out
- Touch drag on mobile

**3D Demo:**
- Pick algorithm using pill buttons
- Set start/end nodes
- Click "Animate Path" to watch step-by-step

**2D Demo:**
- Adjust animation speed with slider
- Click "Run" to animate
- Click "Reset" to clear

## Technologies
- HTML5 / CSS3
- Vanilla JavaScript (ES6+)
- Three.js r128 (3D graph rendering)
- Google Fonts: Orbitron + Rajdhani
- HTML5 Canvas (2D animation + particles)
