package main

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"
	"wargapos/backend/pkgs/runner"

	"github.com/urfave/cli/v3"
	"gorm.io/gorm"
)

type PartitionType int

const (
	PartitionByRange PartitionType = iota
	PartitionByHash
	PartitionByDaily
)

type PartitionManager struct {
	db *gorm.DB
}

func NewPartitionManager(
	db *gorm.DB,
) *PartitionManager {
	return &PartitionManager{
		db: db,
	}
}

func (pm *PartitionManager) CreatePartition(tableName string, partype PartitionType, keys []string) error {
	slog.Info("create partition", "table", tableName)

	oldTable := tableName + "_old"

	// Build a safe comma-separated list of quoted column identifiers
	quotedKeys := make([]string, len(keys))
	for i, k := range keys {
		quotedKeys[i] = `"` + strings.ReplaceAll(k, `"`, `""`) + `"`
	}
	keyList := strings.Join(quotedKeys, ", ")

	var partClause string
	switch partype {
	case PartitionByRange, PartitionByDaily:
		// Daily partitioning is RANGE partitioning with 1-day child partitions
		// managed by EnsureDailyPartitions.
		partClause = "RANGE"
	case PartitionByHash:
		partClause = "HASH"
	default:
		return fmt.Errorf("unsupported partition type: %d", partype)
	}

	return pm.db.Transaction(func(tx *gorm.DB) error {
		slog.Info("renaming table", "table", tableName)
		if err := tx.Exec(fmt.Sprintf(`ALTER TABLE "%s" RENAME TO "%s"`, tableName, oldTable)).Error; err != nil {
			return err
		}

		slog.Info("creating partitioned table", "table", tableName, "type", partClause)
		if err := tx.Exec(fmt.Sprintf(
			`CREATE TABLE "%s" (LIKE "%s" INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING IDENTITY) PARTITION BY %s (%s)`,
			tableName, oldTable, partClause, keyList,
		)).Error; err != nil {
			return err
		}

		// Must create at least one partition before inserting data.
		// A DEFAULT partition accepts all rows that don't match a specific range.
		slog.Info("creating default partition", "table", tableName)
		if err := tx.Exec(fmt.Sprintf(
			`CREATE TABLE "%s_default" PARTITION OF "%s" DEFAULT`,
			tableName, tableName,
		)).Error; err != nil {
			return err
		}

		slog.Info("inserting data into partitioned table", "table", tableName)
		if err := tx.Exec(fmt.Sprintf(
			`INSERT INTO "%s" SELECT * FROM "%s"`,
			tableName, oldTable,
		)).Error; err != nil {
			return err
		}

		return nil
	})
}

// Repartition changes an already-partitioned table to a new partition scheme
// (different type or key) in a single pass, without going through an unpartitioned
// intermediate state. The old partitioned table and all its child partitions are
// dropped atomically once the new table is in place.
func (pm *PartitionManager) Repartition(tableName string, newPartype PartitionType, newKeys []string) error {
	slog.Info("repartitioning table", "table", tableName)

	tempTable := tableName + "_repartitioned"
	tempTableDefault := tableName + "_repartitioned_default"

	quotedKeys := make([]string, len(newKeys))
	for i, k := range newKeys {
		quotedKeys[i] = `"` + strings.ReplaceAll(k, `"`, `""`) + `"`
	}
	keyList := strings.Join(quotedKeys, ", ")

	var partClause string
	switch newPartype {
	case PartitionByRange, PartitionByDaily:
		partClause = "RANGE"
	case PartitionByHash:
		partClause = "HASH"
	default:
		return fmt.Errorf("unsupported partition type: %d", newPartype)
	}

	return pm.db.Transaction(func(tx *gorm.DB) error {
		slog.Info("creating new partitioned table", "table", tempTable, "type", partClause)
		if err := tx.Exec(fmt.Sprintf(
			`CREATE TABLE "%s" (LIKE "%s" INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING IDENTITY) PARTITION BY %s (%s)`,
			tempTable, tableName, partClause, keyList,
		)).Error; err != nil {
			return err
		}

		slog.Info("creating default partition", "table", tempTable)
		if err := tx.Exec(fmt.Sprintf(
			`CREATE TABLE "%s" PARTITION OF "%s" DEFAULT`,
			tempTableDefault, tempTable,
		)).Error; err != nil {
			return err
		}

		slog.Info("copying data", "from", tableName, "to", tempTable)
		if err := tx.Exec(fmt.Sprintf(
			`INSERT INTO "%s" SELECT * FROM "%s"`,
			tempTable, tableName,
		)).Error; err != nil {
			return err
		}

		slog.Info("dropping old partitioned table", "table", tableName)
		if err := tx.Exec(fmt.Sprintf(
			`DROP TABLE "%s" CASCADE`,
			tableName,
		)).Error; err != nil {
			return err
		}

		slog.Info("renaming new table into place", "table", tableName)
		if err := tx.Exec(fmt.Sprintf(
			`ALTER TABLE "%s" RENAME TO "%s"`,
			tempTable, tableName,
		)).Error; err != nil {
			return err
		}

		if err := tx.Exec(fmt.Sprintf(
			`ALTER TABLE "%s" RENAME TO "%s"`,
			tempTableDefault, tableName+"_default",
		)).Error; err != nil {
			return err
		}

		return nil
	})
}

