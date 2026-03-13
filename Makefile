PROTO_DIR    := proto
BACKEND_DIR  := backend
FRONTEND_DIR := frontend

.PHONY: help proto-gen proto-lint proto-format backend-tidy backend-build backend-run frontend-install frontend-dev frontend-build build docker-push generate setup migrate-up migrate-down migrate-status migrate-reset

help:
	@grep -E '^[a-zA-Z_-]+:.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?##"}; {printf "  %-20s %s\n", $$1, $$2}'

# Proto
proto-gen: ## Run buf generate (outputs Go to backend/gen, TS to frontend/src/gen)
	cd $(PROTO_DIR) && buf generate

proto-lint: ## Lint all proto files
	cd $(PROTO_DIR) && buf lint

proto-format: ## Format all proto files in place
	cd $(PROTO_DIR) && buf format -w

# Backend
backend-tidy: ## Run go mod tidy
	cd $(BACKEND_DIR) && go mod tidy

backend-build: ## Build the Go server binary to backend/bin/server
	cd $(BACKEND_DIR) && go build -o bin/server ./cmd/server

backend-run: ## Run the Go server (set DB_SKIP=1 to skip DB connection)
	cd $(BACKEND_DIR) && go run ./cmd/server

backend-test: ## Run Go tests
	cd $(BACKEND_DIR) && go test ./...

# Frontend
frontend-install: ## Install npm dependencies
	cd $(FRONTEND_DIR) && npm install

frontend-dev: ## Start Vite dev server on :5173 (proxies API to :8080)
	cd $(FRONTEND_DIR) && npm run dev

frontend-build: ## Production build of the React app (output → backend/cmd/server/static)
	cd $(FRONTEND_DIR) && npm run build

build: frontend-build backend-build ## Build frontend into backend/cmd/server/static, then compile Go binary

docker-push: ## Build Docker image and push to kampretcode/wargapos (TAG=x.y.z for versioned tag)
	bash scripts/docker-push.sh $(if $(TAG),$(TAG),latest)

# Migrations
migrate-up: ## Run all pending migrations
	cd $(BACKEND_DIR) && go run ./cmd/migrate up

migrate-down: ## Roll back the last migration
	cd $(BACKEND_DIR) && go run ./cmd/migrate down

migrate-status: ## Show migration status
	cd $(BACKEND_DIR) && go run ./cmd/migrate status

migrate-reset: ## Roll back all migrations
	cd $(BACKEND_DIR) && go run ./cmd/migrate reset

# Aliases
generate: proto-gen ## Alias for proto-gen

setup: backend-tidy frontend-install ## Install all dependencies
