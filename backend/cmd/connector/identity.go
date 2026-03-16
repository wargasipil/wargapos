package main

import (
	"encoding/json"
	"errors"
	"os"

	"github.com/google/uuid"
)

type identity struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

func loadOrCreateIdentity(path string) (*identity, error) {
	data, err := os.ReadFile(path)
	if err == nil {
		var id identity
		if err := json.Unmarshal(data, &id); err == nil && id.ID != "" {
			return &id, nil
		}
	} else if !errors.Is(err, os.ErrNotExist) {
		return nil, err
	}

	hostname, _ := os.Hostname()
	if hostname == "" {
		hostname = "connector"
	}
	id := &identity{
		ID:   uuid.NewString(),
		Name: hostname,
	}
	data, err = json.MarshalIndent(id, "", "  ")
	if err != nil {
		return nil, err
	}
	if err := os.WriteFile(path, data, 0o600); err != nil {
		return nil, err
	}
	return id, nil
}
