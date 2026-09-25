// Package config loads configuration from environment variables.
package config

import (
	"os"
	"strconv"
)

// Config holds runtime configuration loaded from env vars.
type Config struct {
	AppEnv       string
	APIHost      string
	APIPort      string
	JWTSecret    string
	JWTExpiryHrs int
	CORSOrigins  string

	PostgresHost     string
	PostgresPort     string
	PostgresUser     string
	PostgresPassword string
	PostgresDB       string

	MinIOEndpoint  string
	MinIOUser      string
	MinIOPassword  string
	MinIOBucket    string
	MinIOPublicURL string
	MinIOUseSSL    bool

	OpenAIKey    string
	AnthropicKey string

	// VariantWorkers is the number of concurrent background image-variant
	// workers. Each holds the decoded bitmap of one image, so keep this small
	// relative to the container memory limit.
	VariantWorkers int
}

// Load reads configuration from env vars, falling back to defaults.
func Load() Config {
	cfg := Config{
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

		MinIOEndpoint:  getenvFirst([]string{"S3_ENDPOINT", "SEAWEEDFS_ENDPOINT", "MINIO_ENDPOINT"}, "seaweedfs:9000"),
		MinIOUser:      getenvFirst([]string{"S3_ACCESS_KEY", "SEAWEEDFS_ACCESS_KEY", "MINIO_ACCESS_KEY", "MINIO_ROOT_USER", "MINIO_USER", "AWS_ACCESS_KEY_ID"}, "seaweedadmin"),
		MinIOPassword:  getenvFirst([]string{"S3_SECRET_KEY", "SEAWEEDFS_SECRET_KEY", "MINIO_SECRET_KEY", "MINIO_ROOT_PASSWORD", "MINIO_PASSWORD", "AWS_SECRET_ACCESS_KEY"}, "seaweedadmin"),
		MinIOBucket:    getenvFirst([]string{"S3_BUCKET", "SEAWEEDFS_BUCKET", "MINIO_BUCKET"}, "kanban-uploads"),
		MinIOPublicURL: getenvFirst([]string{"S3_PUBLIC_URL", "MINIO_PUBLIC_URL"}, "/storage/kanban-uploads"),
		MinIOUseSSL:    getenvFirst([]string{"S3_USE_SSL", "MINIO_USE_SSL"}, "false") == "true",

		OpenAIKey:    getenv("OPENAI_API_KEY", ""),
		AnthropicKey: getenv("ANTHROPIC_API_KEY", ""),

		VariantWorkers: 2,
	}
	if v := os.Getenv("VARIANT_WORKERS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			cfg.VariantWorkers = n
		}
	}
	return cfg
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

// getenv reads an env var, falling back to the given default when unset or empty.
func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// getenvFirst reads the first non-empty value from a list of env vars.
func getenvFirst(keys []string, fallback string) string {
	for _, key := range keys {
		if v := os.Getenv(key); v != "" {
			return v
		}
	}
	return fallback
}
