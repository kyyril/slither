package engine

import (
	"encoding/json"
	"math"
	"math/rand"

	"sync"
	"time"

	"github.com/user/slither-server/models"
)

const (
	TickRate       = 30
	TickDuration   = time.Second / TickRate
	MapSize        = 1000.0 // Reduced for better player density
	BaseSpeed      = 12.0
	BoostSpeed     = 24.0
	TurnSpeed      = 4.5
	SegmentDist    = 1.5
	StartLength    = 20
	FoodCount      = 5000
	GridCellSize   = 100.0
)

type GameEngine struct {
	Snakes map[string]*models.Snake
	Food   map[float64]*models.Food
	Grid   *SpatialHashGrid
	mu     sync.RWMutex
	
	OnUpdate func(state string) // Callback for broadcasting
	
	// Delta tracking buffers
	tickNewFood   []*models.Food
	tickEatenFood []float64
}

func NewGameEngine(onUpdate func(state string)) *GameEngine {
	e := &GameEngine{
		Snakes:        make(map[string]*models.Snake),
		Food:          make(map[float64]*models.Food),
		Grid:          NewSpatialHashGrid(GridCellSize),
		OnUpdate:      onUpdate,
		tickNewFood:   make([]*models.Food, 0),
		tickEatenFood: make([]float64, 0),
	}
	e.initFood()
	return e
}

func (e *GameEngine) initFood() {
	for i := 0; i < FoodCount; i++ {
		e.spawnFood()
	}
}

func (e *GameEngine) spawnFood() {
	id := rand.Float64()
	colors := []string{"#ffffff", "#ffff00", "#ff00ff", "#00ffff", "#ffaa00", "#00ffcc"}
	
	size := 0.5
	energy := 1.0
	color := colors[rand.Intn(len(colors))]

	// Variance in food size/energy
	r := rand.Float64()
	if r < 0.02 { // 2% Epic food
		size = 1.8
		energy = 8.0
		color = "#ff0055" // Hot neon pink
	} else if r < 0.12 { // 10% Large food
		size = 1.0
		energy = 3.0
	} else if r < 0.3 { // 18% Medium food
		size = 0.7
		energy = 1.5
	}

	f := &models.Food{
		ID:     id,
		X:      (rand.Float64()*2 - 1) * MapSize,
		Y:      (rand.Float64()*2 - 1) * MapSize,
		Color:  color,
		Size:   size,
		Energy: energy,
	}
	e.Food[id] = f
	e.tickNewFood = append(e.tickNewFood, f)
}

func (e *GameEngine) Start() {
	ticker := time.NewTicker(TickDuration)
	go func() {
		for range ticker.C {
			e.Update()
		}
	}()
}

func (e *GameEngine) Update() {
	e.mu.Lock()
	defer e.mu.Unlock()

	dt := 1.0 / float64(TickRate)

	// Reset delta buffers
	e.tickNewFood = e.tickNewFood[:0]
	e.tickEatenFood = e.tickEatenFood[:0]

	e.Grid.Clear()

	// 0. Replenish Food if below count
	missing := FoodCount - len(e.Food)
	for i := 0; i < missing; i++ {
		e.spawnFood()
	}

	// 0.1 Populate Grid for this tick
	for _, food := range e.Food {
		e.Grid.Insert(&gridFood{f: food})
	}
	for _, snake := range e.Snakes {
		e.Grid.Insert(&gridSnake{s: snake})
	}

	// 1. Update Snakes
	for _, snake := range e.Snakes {
		snake.Mu.Lock()
		if snake.Dead {
			snake.Mu.Unlock()
			continue
		}

		// Turn logic
		diff := snake.TargetAngle - snake.Angle
		for diff <= -math.Pi {
			diff += math.Pi * 2
		}
		for diff > math.Pi {
			diff -= math.Pi * 2
		}

		turnAmount := TurnSpeed * dt
		if math.Abs(diff) < turnAmount {
			snake.Angle = snake.TargetAngle
		} else {
			if diff > 0 {
				snake.Angle += turnAmount
			} else {
				snake.Angle -= turnAmount
			}
		}

		// Move Head
		speed := BaseSpeed
		if snake.Boost {
			speed = BoostSpeed
		}
		moveDist := speed * dt

		snake.Head.X += math.Cos(snake.Angle) * moveDist
		snake.Head.Y += math.Sin(snake.Angle) * moveDist

		// Path updates
		snake.Path = append([]models.Point{snake.Head}, snake.Path...)
		// 15 was way too much, making snake 8x longer physically than visually.
		// Visual spacing is width*0.5. Point distance is speed/30.
		// ratio = (width*0.5)/(speed/30) = (1.5*0.5)/(12/30) = 0.75 / 0.4 = 1.875
		maxPathPoints := int(snake.Length * 2.5) 
		if len(snake.Path) > maxPathPoints {
			snake.Path = snake.Path[:maxPathPoints]
		}

		// Circular Boundary Check
		distSq := snake.Head.X*snake.Head.X + snake.Head.Y*snake.Head.Y
		if distSq > MapSize*MapSize {
			snake.Dead = true
			e.reclaimSnake(snake)
		}
		

		
		snake.Mu.Unlock()
	}

	// 2. Food Collision (Optimized with Spatial Hash)
	for _, snake := range e.Snakes {
		snake.Mu.Lock()
		if snake.Dead {
			snake.Mu.Unlock()
			continue
		}

		// Query nearby entities
		queryRadius := snake.Width + 2.0 // Check within a reasonable radius
		nearby := e.Grid.Query(snake.Head.X, snake.Head.Y, queryRadius)
		
		foodToRemove := []float64{}
		for _, entity := range nearby {
			if gf, ok := entity.(*gridFood); ok {
				food := gf.f
				dx := snake.Head.X - food.X
				dy := snake.Head.Y - food.Y
				dist := math.Sqrt(dx*dx + dy*dy)

				if dist < snake.Width+food.Size {
					// Eat the food
					snake.Score += int(food.Energy * 10)
					snake.Length += food.Energy * 0.5
					snake.Width = 1.5 + math.Min(2, snake.Length*0.01)
					foodToRemove = append(foodToRemove, food.ID)
				}
			}
		}

		// Remove eaten food and respawn
		for _, id := range foodToRemove {
			if _, exists := e.Food[id]; exists {
				delete(e.Food, id)
				e.tickEatenFood = append(e.tickEatenFood, id)
				e.spawnFood()
			}
		}
		snake.Mu.Unlock()
	}

	// 3. Snake Collisions (Optimized with Spatial Hash)
	for _, snake := range e.Snakes {
		snake.Mu.Lock()
		if snake.Dead {
			snake.Mu.Unlock()
			continue
		}
		
		// Query nearby entities (snakes)
		queryRadius := snake.Width + 50.0 // Larger radius to covers body segments
		nearby := e.Grid.Query(snake.Head.X, snake.Head.Y, queryRadius)
		
		for _, entity := range nearby {
			if gs, ok := entity.(*gridSnake); ok {
				other := gs.s
				
				// Collision threshold
				threshold := (snake.Width + other.Width) * 0.5
				thresholdSq := threshold * threshold
				
				// Collision with other snake's body
				// Note: We still check the path. In a truly massive scale, 
				// segments themselves would be in the grid, but for 50-100 snakes this is O(1) cell query.
				skipPoints := 18
				for i, p := range other.Path {
					if other.ID == snake.ID && i < skipPoints {
						continue
					}
					
					dx := snake.Head.X - p.X
					dy := snake.Head.Y - p.Y
					distSq := dx*dx + dy*dy
					
					if distSq < thresholdSq {
						snake.Dead = true
						e.reclaimSnake(snake)
						break
					}
				}
			}
			if snake.Dead {
				break
			}
		}
		snake.Mu.Unlock()
	}

	// 4. Cleanup dead snakes
	for id, snake := range e.Snakes {
		if snake.Dead {
			delete(e.Snakes, id)
		}
	}

	// 5. Broadcasting
	if e.OnUpdate != nil {
		// Only send deltas (New Food & Eaten Food)
		// Snakes are sent fully for now as they move every frame
		
		state := models.GameState{
			Snakes:       e.Snakes,
			Food:         e.tickNewFood,
			EatenFoodIDs: e.tickEatenFood,
		}
		data, _ := json.Marshal(state)
		e.OnUpdate(string(data))
	}
}

