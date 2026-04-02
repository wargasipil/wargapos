package ingredient_service

import (
	"context"

	"connectrpc.com/connect"

	ingredientv1 "wargapos/backend/gen/wargapos/ingredient/v1"
	"wargapos/backend/internal/models"
)

func (s *IngredientService) GetMaterial(
	ctx context.Context,
	req *connect.Request[ingredientv1.GetMaterialRequest],
) (*connect.Response[ingredientv1.GetMaterialResponse], error) {
	var m models.Material
	if err := s.db.WithContext(ctx).First(&m, req.Msg.Id).Error; err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	return connect.NewResponse(&ingredientv1.GetMaterialResponse{
		Material: toProtoMaterial(&m),
	}), nil
}
