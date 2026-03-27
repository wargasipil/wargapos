package ingredient_service

import (
	"gorm.io/gorm"

	ingredientv1 "wargapos/backend/gen/wargapos/ingredient/v1"
	"wargapos/backend/gen/wargapos/stock/v1/stockv1connect"
	"wargapos/backend/internal/models"

	"google.golang.org/protobuf/types/known/timestamppb"
)

// IngredientService implements ingredientv1connect.IngredientServiceHandler.
type IngredientService struct {
	db       *gorm.DB
	stockSrv stockv1connect.StockServiceClient
}

// NewIngredientService is the Wire provider constructor.
func NewIngredientService(db *gorm.DB, stockSrv stockv1connect.StockServiceClient) *IngredientService {
	return &IngredientService{db, stockSrv}
}

func toProtoMaterial(m *models.Material) *ingredientv1.Material {
	return &ingredientv1.Material{
		Id:        m.ID,
		BranchId:  branchIDVal(m.BranchID),
		Code:      m.Code,
		Name:      m.Name,
		QtyType:   ingredientv1.QtyType(m.QtyType),
		Qty:       m.Qty,
		CreatedAt: timestamppb.New(m.CreatedAt),
		UpdatedAt: timestamppb.New(m.UpdatedAt),
	}
}

func toProtoRecipeItem(i *models.RecipeItem) *ingredientv1.RecipeItem {
	item := &ingredientv1.RecipeItem{
		Id:         i.ID,
		MaterialId: i.MaterialID,
		Qty:        i.Qty,
	}
	if i.Material != nil {
		item.Material = toProtoMaterial(i.Material)
	}
	return item
}

func toProtoRecipe(r *models.Recipe) *ingredientv1.Recipe {
	items := make([]*ingredientv1.RecipeItem, len(r.Items))
	for idx := range r.Items {
		items[idx] = toProtoRecipeItem(&r.Items[idx])
	}
	return &ingredientv1.Recipe{
		Id:        r.ID,
		ProductId: r.ProductID,
		Name:      r.Name,
		Items:     items,
		CreatedAt: timestamppb.New(r.CreatedAt),
		UpdatedAt: timestamppb.New(r.UpdatedAt),
	}
}

func branchIDVal(v *uint32) uint32 {
	if v == nil {
		return 0
	}
	return *v
}
