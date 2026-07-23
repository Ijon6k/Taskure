// Package response provides standardized JSON response helpers for Gin handlers.
package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type ErrorResponse struct {
	Error string `json:"error"`
}

type MessageResponse struct {
	Message string `json:"message"`
}

// JSON sends a JSON response with the specified status code and data.
func JSON(c *gin.Context, statusCode int, data interface{}) {
	c.JSON(statusCode, data)
}

// OK sends a 200 OK HTTP response with payload.
func OK(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, data)
}

// Created sends a 201 Created HTTP response with payload.
func Created(c *gin.Context, data interface{}) {
	c.JSON(http.StatusCreated, data)
}

// Message sends a 200 OK HTTP response with a text message payload.
func Message(c *gin.Context, msg string) {
	c.JSON(http.StatusOK, MessageResponse{Message: msg})
}

// Error sends an error HTTP response with the given status code and message.
func Error(c *gin.Context, statusCode int, msg string) {
	c.JSON(statusCode, ErrorResponse{Error: msg})
}

// BadRequest sends a 400 Bad Request error response.
func BadRequest(c *gin.Context, err error) {
	msg := "Invalid request payload"
	if err != nil {
		msg = err.Error()
	}
	Error(c, http.StatusBadRequest, msg)
}

// NotFound sends a 404 Not Found error response.
func NotFound(c *gin.Context, msg string) {
	if msg == "" {
		msg = "Resource not found"
	}
	Error(c, http.StatusNotFound, msg)
}

// InternalServerError sends a 500 Internal Server Error response.
func InternalServerError(c *gin.Context, err error) {
	msg := "An internal server error occurred"
	if err != nil {
		msg = err.Error()
	}
	Error(c, http.StatusInternalServerError, msg)
}
