package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"wargapos/backend/internal/config"
)

func uploadHandler(uploadDir string, authCfg config.AuthConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// 1. Validate JWT
		tokenStr := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		if tokenStr == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		_, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(authCfg.JWTSecret), nil
		})
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		// 2. Parse multipart (max 5 MB)
		if err := r.ParseMultipartForm(5 << 20); err != nil {
			http.Error(w, "file too large or bad request", http.StatusBadRequest)
			return
		}
		file, header, err := r.FormFile("file")
		if err != nil {
			http.Error(w, "missing file field", http.StatusBadRequest)
			return
		}
		defer file.Close()

		// 3. Generate unique filename
		b := make([]byte, 16)
		rand.Read(b)
		ext := strings.ToLower(filepath.Ext(header.Filename))
		filename := hex.EncodeToString(b) + ext

		// 4. Write to disk
		if err := os.MkdirAll(uploadDir, 0755); err != nil {
			http.Error(w, "storage error", http.StatusInternalServerError)
			return
		}
		dst, err := os.Create(filepath.Join(uploadDir, filename))
		if err != nil {
			http.Error(w, "storage error", http.StatusInternalServerError)
			return
		}
		defer dst.Close()
		if _, err := dst.ReadFrom(file); err != nil {
			http.Error(w, "write error", http.StatusInternalServerError)
			return
		}

		// 5. Return public path
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"url": "/uploads/" + filename})
	}
}
