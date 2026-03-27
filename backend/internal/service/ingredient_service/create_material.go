package ingredient_service

import (
	"context"
	"errors"
	"strings"

	"connectrpc.com/connect"

	ingredientv1 "wargapos/backend/gen/wargapos/ingredient/v1"
	"wargapos/backend/internal/models"
)

func (s *IngredientService) CreateMaterial(
	ctx context.Context,
	req *connect.Request[ingredientv1.CreateMaterialRequest],
) (*connect.Response[ingredientv1.CreateMaterialResponse], error) {
	var branchID *uint32
	if req.Msg.BranchId > 0 {
		v := req.Msg.BranchId
		branchID = &v
	}

	m := models.Material{
		Code:     req.Msg.Code,
		Name:     req.Msg.Name,
		QtyType:  int16(req.Msg.QtyType),
		Qty:      req.Msg.Qty,
		BranchID: branchID,
	}
	if err := s.db.WithContext(ctx).Create(&m).Error; err != nil {
		if strings.Contains(err.Error(), "unique") || strings.Contains(err.Error(), "duplicate") {
			return nil, connect.NewError(connect.CodeAlreadyExists, errors.New("material code already exists"))
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&ingredientv1.CreateMaterialResponse{Material: toProtoMaterial(&m)}), nil
}
