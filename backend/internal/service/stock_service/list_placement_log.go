package stock_service

import (
	"context"
	"time"

	"connectrpc.com/connect"
	"google.golang.org/protobuf/types/known/timestamppb"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
)

func (s *StockService) ListPlacementLog(
	ctx context.Context,
	req *connect.Request[stockv1.ListPlacementLogRequest],
) (*connect.Response[stockv1.ListPlacementLogResponse], error) {
	pageSize := int(req.Msg.PageSize)
	if pageSize <= 0 {
		pageSize = 20
	}
	page := int(req.Msg.Page)
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * pageSize

	rackID := req.Msg.RackId

	where := "WHERE (pl.to_rack_id = ? OR pl.from_rack_id = ?)"
	args := []any{rackID, rackID}

	if req.Msg.DateFrom != "" {
		where += " AND pl.created_at >= ?"
		args = append(args, req.Msg.DateFrom)
	}
	if req.Msg.DateTo != "" {
		where += " AND pl.created_at < ?"
		args = append(args, req.Msg.DateTo)
	}

	var total int64
	countArgs := append([]any{}, args...)
	if err := s.db.WithContext(ctx).Raw(
		"SELECT COUNT(*) FROM placement_logs pl "+where, countArgs...,
	).Scan(&total).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	type row struct {
		ID            uint64
		SkuID         uint32
		FromRackID    uint32
		ToRackID      uint32
		PlacementType int32
		TransactionID uint64
		ActorID       uint32
		Change        int32
		Note          string
		CreatedAt     time.Time
		SkuCode       string
		FromRackName  string
		ToRackName    string
		ActorName     string
	}
	var rows []row
	queryArgs := append([]any{}, args...)
	queryArgs = append(queryArgs, pageSize, offset)
	if err := s.db.WithContext(ctx).Raw(`
		SELECT pl.id, pl.sku_id, pl.from_rack_id, pl.to_rack_id, pl.placement_type,
		       pl.transaction_id, pl.actor_id, pl.change, pl.note, pl.created_at,
		       s.code  AS sku_code,
		       COALESCE(fr.name, '') AS from_rack_name,
		       COALESCE(tr.name, '') AS to_rack_name,
		       COALESCE(u.username, '') AS actor_name
		FROM placement_logs pl
		JOIN skus s ON s.id = pl.sku_id
		LEFT JOIN racks fr ON fr.id = pl.from_rack_id
		LEFT JOIN racks tr ON tr.id = pl.to_rack_id
		LEFT JOIN users u ON u.id = pl.actor_id
		`+where+`
		ORDER BY pl.id DESC
		LIMIT ? OFFSET ?
	`, queryArgs...).Scan(&rows).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	logs := make([]*stockv1.PlacementLog, len(rows))
	for i, r := range rows {
		logs[i] = &stockv1.PlacementLog{
			Id:            r.ID,
			SkuId:         r.SkuID,
			FromRackId:    r.FromRackID,
			ToRackId:      r.ToRackID,
			PlacementType: stockv1.PlacementType(r.PlacementType),
			TransactionId: r.TransactionID,
			ActorId:       r.ActorID,
			Change:        r.Change,
			Note:          r.Note,
			CreatedAt:     timestamppb.New(r.CreatedAt),
			SkuCode:       r.SkuCode,
			FromRackName:  r.FromRackName,
			ToRackName:    r.ToRackName,
			ActorName:     r.ActorName,
		}
	}

	return connect.NewResponse(&stockv1.ListPlacementLogResponse{
		Logs:  logs,
		Total: int32(total),
	}), nil
}
