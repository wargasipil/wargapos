package ingredient_service

import (
	"context"
	"errors"
	"time"

	"connectrpc.com/connect"
	"gorm.io/gorm"

	ingredientv1 "wargapos/backend/gen/wargapos/ingredient/v1"
	"wargapos/backend/internal/models"
)

func (s *IngredientService) UpdateMaterial(
	ctx context.Context,
	req *connect.Request[ingredientv1.UpdateMaterialRequest],
) (*connect.Response[ingredientv1.UpdateMaterialResponse], error) {
	var m models.Material
	if err := s.db.WithContext(ctx).First(&m, "id = ?", req.Msg.Id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, connect.NewError(connect.CodeNotFound, errors.New("material not found"))
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	if err := s.db.WithContext(ctx).Model(&m).Updates(map[string]any{
		"code":       req.Msg.Code,
		"name":       req.Msg.Name,
		"qty_type":   int16(req.Msg.QtyType),
		"qty":        req.Msg.Qty,
		"updated_at": time.Now(),
	}).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&ingredientv1.UpdateMaterialResponse{Material: toProtoMaterial(&m)}), nil
}
