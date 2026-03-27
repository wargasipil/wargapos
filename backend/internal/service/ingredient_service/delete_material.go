package ingredient_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"

	ingredientv1 "wargapos/backend/gen/wargapos/ingredient/v1"
	"wargapos/backend/internal/models"
)

func (s *IngredientService) DeleteMaterial(
	ctx context.Context,
	req *connect.Request[ingredientv1.DeleteMaterialRequest],
) (*connect.Response[ingredientv1.DeleteMaterialResponse], error) {
	result := s.db.WithContext(ctx).Delete(&models.Material{}, "id = ?", req.Msg.Id)
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, connect.NewError(connect.CodeNotFound, errors.New("material not found"))
	}

	return connect.NewResponse(&ingredientv1.DeleteMaterialResponse{}), nil
}
