package manager

import (
	"context"
	"github.com/redis/go-redis/v9"
	"github.com/user/slither-server/config"
)

const LeaderboardKey = "slither:leaderboard"

type LeaderboardManager struct {
	client *redis.Client
	ctx    context.Context
}

func NewLeaderboardManager() *LeaderboardManager {
	return &LeaderboardManager{
		client: config.RedisClient,
		ctx:    config.Ctx,
	}
}

// UpdateScore updates or adds a player's score to the global leaderboard
func (l *LeaderboardManager) UpdateScore(playerName string, score int) error {
	if l.client == nil {
		return nil
	}
	// ZAdd adds or updates the member's score
	return l.client.ZAdd(l.ctx, LeaderboardKey, redis.Z{
		Score:  float64(score),
		Member: playerName,
	}).Err()
}

// GetTopScores retrieves the top N players from the leaderboard
func (l *LeaderboardManager) GetTopScores(n int64) ([]redis.Z, error) {
	if l.client == nil {
		return []redis.Z{}, nil
	}
	// ZRevRangeWithScores gets the highest scores
	return l.client.ZRevRangeWithScores(l.ctx, LeaderboardKey, 0, n-1).Result()
}
