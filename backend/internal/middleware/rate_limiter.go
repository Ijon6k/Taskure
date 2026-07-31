package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type RateLimiter struct {
	mu       sync.Mutex
	limiters map[string]*clientLimiter
	rate     int           // requests allowed
	window   time.Duration // per window duration
}

type clientLimiter struct {
	count   int
	resetAt time.Time
}

func NewRateLimiter(rate int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		limiters: make(map[string]*clientLimiter),
		rate:     rate,
		window:   window,
	}
	// Cleanup goroutine
	go func() {
		for {
			time.Sleep(window)
			rl.mu.Lock()
			now := time.Now()
			for k, v := range rl.limiters {
				if now.After(v.resetAt) {
					delete(rl.limiters, k)
				}
			}
			rl.mu.Unlock()
		}
	}()
	return rl
}

func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.ClientIP()
		rl.mu.Lock()
		limiter, exists := rl.limiters[key]
		now := time.Now()
		if !exists || now.After(limiter.resetAt) {
			rl.limiters[key] = &clientLimiter{count: 1, resetAt: now.Add(rl.window)}
			rl.mu.Unlock()
			c.Next()
			return
		}
		limiter.count++
		if limiter.count > rl.rate {
			rl.mu.Unlock()
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded. Try again later.",
			})
			return
		}
		rl.mu.Unlock()
		c.Next()
	}
}

func UploadRateLimiter() gin.HandlerFunc {
	return NewRateLimiter(60, time.Minute).Middleware()
}

func SeedRateLimiter() gin.HandlerFunc {
	return NewRateLimiter(10, time.Minute).Middleware()
}
