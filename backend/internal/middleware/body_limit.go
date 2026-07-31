package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// MaxBodySize returns a middleware that limits the request body size.
func MaxBodySize(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		c.Next()
	}
}
