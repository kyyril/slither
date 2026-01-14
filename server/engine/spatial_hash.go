package engine

import (
	"math"
	"sync"
)

type Entity interface {
	GetPosition() (x, y float64)
	GetID() string
}

type SpatialHashGrid struct {
	cellSize float64
	grid     map[int]map[int][]Entity
	mu       sync.RWMutex
}

func NewSpatialHashGrid(cellSize float64) *SpatialHashGrid {
	return &SpatialHashGrid{
		cellSize: cellSize,
		grid:     make(map[int]map[int][]Entity),
	}
}

func (s *SpatialHashGrid) getCellCoords(x, y float64) (int, int) {
	return int(math.Floor(x / s.cellSize)), int(math.Floor(y / s.cellSize))
}

func (s *SpatialHashGrid) Insert(entity Entity) {
	s.mu.Lock()
	defer s.mu.Unlock()

	x, y := entity.GetPosition()
	cx, cy := s.getCellCoords(x, y)

	if s.grid[cx] == nil {
		s.grid[cx] = make(map[int][]Entity)
	}
	s.grid[cx][cy] = append(s.grid[cx][cy], entity)
}

func (s *SpatialHashGrid) Clear() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.grid = make(map[int]map[int][]Entity)
}

func (s *SpatialHashGrid) Query(x, y, radius float64) []Entity {
	s.mu.RLock()
	defer s.mu.RUnlock()

	entities := []Entity{}
	minX, minY := s.getCellCoords(x-radius, y-radius)
	maxX, maxY := s.getCellCoords(x+radius, y+radius)

	for cx := minX; cx <= maxX; cx++ {
		if row, ok := s.grid[cx]; ok {
			for cy := minY; cy <= maxY; cy++ {
				if cell, ok := row[cy]; ok {
					entities = append(entities, cell...)
				}
			}
		}
	}

	return entities
}
