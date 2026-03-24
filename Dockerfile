# Stage 1: Build frontend
FROM node:24-alpine AS frontend
WORKDIR /workspace
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci
COPY frontend/ ./frontend/
# vite outDir is ../backend/cmd/server/static, so output lands at /workspace/backend/cmd/server/static
RUN cd frontend && npm run build

# Stage 2: Build Go binary (with embedded static files)
FROM golang:1.25-alpine AS backend
WORKDIR /workspace
COPY backend/go.mod backend/go.sum ./backend/
RUN cd backend && go mod download
COPY backend/ ./backend/
# Bring in the frontend build output so //go:embed static picks it up
COPY --from=frontend /workspace/backend/cmd/server/static ./backend/cmd/server/static/
RUN cd backend && go build -o /app/server ./cmd/server

# Stage 3: Minimal runtime image
FROM alpine:3.21
RUN apk add --no-cache ca-certificates postgresql-client \
    && mkdir -p /app/bin \
    && ln -s /usr/bin/pg_dump /app/bin/pg_dump \
    && ln -s /usr/bin/psql    /app/bin/psql
WORKDIR /app
COPY --from=backend /app/server /app/server
EXPOSE 8080
ENTRYPOINT ["/app/server"]
