package main

import (
	"crypto/sha512"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"gorm.io/gorm"

	"wargapos/backend/internal/config"
	"wargapos/backend/internal/models"
)

type midtransNotification struct {
	OrderID           string `json:"order_id"`
	TransactionStatus string `json:"transaction_status"`
	FraudStatus       string `json:"fraud_status"`
	GrossAmount       string `json:"gross_amount"`
	SignatureKey      string `json:"signature_key"`
	StatusCode        string `json:"status_code"`
}

func midtransWebhookHandler(db *gorm.DB, midtransCfg config.MidtransConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Always respond 200 OK — Midtrans retries on any non-200 response
		defer w.WriteHeader(http.StatusOK)

		var notif midtransNotification
		if err := json.NewDecoder(r.Body).Decode(&notif); err != nil {
			log.Printf("[webhook] bad request body: %v", err)
			return
		}

		// Verify signature: SHA512(order_id + status_code + gross_amount + server_key)
		raw := fmt.Sprintf("%s%s%s%s", notif.OrderID, notif.StatusCode, notif.GrossAmount, midtransCfg.ServerKey)
		hash := fmt.Sprintf("%x", sha512.Sum512([]byte(raw)))
		if hash != notif.SignatureKey {
			log.Printf("[webhook] invalid signature for order %s", notif.OrderID)
			return
		}

		// Parse order ID explicitly to int64
		orderID, err := strconv.ParseInt(notif.OrderID, 10, 64)
		if err != nil {
			log.Printf("[webhook] invalid order_id %q: %v", notif.OrderID, err)
			return
		}

		log.Printf("[webhook] order=%d status=%s fraud=%s", orderID, notif.TransactionStatus, notif.FraudStatus)

		isPaid := notif.TransactionStatus == "settlement" ||
			(notif.TransactionStatus == "capture" && notif.FraudStatus == "accept")
		isCancelled := notif.TransactionStatus == "deny" ||
			notif.TransactionStatus == "cancel" ||
			notif.TransactionStatus == "expire"

		if isPaid {
			result := db.Model(&models.Order{}).
				Where("id = ? AND status = 'pending'", orderID). // idempotency guard
				Updates(map[string]any{"status": "paid", "payment_method": "qris"})
			if result.Error != nil {
				log.Printf("[webhook] DB error marking order %d paid: %v", orderID, result.Error)
			} else {
				log.Printf("[webhook] order %d marked paid (rows=%d)", orderID, result.RowsAffected)
			}
		} else if isCancelled {
			result := db.Model(&models.Order{}).
				Where("id = ? AND status = 'pending'", orderID).
				Updates(map[string]any{"status": "cancelled"})
			if result.Error != nil {
				log.Printf("[webhook] DB error cancelling order %d: %v", orderID, result.Error)
			} else {
				log.Printf("[webhook] order %d cancelled (rows=%d)", orderID, result.RowsAffected)
			}
		}
		// pending and other transient statuses: no action, wait for next webhook
	}
}
