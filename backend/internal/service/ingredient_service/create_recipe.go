package ingredient_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"gorm.io/gorm"

	ingredientv1 "wargapos/backend/gen/wargapos/ingredient/v1"
	"wargapos/backend/internal/models"
)

func (s *IngredientService) CreateRecipe(
	ctx context.Context,
	req *connect.Request[ingredientv1.CreateRecipeRequest],
) (*connect.Response[ingredientv1.CreateRecipeResponse], error) {
	var recipe models.Recipe

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var existing models.Recipe
		if err := tx.First(&existing, "product_id = ?", req.Msg.ProductId).Error; err == nil {
			return connect.NewError(connect.CodeAlreadyExists, errors.New("recipe already exists for this product"))
		}

		recipe = models.Recipe{
			ProductID: req.Msg.ProductId,
			Name:      req.Msg.Name,
		}
		if err := tx.Create(&recipe).Error; err != nil {
			return connect.NewError(connect.CodeInternal, err)
		}

		items := make([]models.RecipeItem, len(req.Msg.Items))
		for i, it := range req.Msg.Items {
			items[i] = models.RecipeItem{
				RecipeID:   recipe.ID,
				MaterialID: it.MaterialId,
				Qty:        it.Qty,
			}
		}
		if err := tx.Create(&items).Error; err != nil {
			return connect.NewError(connect.CodeInternal, err)
		}

		return tx.Preload("Items.Material").First(&recipe, recipe.ID).Error
	})
	if err != nil {
		return nil, err
	}

	return connect.NewResponse(&ingredientv1.CreateRecipeResponse{Recipe: toProtoRecipe(&recipe)}), nil
}