// GetFullState returns the complete state for new clients
func (e *GameEngine) GetFullState() []byte {
	e.mu.RLock()
	defer e.mu.RUnlock()

	allFood := make([]*models.Food, 0, len(e.Food))
	for _, f := range e.Food {
		allFood = append(allFood, f)
	}

	state := models.GameState{
		Snakes: e.Snakes,
		Food:   allFood,
	}
	data, _ := json.Marshal(state)
	return data
}

func (e *GameEngine) SetPlayerTargetAngle(id string, angle float64) {
	e.mu.RLock()
	defer e.mu.RUnlock()
	if s, ok := e.Snakes[id]; ok {
		s.Mu.Lock()
		s.TargetAngle = angle
		s.Mu.Unlock()
	}
}

func (e *GameEngine) SetPlayerBoost(id string, boost bool) {
	e.mu.RLock()
	defer e.mu.RUnlock()
	if s, ok := e.Snakes[id]; ok {
		s.Mu.Lock()
		s.Boost = boost
		s.Mu.Unlock()
	}
}

func (e *GameEngine) Join(id, name, color string) {
	e.mu.Lock()
	defer e.mu.Unlock()
	
	e.Snakes[id] = &models.Snake{
		ID:          id,
		PlayerName:  name,
		Color:       color,
		Head:        models.Point{X: (rand.Float64() - 0.5) * MapSize * 0.4, Y: (rand.Float64() - 0.5) * MapSize * 0.4},
		Angle:       rand.Float64() * math.Pi * 2,
		TargetAngle: 0,
		Speed:       BaseSpeed,
		Width:       1.5,
		Length:      StartLength,
		Score:       0,
		Boost:       false,
		Dead:        false,
		Path:        []models.Point{},
	}
}

func (e *GameEngine) reclaimSnake(snake *models.Snake) {
	for i, p := range snake.Path {
		// Only spawn food for some segments
		if i%2 == 0 {
			fID := rand.Float64() + float64(i)*0.000001
			e.Food[fID] = &models.Food{
				ID:     fID,
				X:      p.X,
				Y:      p.Y,
				Color:  snake.Color,
				Size:   0.8,
				Energy: 2,
			}
			e.tickNewFood = append(e.tickNewFood, e.Food[fID])
		}
	}
}

func (e *GameEngine) RemoveSnake(id string) {
	e.mu.Lock()
	defer e.mu.Unlock()
	delete(e.Snakes, id)
}



// Helper for grid insertion (Food)
type gridFood struct {
	f *models.Food
}
func (g *gridFood) GetPosition() (x, y float64) { return g.f.X, g.f.Y }
func (g *gridFood) GetID() string              { return "" } // Not needed for queries

// Helper for grid insertion (Snake)
type gridSnake struct {
	s *models.Snake
}
func (g *gridSnake) GetPosition() (x, y float64) { return g.s.Head.X, g.s.Head.Y }
func (g *gridSnake) GetID() string              { return g.s.ID }
