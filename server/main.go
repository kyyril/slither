package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/user/slither-server/manager"
	"github.com/user/slither-server/network"
)

func main() {
	hub := network.NewHub()
	go hub.Run()

	roomManager := manager.NewRoomManager()

	// Initialize default rooms
	defaultRooms := []string{"Main Arena", "Shadow Realm", "Zen Garden"}
	for _, name := range defaultRooms {
		roomName := name
		roomManager.CreateRoom(roomName, func(state string) {
			hub.BroadcastToRoom(roomName, []byte(state))
		})
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		allowedOrigins = "*"
	}

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		network.HandleWebSocket(hub, roomManager, w, r)
	})

	http.HandleFunc("/rooms", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", allowedOrigins)
		w.Header().Set("Content-Type", "application/json")
		rooms := roomManager.ListRooms()
		
		// Update player counts from engine state
		for _, room := range rooms {
			room.Players = len(room.Engine.Snakes)
		}

		if err := json.NewEncoder(w).Encode(rooms); err != nil {
			log.Printf("Error encoding rooms: %v", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	})

	log.Printf("Server starting on :%s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}
