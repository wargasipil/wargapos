package ingredient_service

import (
	"context"

	"connectrpc.com/connect"

	ingredientv1 "wargapos/backend/gen/wargapos/ingredient/v1"
	"wargapos/backend/internal/models"
)

func (s *IngredientService) ListMaterial(
	ctx context.Context,
	req *connect.Request[ingredientv1.ListMaterialRequest],
) (*connect.Response[ingredientv1.ListMaterialResponse], error) {
	pageSize := int(req.Msg.PageSize)
	if pageSize <= 0 {
		pageSize = 20
	}
	page := int(req.Msg.Page)
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * pageSize

	q := s.db.WithContext(ctx).Model(&models.Material{})
	if req.Msg.Search != "" {
		q = q.Where("name ILIKE ? OR code ILIKE ?", "%"+req.Msg.Search+"%", "%"+req.Msg.Search+"%")
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var materials []models.Material
	if err := q.Order("id asc").Limit(pageSize).Offset(offset).Find(&materials).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	proto := make([]*ingredientv1.Material, len(materials))
	for i := range materials {
		proto[i] = toProtoMaterial(&materials[i])
	}

	return connect.NewResponse(&ingredientv1.ListMaterialResponse{
		Materials: proto,
		Total:     int32(total),
	}), nil
}
