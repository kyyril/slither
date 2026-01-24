# Slither

<p align="center">
  <img src="https://res.cloudinary.com/da5ggxk01/image/upload/v1769285993/1f759294-4c58-454e-bd9e-39e7b3de8881.png" alt="Slither Gameplay" width="800"/>
</p>

<p align="center">
  <strong>A high-performance, real-time multiplayer snake game demonstrating advanced networking techniques and 3D graphics optimization.</strong>
</p>

<p align="center">
  <a href="#live-demo">Live Demo</a> •
  <a href="#key-technical-achievements">Technical Achievements</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#getting-started">Getting Started</a>
</p>

---

## Live Demo

> **[Play Now](https://slitherrrr.vercel.app)**

**Performance Note**: The live demo backend runs on a **free-tier server** with extremely limited resources:

| Resource | Allocation |
|----------|------------|
| CPU | 0.1 vCPU (Shared) |
| RAM | 512 MB |
| Disk | 2 GB |

Due to these constraints, you may experience:
- Higher latency (100-300ms+ depending on your region)
- Occasional frame drops during peak usage

**For optimal experience**, run the project locally using Docker (see [Getting Started](#getting-started)). The codebase is fully optimized for production-grade hardware.

---

## Key Technical Achievements

This project showcases production-ready solutions to common challenges in real-time multiplayer game development:

### 1. Network Optimization: Delta State Compression

**Problem**: Broadcasting full game state (5000+ food entities × 30 ticks/sec) would consume ~9 MB/s per client.

**Solution**: Implemented **delta compression** - only transmitting state changes:
```go
// Server only sends:
{
  "snakes": { ... },           // Always sent (positions change every tick)
  "food": [ /* NEW food */ ],  // Only newly spawned food
  "eatenFood": [ 0.123, ... ]  // IDs of consumed food for client-side removal
}
```
**Result**: **>95% bandwidth reduction** while maintaining full state consistency.

### 2. Client-Side Prediction (Dead Reckoning)

**Problem**: Network latency causes visible "teleporting" when rendering server-authoritative positions directly.

**Solution**: Implemented client-side **extrapolation** that predicts entity positions based on velocity:
```typescript
// Predict where entity WILL be, not where it WAS
const predictedX = serverPos.x + Math.cos(angle) * speed * predictionTime;
const predictedY = serverPos.y + Math.sin(angle) * speed * predictionTime;

// Smoothly converge to prediction
position.lerp(predicted, smoothingFactor * delta);
```
**Result**: Butter-smooth 60 FPS gameplay even with 200ms+ latency.

### 3. Spatial Hash Grid Collision Detection

**Problem**: Naive O(n²) collision checks between thousands of entities causes server CPU spikes.

**Solution**: Implemented **spatial partitioning** using a hash grid:
```go
// Only check collisions within nearby cells
nearbyEntities := grid.Query(entity.X, entity.Y, radius)
for _, other := range nearbyEntities {
    checkCollision(entity, other)
}
```
**Result**: Collision detection scales to **10,000+ entities** on minimal hardware.

### 4. Mobile-First Rendering Optimization

**Problem**: High-DPI mobile devices (3x-4x pixel ratio) struggle with 3D rendering.

**Solution**: Multi-pronged optimization strategy:
- **DPR Capping**: Maximum 1.5x pixel ratio (vs native 3x-4x)
- **Geometry LOD**: Reduced sphere segments (8×8 body, 12×12 head)
- **Instanced Rendering**: Single draw call for 5000+ food particles

**Result**: Stable 60 FPS on mid-range mobile devices.

---

## Architecture

<p align="center">
  <img src="https://res.cloudinary.com/da5ggxk01/image/upload/v1768419392/3984f6cb-3926-48ac-abd3-e2b6359a284c.png" alt="Slither Architecture" width="800"/>
</p>

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Authoritative Server** | Prevents cheating; server is single source of truth |
| **WebSocket over HTTP** | Enables bi-directional, low-overhead real-time communication |
| **Go for Backend** | Excellent concurrency model (goroutines), minimal memory footprint |
| **React Three Fiber** | Declarative 3D with React's component model, easy state management |
| **Delta Sync** | Critical for bandwidth-constrained mobile/free-tier environments |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Backend** | Go 1.24, Gorilla WebSocket | Authoritative game server, real-time communication |
| **Frontend** | React 19, TypeScript, Vite | UI framework, type safety, fast HMR |
| **Graphics** | Three.js, React Three Fiber, Postprocessing | 3D rendering, bloom effects |
| **Styling** | TailwindCSS | Utility-first responsive design |
| **Deployment** | Docker (Multi-stage Alpine), Vercel, Koyeb (free plan) | Containerization, CDN, backend hosting |

---

## Getting Started

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended)
- Node.js 18+ (for frontend development)
- Go 1.24+ (optional, for backend development without Docker)

### Quick Start (Docker)

```bash
# Clone the repository
git clone https://github.com/kyyril/slither.git
cd slither

# Start backend with Docker
docker compose up -d --build

# Install frontend dependencies and run
npm install
npm run dev
```

Open **http://localhost:5173** to play!

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server listening port | `8080` |
| `VITE_SERVER_URL` | WebSocket server URL (frontend) | `localhost:8080` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `*` |

---

## Project Structure

```
slither/
├── server/                    # Go Backend
│   ├── engine/
│   │   ├── game_engine.go     # Core game loop, physics, delta tracking
│   │   └── spatial_hash.go    # O(1) spatial queries
│   ├── network/
│   │   └── websocket.go       # WebSocket hub, client management
│   ├── manager/
│   │   └── room_manager.go    # Multi-room support
│   ├── models/
│   │   └── game_types.go      # Shared data structures
│   └── main.go                # Entry point, HTTP routes
│
├── src/                       # React Frontend
│   ├── components/
│   │   ├── GameScene.tsx      # Three.js scene, camera, input handling
│   │   ├── Snake.tsx          # Instanced mesh rendering, interpolation
│   │   ├── FoodField.tsx      # 5000+ particle instancing
│   │   └── UI.tsx             # HUD, mobile orientation lock
│   ├── game/
│   │   └── GameEngine.ts      # Singleton state manager, WebSocket client
│   └── App.tsx                # Root component, connection state machine
│
├── Dockerfile                 # Multi-stage production build
├── docker-compose.yml         # Local development orchestration
└── README.md
```

---

## Performance Metrics (Local Environment)

| Metric | Value |
|--------|-------|
| Server Tick Rate | 30 Hz |
| Target Client FPS | 60 FPS |
| Avg Packet Size (Delta) | < 5 KB |
| Max Concurrent Snakes Tested | 50+ |
| Food Entity Count | 5,000 |
| Collision Checks/Tick | O(n) with spatial hash |

---

## Acknowledgments

- [Slither.io](http://slither.io/) - Inspiration for gameplay mechanics
- [Gorilla WebSocket](https://github.com/gorilla/websocket) - Production-grade WebSocket for Go
- [React Three Fiber](https://github.com/pmndrs/react-three-fiber) - Declarative Three.js in React
- [Postprocessing](https://github.com/pmndrs/postprocessing) - Bloom effects

---

## License

MIT License - feel free to use this project for learning or as a portfolio piece.

---

<p align="center">
  <sub>Built by <a href="https://github.com/kyyril">kyyril</a></sub>
</p>
