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

func (s *IngredientService) UpdateRecipe(
	ctx context.Context,
	req *connect.Request[ingredientv1.UpdateRecipeRequest],
) (*connect.Response[ingredientv1.UpdateRecipeResponse], error) {
	var recipe models.Recipe

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&recipe, "id = ?", req.Msg.Id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return connect.NewError(connect.CodeNotFound, errors.New("recipe not found"))
			}
			return connect.NewError(connect.CodeInternal, err)
		}

		if err := tx.Model(&recipe).Updates(map[string]any{
			"name":       req.Msg.Name,
			"updated_at": time.Now(),
		}).Error; err != nil {
			return connect.NewError(connect.CodeInternal, err)
		}

		if err := tx.Where("recipe_id = ?", recipe.ID).Delete(&models.RecipeItem{}).Error; err != nil {
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

	return connect.NewResponse(&ingredientv1.UpdateRecipeResponse{Recipe: toProtoRecipe(&recipe)}), nil
}
