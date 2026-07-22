# Stage 1: Builder & Development Stage
FROM golang:1.24-alpine AS builder
WORKDIR /app

# Install Air for hot-reload in dev mode
RUN go install github.com/air-verse/air@v1.61.7

COPY go.mod go.sum ./
ENV GOTOOLCHAIN=auto
RUN go mod download

COPY . .

# Build production binary with stripped debug symbols (-s -w)
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /server ./cmd/server

# Stage 2: Development Target with Air Hot Reload
FROM builder AS dev
WORKDIR /app
EXPOSE 4000
CMD ["air", "-c", ".air.toml"]

# Stage 3: Minimal Production Runtime
FROM alpine:3.21 AS runner
RUN apk add --no-cache ca-certificates tzdata

RUN addgroup -S appgroup -g 10001 && \
    adduser -S appuser -G appgroup -u 10001

WORKDIR /app
COPY --from=builder /server /app/server
RUN chown -R appuser:appgroup /app

USER appuser
EXPOSE 4000
CMD ["/app/server"]
