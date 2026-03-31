package main

import (
	"log/slog"
	rolebasedv1 "wargapos/backend/gen/wargapos/rolebased/v1"
	settingsv1 "wargapos/backend/gen/wargapos/settings/v1"

	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/descriptorpb"
)

func main() {
	var ss proto.Message = &settingsv1.GetSettingsRequest{}

	// 1. Get descriptor
	desc := ss.ProtoReflect().Descriptor()

	// 2. Get message options
	opts := desc.Options().(*descriptorpb.MessageOptions)

	// 3. Check extension exists (safe)
	if !proto.HasExtension(opts, rolebasedv1.E_RequestPolicy) {
		slog.Info("no role policy found")
		return
	}

	// 4. Get extension
	ext := proto.GetExtension(opts, rolebasedv1.E_RequestPolicy)

	// 5. Cast to your type
	policy := ext.(*rolebasedv1.RequestPolicy)

	slog.Info("data", "roles", policy.Roles)

	for _, item := range policy.Roles {
		if item == rolebasedv1.Role_ROLE_ADMIN {
			slog.Info("asdasd")
		}
	}
}