// RevertPartition converts a partitioned table back to a regular table.
// It creates a new unpartitioned table, copies all data from all partitions,
// drops the partitioned table (and its partitions via CASCADE), then renames
// the new table into place.
func (pm *PartitionManager) RevertPartition(tableName string) error {
	slog.Info("reverting partition", "table", tableName)
	tempTable := tableName + "_new"

	return pm.db.Transaction(func(tx *gorm.DB) error {
		slog.Info("creating unpartitioned table", "table", tempTable)
		if err := tx.Exec(fmt.Sprintf(
			`CREATE TABLE "%s" (LIKE "%s" INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING IDENTITY)`,
			tempTable, tableName,
		)).Error; err != nil {
			return err
		}

		slog.Info("copying data to unpartitioned table", "table", tempTable)
		if err := tx.Exec(fmt.Sprintf(
			`INSERT INTO "%s" SELECT * FROM "%s"`,
			tempTable, tableName,
		)).Error; err != nil {
			return err
		}

		slog.Info("dropping partitioned table", "table", tableName)
		if err := tx.Exec(fmt.Sprintf(
			`DROP TABLE "%s" CASCADE`,
			tableName,
		)).Error; err != nil {
			return err
		}

		slog.Info("renaming table", "table", tempTable, "to", tableName)
		if err := tx.Exec(fmt.Sprintf(
			`ALTER TABLE "%s" RENAME TO "%s"`,
			tempTable, tableName,
		)).Error; err != nil {
			return err
		}

		return nil
	})
}

// PartitionInfo describes a child partition of a partitioned table.
type PartitionInfo struct {
	Name       string // e.g. "orders_2025_01_15"
	Expression string // e.g. "FOR VALUES FROM ('2025-01-15') TO ('2025-01-16')"
}

// AddRangePartition creates a single named RANGE partition for [from, to).
// Idempotent — uses CREATE TABLE IF NOT EXISTS.
func (pm *PartitionManager) AddRangePartition(tableName, partitionName string, from, to time.Time) error {
	slog.Info("adding range partition", "table", tableName, "partition", partitionName,
		"from", from.Format(time.DateOnly), "to", to.Format(time.DateOnly))
	return pm.db.Exec(fmt.Sprintf(
		`CREATE TABLE IF NOT EXISTS "%s" PARTITION OF "%s" FOR VALUES FROM ('%s') TO ('%s')`,
		partitionName, tableName,
		from.Format(time.DateOnly),
		to.Format(time.DateOnly),
	)).Error
}

// ListPartitions returns all child partitions of a partitioned table with their bound expressions.
func (pm *PartitionManager) ListPartitions(tableName string) ([]PartitionInfo, error) {
	var rows []struct {
		Name       string
		Expression string
	}
	err := pm.db.Raw(`
		SELECT
			child.relname                                   AS name,
			pg_get_expr(child.relpartbound, child.oid)      AS expression
		FROM pg_inherits
		JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
		JOIN pg_class child  ON pg_inherits.inhrelid  = child.oid
		WHERE parent.relname = ?
		ORDER BY child.relname
	`, tableName).Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	result := make([]PartitionInfo, len(rows))
	for i, r := range rows {
		result[i] = PartitionInfo{Name: r.Name, Expression: r.Expression}
	}
	return result, nil
}

