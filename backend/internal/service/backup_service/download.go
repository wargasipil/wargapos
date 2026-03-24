package backup_service

import (
	"errors"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/golang-jwt/jwt/v5"

	"wargapos/backend/internal/auth"
)

func (s *BackupService) ServeDownload(w http.ResponseWriter, r *http.Request) {
	tok := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	if tok == "" {
		tok = r.URL.Query().Get("token")
	}
	claims, err := s.parseToken(tok)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	if claims.Role != "admin" {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	fname := r.URL.Query().Get("file")
	if strings.ContainsAny(fname, `/\`) || filepath.Base(fname) != fname ||
		!strings.HasSuffix(fname, ".sql.gz") {
		http.Error(w, fmt.Sprintf("invalid file name: %q", fname), http.StatusBadRequest)
		return
	}

	fpath := filepath.Join(s.backupDir(), fname)
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, fname))
	http.ServeFile(w, r, fpath)
}

func (s *BackupService) parseToken(tokenStr string) (*auth.Claims, error) {
	if tokenStr == "" {
		return nil, errors.New("missing token")
	}
	var c auth.Claims
	_, err := jwt.ParseWithClaims(tokenStr, &c, func(*jwt.Token) (any, error) {
		return []byte(s.authCfg.JWTSecret), nil
	})
	if err != nil {
		return nil, errors.New("invalid token")
	}
	return &c, nil
}
