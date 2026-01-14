package models

import "sync"

type Point struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type Snake struct {
	ID          string  `json:"id"`
	PlayerName  string  `json:"playerName"`
	Color       string  `json:"color"`
	Head        Point   `json:"head"`
	Angle       float64 `json:"angle"`
	TargetAngle float64 `json:"targetAngle"`
	Speed       float64 `json:"speed"`
	Width       float64 `json:"width"`
	Length      float64 `json:"length"`
	Score       int     `json:"score"`
	Boost       bool    `json:"boost"`
	Dead        bool    `json:"dead"`
	Path        []Point `json:"path"`
	
	// Server side only
	Mu sync.RWMutex `json:"-"`
}

type Food struct {
	ID     float64 `json:"id"`
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Color  string  `json:"color"`
	Size   float64 `json:"size"`
	Energy float64 `json:"energy"`
}

type GameState struct {
	Snakes       map[string]*Snake `json:"snakes"`
	Food         []*Food           `json:"food,omitempty"`      // Only newly spawned food in delta updates
	EatenFoodIDs []float64         `json:"eatenFood,omitempty"` // IDs of food eaten in this tick
}
