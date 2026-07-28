# Stage 1: Builder
FROM golang:1.24-alpine AS builder
WORKDIR /app

COPY go.mod go.sum ./
ENV GOTOOLCHAIN=auto
RUN go mod download

COPY . .

# Build production binary with stripped debug symbols (-s -w)
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /server ./cmd/server

# Stage 2: Development Target with Air Hot Reload
FROM golang:1.24-alpine AS dev
WORKDIR /app

# Install Air for hot-reload (dev only, not included in production)
RUN go install github.com/air-verse/air@v1.61.7

COPY go.mod go.sum ./
ENV GOTOOLCHAIN=auto
RUN go mod download

COPY . .
ENV GOCACHE=/tmp/.go-build GOPATH=/tmp/go
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

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["/app/server"]
