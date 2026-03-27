package ingredient_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"

	ingredientv1 "wargapos/backend/gen/wargapos/ingredient/v1"
	"wargapos/backend/internal/models"
)

func (s *IngredientService) DeleteRecipe(
	ctx context.Context,
	req *connect.Request[ingredientv1.DeleteRecipeRequest],
) (*connect.Response[ingredientv1.DeleteRecipeResponse], error) {
	result := s.db.WithContext(ctx).Delete(&models.Recipe{}, "id = ?", req.Msg.Id)
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, connect.NewError(connect.CodeNotFound, errors.New("recipe not found"))
	}

	return connect.NewResponse(&ingredientv1.DeleteRecipeResponse{}), nil
}
