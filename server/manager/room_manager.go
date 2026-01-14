package manager

import (
	"sync"
	"github.com/user/slither-server/engine"
)

type Room struct {
	ID      string             `json:"ID"`
	Engine  *engine.GameEngine `json:"-"`
	Players int                `json:"Players"`
}

type RoomManager struct {
	Rooms map[string]*Room
	mu    sync.RWMutex
}

func NewRoomManager() *RoomManager {
	return &RoomManager{
		Rooms: make(map[string]*Room),
	}
}

func (rm *RoomManager) CreateRoom(id string, onUpdate func(state string)) *Room {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	r := &Room{
		ID:     id,
		Engine: engine.NewGameEngine(onUpdate),
	}
	r.Engine.Start()
	rm.Rooms[id] = r
	return r
}

func (rm *RoomManager) GetRoom(id string) *Room {
	rm.mu.RLock()
	defer rm.mu.RUnlock()
	return rm.Rooms[id]
}

func (rm *RoomManager) ListRooms() []*Room {
	rm.mu.RLock()
	defer rm.mu.RUnlock()
	
	list := make([]*Room, 0, len(rm.Rooms))
	for _, r := range rm.Rooms {
		list = append(list, r)
	}
	return list
}
