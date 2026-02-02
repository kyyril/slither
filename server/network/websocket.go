package network

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
	"github.com/user/slither-server/config"
	"github.com/user/slither-server/manager"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type Client struct {
	Conn *websocket.Conn
	Send chan []byte
	Room *manager.Room
	ID   string
}

type Hub struct {
	Clients    map[string]*Client
	Register   chan *Client
	Unregister chan *Client
	mu         sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		Clients:    make(map[string]*Client),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
	}
}

func (h *Hub) BroadcastToRoom(roomID string, message []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, client := range h.Clients {
		if client.Room != nil && client.Room.ID == roomID {
			select {
			case client.Send <- message:
			default:
				// If send channel is full, we could drop the client or handle lag
			}
		}
	}
}

func (h *Hub) Run() {
	var ch <-chan *redis.Message
	if config.RedisClient != nil {
		// Subscribe to Redis updates for distributed broadcasting
		pubsub := config.RedisClient.Subscribe(config.Ctx, "game:updates")
		ch = pubsub.Channel()
	}

	for {
		select {
		case msg, ok := <-ch:
			if !ok {
				ch = nil // Stop listening if channel closes
				continue
			}
			// Received update from Redis
			var update map[string]interface{}
			if err := json.Unmarshal([]byte(msg.Payload), &update); err == nil {
				if roomID, ok := update["room_id"].(string); ok {
					h.BroadcastToRoom(roomID, []byte(msg.Payload))
				}
			}
		case client := <-h.Register:
			h.mu.Lock()
			h.Clients[client.ID] = client
			if client.Room != nil {
				client.Room.Players++
				log.Printf("Client %s registered to room %s. Total players: %d", client.ID, client.Room.ID, client.Room.Players)
			}
			h.mu.Unlock()
		case client := <-h.Unregister:
			h.mu.Lock()
			if _, ok := h.Clients[client.ID]; ok {
				if client.Room != nil {
					client.Room.Players--
					log.Printf("Client %s unregistered from room %s. Total players: %d", client.ID, client.Room.ID, client.Room.Players)
					// Also remove snake from engine
					client.Room.Engine.RemoveSnake(client.ID)
				}
				delete(h.Clients, client.ID)
				close(client.Send)
			}
			h.mu.Unlock()
		}
	}
}

func HandleWebSocket(hub *Hub, roomManager *manager.RoomManager, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	roomID := r.URL.Query().Get("room")
	room := roomManager.GetRoom(roomID)
	if room == nil {
		conn.WriteMessage(websocket.TextMessage, []byte(`{"error": "Room not found"}`))
		conn.Close()
		return
	}

	clientID := r.URL.Query().Get("id")
	if clientID == "" {
		clientID = "guest-" + r.RemoteAddr
	}

	c := &Client{
		Conn: conn,
		Send: make(chan []byte, 256),
		Room: room,
		ID:   clientID,
	}

	// Handle player join with random color
	colors := []string{"#00ffcc", "#ff0055", "#ccff00", "#00ccff", "#ffaa00", "#aa00ff"}
	color := colors[int(clientID[0])%len(colors)] // Simple deterministic color based on ID
	c.Room.Engine.Join(c.ID, "Player", color)

	// Send initial full state (so client has all food)
	// Use c.Send to ensure it is the first message processed by writePump
	fullState := c.Room.Engine.GetFullState()
	c.Send <- fullState

	hub.Register <- c

	// Start reading messages
	go c.readPump(hub)
	go c.writePump()
}

func (c *Client) readPump(hub *Hub) {
	defer func() {
		hub.Unregister <- c
		c.Conn.Close()
	}()

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}
		
		var msg map[string]interface{}
		if err := json.Unmarshal(message, &msg); err != nil {
			continue
		}

		// Handle player input (angle, boost)
		if typeStr, ok := msg["type"].(string); ok {
			switch typeStr {
			case "input":
				if angle, ok := msg["angle"].(float64); ok {
					c.Room.Engine.SetPlayerTargetAngle(c.ID, angle)
				}
				if boost, ok := msg["boost"].(bool); ok {
					c.Room.Engine.SetPlayerBoost(c.ID, boost)
				}
			}
		}
	}
}

func (c *Client) writePump() {
	for message := range c.Send {
		c.Conn.WriteMessage(websocket.TextMessage, message)
	}
}
