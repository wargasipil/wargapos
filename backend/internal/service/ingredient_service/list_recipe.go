package ingredient_service

import (
	"context"

	"connectrpc.com/connect"

	ingredientv1 "wargapos/backend/gen/wargapos/ingredient/v1"
	"wargapos/backend/internal/models"
)

func (s *IngredientService) ListRecipe(
	ctx context.Context,
	req *connect.Request[ingredientv1.ListRecipeRequest],
) (*connect.Response[ingredientv1.ListRecipeResponse], error) {
	pageSize := int(req.Msg.PageSize)
	if pageSize <= 0 {
		pageSize = 20
	}
	page := int(req.Msg.Page)
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * pageSize

	q := s.db.WithContext(ctx).Model(&models.Recipe{})
	if req.Msg.Search != "" {
		q = q.Where("name ILIKE ?", "%"+req.Msg.Search+"%")
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var recipes []models.Recipe
	if err := q.Preload("Items.Material").Order("id asc").Limit(pageSize).Offset(offset).Find(&recipes).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	proto := make([]*ingredientv1.Recipe, len(recipes))
	for i := range recipes {
		proto[i] = toProtoRecipe(&recipes[i])
	}

	return connect.NewResponse(&ingredientv1.ListRecipeResponse{
		Recipes: proto,
		Total:   int32(total),
	}), nil
}
