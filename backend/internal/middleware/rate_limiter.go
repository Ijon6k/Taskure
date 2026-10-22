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

// NewRateLimiter creates a rate limiter with the given rate and window duration.
func NewRateLimiter(rate int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		limiters: make(map[string]*clientLimiter),
		rate:     rate,
		window:   window,
	}
}

// Middleware returns the Gin middleware enforcing the rate limit per IP.
func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.ClientIP()
		rl.mu.Lock()
		now := time.Now()

		// Lazy cleanup of expired entries when cache grows, preventing memory & goroutine leaks
		if len(rl.limiters) > 256 {
			for k, v := range rl.limiters {
				if now.After(v.resetAt) {
					delete(rl.limiters, k)
				}
			}
		}

		limiter, exists := rl.limiters[key]
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

var (
	uploadLimiter = NewRateLimiter(60, time.Minute)
	seedLimiter   = NewRateLimiter(10, time.Minute)
)

// UploadRateLimiter is a stricter limiter for file upload endpoints.
func UploadRateLimiter() gin.HandlerFunc {
	return uploadLimiter.Middleware()
}

// SeedRateLimiter is a stricter limiter for the demo-seed endpoint.
func SeedRateLimiter() gin.HandlerFunc {
	return seedLimiter.Middleware()
}
