package table_service

import (
	"gorm.io/gorm"

	tablev1 "wargapos/backend/gen/wargapos/table/v1"
	"wargapos/backend/gen/wargapos/table/v1/tablev1connect"
	"wargapos/backend/internal/models"
)

// TableService implements tablev1connect.TableServiceHandler directly.
type TableService struct {
	db *gorm.DB
}

// NewTableService is the Wire provider constructor.
func NewTableService(db *gorm.DB) *TableService {
	return &TableService{db: db}
}

var _ tablev1connect.TableServiceHandler = (*TableService)(nil)

func toProtoTable(t *models.Table) *tablev1.Table {
	return &tablev1.Table{Id: t.ID, Name: t.Name}
}
