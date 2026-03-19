package notifier

import "wargapos/backend/internal/models"

// Notifier is implemented by NotificationService and injected into TransactionService
// via Wire to avoid a circular import between the two service packages.
type Notifier interface {
	Publish(n *models.Notification)
}
