package config

import (
	"log"
	"os"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Server   ServerConfig   `yaml:"server"`
	Database DatabaseConfig `yaml:"database"`
}

type ServerConfig struct {
	Host string `yaml:"host"`
	Port string `yaml:"port"`
}

type DatabaseConfig struct {
	URL  string `yaml:"url"`
	Skip bool   `yaml:"skip"`
}

// defaults used when config.yaml is absent (dev convenience).
var defaults = Config{
	Server: ServerConfig{Host: "0.0.0.0", Port: "8080"},
	Database: DatabaseConfig{
		URL:  "host=localhost user=postgres password=postgres dbname=wargapos port=5432 sslmode=disable",
		Skip: false,
	},
}

// Load reads config.yaml (or CONFIG_PATH env var) and returns a Config.
// If the file is not found, dev defaults are returned so the server can
// start without any setup.
func Load() *Config {
	path := os.Getenv("CONFIG_PATH")
	if path == "" {
		path = "config.yaml"
	}

	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		log.Printf("config: %s not found, using dev defaults", path)
		cfg := defaults
		applyEnv(&cfg)
		return &cfg
	}
	if err != nil {
		log.Fatalf("config: failed to read %s: %v", path, err)
	}

	cfg := defaults // start from defaults so missing keys keep their value
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		log.Fatalf("config: failed to parse config: %v", err)
	}
	applyEnv(&cfg)
	return &cfg
}

// applyEnv overrides config values with environment variables when set.
// This allows Docker / container deployments to configure the server
// without mounting a config file.
func applyEnv(cfg *Config) {
	if v := os.Getenv("DATABASE_URL"); v != "" {
		cfg.Database.URL = v
	}
	if v := os.Getenv("SERVER_HOST"); v != "" {
		cfg.Server.Host = v
	}
	if v := os.Getenv("SERVER_PORT"); v != "" {
		cfg.Server.Port = v
	}
	if v := os.Getenv("DB_SKIP"); v == "1" || v == "true" {
		cfg.Database.Skip = true
	}
}
