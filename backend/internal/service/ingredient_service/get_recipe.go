package ingredient_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"gorm.io/gorm"

	ingredientv1 "wargapos/backend/gen/wargapos/ingredient/v1"
	"wargapos/backend/internal/models"
)

func (s *IngredientService) GetRecipe(
	ctx context.Context,
	req *connect.Request[ingredientv1.GetRecipeRequest],
) (*connect.Response[ingredientv1.GetRecipeResponse], error) {
	var recipe models.Recipe
	if err := s.db.WithContext(ctx).Preload("Items.Material").
		First(&recipe, "product_id = ?", req.Msg.ProductId).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, connect.NewError(connect.CodeNotFound, errors.New("recipe not found"))
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&ingredientv1.GetRecipeResponse{Recipe: toProtoRecipe(&recipe)}), nil
}