// EnsureDailyPartitions ensures partitions exist for today and daysAhead future days.
// Partition names follow the pattern {table}_{YYYY}_{MM}_{DD}.
// Idempotent — uses AddRangePartition which uses CREATE TABLE IF NOT EXISTS.
func (pm *PartitionManager) EnsureDailyPartitions(tableName string, daysAhead int) error {
	now := time.Now().UTC()
	for i := 0; i <= daysAhead; i++ {
		day := now.AddDate(0, 0, i)
		from := time.Date(day.Year(), day.Month(), day.Day(), 0, 0, 0, 0, time.UTC)
		to := from.AddDate(0, 0, 1)
		partName := fmt.Sprintf("%s_%04d_%02d_%02d", tableName, day.Year(), int(day.Month()), day.Day())
		if err := pm.AddRangePartition(tableName, partName, from, to); err != nil {
			return err
		}
	}
	return nil
}

// DetachPartition detaches a child partition from the parent without dropping it.
// The detached table remains in the database and can be archived or queried independently.
func (pm *PartitionManager) DetachPartition(tableName, partitionName string) error {
	slog.Info("detaching partition", "table", tableName, "partition", partitionName)
	return pm.db.Exec(fmt.Sprintf(
		`ALTER TABLE "%s" DETACH PARTITION "%s"`,
		tableName, partitionName,
	)).Error
}

// DropPartition drops a partition table entirely.
func (pm *PartitionManager) DropPartition(partitionName string) error {
	slog.Info("dropping partition", "partition", partitionName)
	return pm.db.Exec(fmt.Sprintf(`DROP TABLE IF EXISTS "%s"`, partitionName)).Error
}

func (pm *PartitionManager) IsPartitioned(tableName string) (bool, error) {
	var err error
	var count int64
	err = pm.
		db.
		Raw(`
		SELECT 
			count(*)
		FROM pg_partitioned_table
		WHERE partrelid = ?::regclass;
		`, tableName).
		Scan(&count).
		Error

	if err != nil {
		return false, err
	}

	return count > 0, nil
}

type PartitionRunner runner.RunnerFunc

func NewPartitionRunner(
	db *gorm.DB,
) PartitionRunner {
	return func(wctx *runner.RunnerContext) error {
		slog.Info("running partition manager")

		partman := NewPartitionManager(db)
		tables := []string{"orders_backup"}

		ensure := func() error {
			for _, table := range tables {
				partitioned, err := partman.IsPartitioned(table)
				if err != nil {
					return err
				}
				if !partitioned {
					slog.Info("partitioning table", "table", table)
					if err := partman.CreatePartition(table, PartitionByDaily, []string{"created_at"}); err != nil {
						return err
					}
				}
				// Ensure today + 7 days ahead always have a daily partition ready.
				if err := partman.EnsureDailyPartitions(table, 7); err != nil {
					return err
				}
			}
			return nil
		}

		// Run immediately on startup.
		if err := ensure(); err != nil {
			return err
		}

		// Repeat every 12 hours so next-day partitions are always ready in advance.
		wctx.RunPeriodic("partition maintenance", 12*time.Hour, runner.RunnerFunc(func(_ *runner.RunnerContext) error {
			return ensure()
		}))

		<-wctx.Done()
		return wctx.Err()
	}
}

type PartitionRunnerFunc cli.ActionFunc

func NewPartitionRunnerFunc(
	partitionRunner PartitionRunner,
) PartitionRunnerFunc {
	return func(ctx context.Context, c *cli.Command) error {
		slog.SetLogLoggerLevel(slog.LevelDebug)

		slog.Info("running partition manager scheduler")
		rctx := runner.NewRunnerContext(ctx)

		return partitionRunner(rctx)

		// rctx.RunPeriodic("check partitioning in database", time.Second, runner.RunnerFunc(partitionRunner))

		// <-rctx.Done()
		// return rctx.Error
	}
}
