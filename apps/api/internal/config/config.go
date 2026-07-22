// Package config loads configuration from environment variables.
package config

import (
	"os"
)

// Config holds runtime configuration loaded from env vars.
type Config struct {
	AppEnv        string
	APIHost       string
	APIPort       string
	JWTSecret     string
	JWTExpiryHrs  int
	CORSOrigins   string

	PostgresHost     string
	PostgresPort     string
	PostgresUser     string
	PostgresPassword string
	PostgresDB       string

	RedisHost     string
	RedisPort     string
	RedisPassword string

	MinIOEndpoint  string
	MinIOUser      string
	MinIOPassword  string
	MinIOBucket    string

	OpenAIKey      string
	AnthropicKey   string
}

// Load reads configuration from env vars, falling back to defaults.
func Load() Config {
	return Config{
		AppEnv:       getenv("APP_ENV", "development"),
		APIHost:      getenv("API_HOST", "0.0.0.0"),
		APIPort:      getenv("API_PORT", "4000"),
		JWTSecret:    getenv("JWT_SECRET", "changeme-use-a-long-random-secret-min-32-chars"),
		JWTExpiryHrs: 72,
		CORSOrigins:  getenv("API_CORS_ORIGINS", "http://localhost:3000,http://localhost:8080"),

		PostgresHost:     getenv("POSTGRES_HOST", "localhost"),
		PostgresPort:     getenv("POSTGRES_PORT", "5432"),
		PostgresUser:     getenv("POSTGRES_USER", "kanban"),
		PostgresPassword: getenv("POSTGRES_PASSWORD", "changeme"),
		PostgresDB:       getenv("POSTGRES_DB", "kanban"),

		RedisHost:     getenv("REDIS_HOST", "redis"),
		RedisPort:     getenv("REDIS_PORT", "6379"),
		RedisPassword: getenv("REDIS_PASSWORD", ""),

		MinIOEndpoint: getenv("MINIO_ENDPOINT", "minio:9000"),
		MinIOUser:     getenv("MINIO_ROOT_USER", "minioadmin"),
		MinIOPassword: getenv("MINIO_ROOT_PASSWORD", "minioadmin"),
		MinIOBucket:   getenv("MINIO_BUCKET", "kanban-uploads"),

		OpenAIKey:    getenv("OPENAI_API_KEY", ""),
		AnthropicKey: getenv("ANTHROPIC_API_KEY", ""),
	}
}

// PostgresDSN returns a postgres connection string suitable for GORM.
func (c Config) PostgresDSN() string {
	return "host=" + c.PostgresHost +
		" port=" + c.PostgresPort +
		" user=" + c.PostgresUser +
		" password=" + c.PostgresPassword +
		" dbname=" + c.PostgresDB +
		" sslmode=disable TimeZone=UTC"
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
