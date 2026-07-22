# Build stage
FROM golang:1.24-alpine AS builder
WORKDIR /app

# Copy module files and download dependencies
COPY go.mod go.sum ./
ENV GOTOOLCHAIN=auto
RUN go mod download

# Copy source code and build Go binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /server ./cmd/server

# Runtime stage
FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=builder /server /app/server
EXPOSE 4000
CMD ["/app/server"]
