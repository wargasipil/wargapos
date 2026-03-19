package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"wargapos/backend/internal/config"
	"wargapos/backend/internal/models"
)

type setupNeededResponse struct {
	Needed bool `json:"needed"`
}

type setupRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type setupResponse struct {
	Token string `json:"token"`
}

// setupNeededHandler returns {"needed": true} when no users exist yet.
func setupNeededHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var count int64
		if err := db.Model(&models.User{}).Count(&count).Error; err != nil {
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(setupNeededResponse{Needed: count == 0})
	}
}

// setupHandler creates the first admin user. Returns 409 if users already exist.
func setupHandler(db *gorm.DB, authCfg config.AuthConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Only accept when no users exist
		var count int64
		if err := db.Model(&models.User{}).Count(&count).Error; err != nil {
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		if count > 0 {
			http.Error(w, "setup already completed", http.StatusConflict)
			return
		}

		var req setupRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}
		req.Username = strings.TrimSpace(req.Username)
		if req.Username == "" || len(req.Password) < 6 {
			http.Error(w, "username required and password must be at least 6 characters", http.StatusBadRequest)
			return
		}

		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}

		user := models.User{
			Username:     req.Username,
			PasswordHash: string(hash),
			Role:         "admin",
			IsActive:     true,
		}
		if err := db.Create(&user).Error; err != nil {
			http.Error(w, "failed to create user", http.StatusInternalServerError)
			return
		}

		// Issue a JWT so the browser is immediately logged in
		exp := time.Now().Add(time.Duration(authCfg.TokenExpireHours) * time.Hour)
		claims := jwt.MapClaims{
			"user_id": user.ID,
			"role":    user.Role,
			"sub":     user.ID,
			"exp":     exp.Unix(),
			"iat":     time.Now().Unix(),
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		signed, err := token.SignedString([]byte(authCfg.JWTSecret))
		if err != nil {
			http.Error(w, "failed to sign token", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(setupResponse{Token: signed})
	}
}

// isSetupComplete returns true when at least one user exists (setup already done).
func isSetupComplete(db *gorm.DB) bool {
	var count int64
	err := db.Model(&models.User{}).Count(&count).Error
	return err == nil && count > 0
}

var errSetupIncomplete = errors.New("setup not complete")
