# Build stage
FROM golang:1.24-alpine AS builder
WORKDIR /repo

# Copy monorepo root
COPY package.json ./

# Copy this app
COPY apps/api ./apps/api

WORKDIR /repo/apps/api
ENV GOTOOLCHAIN=auto
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o /server ./cmd/server

# Runtime stage
FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=builder /server /app/server
EXPOSE 4000
CMD ["/app/server"]
