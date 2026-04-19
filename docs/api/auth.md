# AuthService

Package: `wargapos.auth.v1`

## RPCs

| Method | Auth | Description |
|--------|------|-------------|
| `Login` | Public | Authenticate and receive tokens |
| `Logout` | Public | Invalidate an access token |
| `ValidateToken` | Public | Check if a token is valid |
| `RefreshToken` | Public | Exchange a refresh token for a new access token |

---

### Login

```
rpc Login(LoginRequest) returns (LoginResponse)
```

**Request**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | yes | min 1 character |
| `password` | string | yes | min 1 character |

**Response**

| Field | Type | Description |
|-------|------|-------------|
| `access_token` | string | JWT access token |
| `refresh_token` | string | Opaque refresh token |
| `expires_at` | int64 | Unix timestamp of access token expiry |

---

### Logout

```
rpc Logout(LogoutRequest) returns (LogoutResponse)
```

**Request**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `access_token` | string | yes | Token to invalidate |

---

### ValidateToken

```
rpc ValidateToken(ValidateTokenRequest) returns (ValidateTokenResponse)
```

**Request**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | yes | JWT token to validate |

**Response**

| Field | Type | Description |
|-------|------|-------------|
| `valid` | bool | Whether the token is valid |
| `user_id` | uint32 | User ID (if valid) |
| `role` | string | Role string (if valid) |

---

### RefreshToken

```
rpc RefreshToken(RefreshTokenRequest) returns (RefreshTokenResponse)
```

**Request**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `refresh_token` | string | yes | Valid refresh token |

**Response**

| Field | Type | Description |
|-------|------|-------------|
| `access_token` | string | New JWT access token |
| `refresh_token` | string | New refresh token |
| `expires_at` | int64 | Unix timestamp of new access token expiry |
