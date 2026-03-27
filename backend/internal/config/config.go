package config

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Server   ServerConfig    `yaml:"server"`
	Database DatabaseConfig  `yaml:"database"`
	Auth     AuthConfig      `yaml:"auth"`
	Midtrans MidtransConfig  `yaml:"midtrans"`
	Printer  ConnectorConfig `yaml:"printer"`
}

func (cfg *Config) GetBase() string {
	dir, _ := os.Getwd()

	if strings.HasSuffix(dir, "backend") {
		dir = filepath.Join(dir, "..")
	}
	return dir
}

type ConnectorConfig struct {
	Host      string `yaml:"host"`       // connector listen host, default "localhost"
	Port      string `yaml:"port"`       // connector HTTP port, default "8081"
	ServerURL string `yaml:"server_url"` // main server URL
}

type MidtransConfig struct {
	ServerKey   string `yaml:"server_key"`
	ClientKey   string `yaml:"client_key"`
	Environment string `yaml:"environment"` // "sandbox" | "production"
}

type AuthConfig struct {
	JWTSecret        string `yaml:"jwt_secret"`
	TokenExpireHours int    `yaml:"token_expire_hours"`
}

type ServerConfig struct {
	Protocol  string `yaml:"protocol"`
	Host      string `yaml:"host"`
	Port      string `yaml:"port"`
	UploadDir string `yaml:"upload_dir"`
}

func (scfg *ServerConfig) GetBase() string {
	return fmt.Sprintf("%s://%s:%s", scfg.Protocol, scfg.Host, scfg.Port)
}

type DatabaseConfig struct {
	URL  string `yaml:"url"`
	Skip bool   `yaml:"skip"`
}

// defaults used when config.yaml is absent (dev convenience).
var defaults = Config{
	Server: ServerConfig{Host: "0.0.0.0", Port: "8080", UploadDir: "./uploads"},
	Database: DatabaseConfig{
		URL:  "host=localhost user=postgres password=postgres dbname=wargapos port=5432 sslmode=disable",
		Skip: false,
	},
	Auth: AuthConfig{
		JWTSecret:        "change-me-in-production",
		TokenExpireHours: 24,
	},
	Midtrans: MidtransConfig{
		ServerKey:   "",
		ClientKey:   "",
		Environment: "sandbox",
	},
	Printer: ConnectorConfig{
		Host:      "localhost",
		Port:      "8081",
		ServerURL: "https://wargapos-production.up.railway.app",
	},
}

// ProvideAuthConfig is a Wire provider that extracts AuthConfig from Config.
func ProvideAuthConfig(cfg *Config) AuthConfig { return cfg.Auth }

// ProvideMidtransConfig is a Wire provider that extracts MidtransConfig from Config.
func ProvideMidtransConfig(cfg *Config) MidtransConfig { return cfg.Midtrans }

// ProvideConnectorConfig is a Wire provider that extracts ConnectorConfig from Config.
func ProvideConnectorConfig(cfg *Config) ConnectorConfig { return cfg.Printer }

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
	if v := os.Getenv("UPLOAD_DIR"); v != "" {
		cfg.Server.UploadDir = v
	}
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
	if v := os.Getenv("JWT_SECRET"); v != "" {
		cfg.Auth.JWTSecret = v
	}
	if v := os.Getenv("MIDTRANS_SERVER_KEY"); v != "" {
		cfg.Midtrans.ServerKey = v
	}
	if v := os.Getenv("MIDTRANS_CLIENT_KEY"); v != "" {
		cfg.Midtrans.ClientKey = v
	}
	if v := os.Getenv("CONNECTOR_HOST"); v != "" {
		cfg.Printer.Host = v
	}
	if v := os.Getenv("CONNECTOR_PORT"); v != "" {
		cfg.Printer.Port = v
	}
	if v := os.Getenv("CONNECTOR_SERVER_URL"); v != "" {
		cfg.Printer.ServerURL = v
	}
}
