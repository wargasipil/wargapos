package backup_service

import (
	"compress/gzip"
	"encoding/json"
	"io"
	"net/http"
	"os/exec"
	"path/filepath"
	"strings"
)

func (s *BackupService) ServeRestoreUpload(w http.ResponseWriter, r *http.Request) {
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

	if err := r.ParseMultipartForm(512 << 20); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	file, hdr, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "missing file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	name := strings.ToLower(filepath.Base(hdr.Filename))
	isGzip := strings.HasSuffix(name, ".sql.gz") || strings.HasSuffix(name, ".gz")
	isSQL := strings.HasSuffix(name, ".sql")
	if !isGzip && !isSQL {
		http.Error(w, "only .sql or .sql.gz files accepted", http.StatusBadRequest)
		return
	}

	var stdin io.Reader = file
	if isGzip {
		gz, err := gzip.NewReader(file)
		if err != nil {
			http.Error(w, "invalid gzip", http.StatusBadRequest)
			return
		}
		defer gz.Close()
		stdin = gz
	}

	cmd := exec.CommandContext(r.Context(), "./thirdparties/bin/psql", s.cfg.Database.URL)
	cmd.Dir = s.cfg.GetBase()
	cmd.Stdin = stdin
	out, err := cmd.CombinedOutput()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": string(out)})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}
