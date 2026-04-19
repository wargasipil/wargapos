# UserService

Package: `wargapos.user.v1`

## RPCs

| Method | Auth | Description |
|--------|------|-------------|
| `CreateUser` | root, admin | Create a new user account |
| `GetUser` | authenticated | Fetch one or more users by ID |
| `UpdateUser` | root, admin | Update user fields |
| `DeleteUser` | root, admin | Soft-delete a user |
| `ListUsers` | root, admin | Paginated user list |
| `ChangePassword` | authenticated | Change own password |

---

### User object

| Field | Type | Description |
|-------|------|-------------|
| `id` | uint32 | User ID |
| `username` | string | Login name |
| `full_name` | string | Display name |
| `email` | string | Email address |
| `role` | Role | User role enum |
| `is_active` | bool | Account status |
| `image_url` | string | Profile image |

---

### CreateUser

```
rpc CreateUser(CreateUserRequest) returns (CreateUserResponse)
```

**Request**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `username` | string | yes | 3–50 chars |
| `full_name` | string | yes | min 1 char |
| `email` | string | yes | valid email |
| `password` | string | yes | min 6 chars |
| `role` | Role | yes | must not be UNSPECIFIED |

**Response:** `{ user: User }`

---

### GetUser

```
rpc GetUser(GetUserRequest) returns (GetUserResponse)
```

**Request**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ids` | repeated uint32 | yes | At least 1 ID |

**Response:** `{ users: map<uint32, User> }`

---

### UpdateUser

```
rpc UpdateUser(UpdateUserRequest) returns (UpdateUserResponse)
```

**Request** — all fields except `id` are optional (only provided fields are updated)

| Field | Type | Notes |
|-------|------|-------|
| `id` | uint32 | required, > 0 |
| `full_name` | string | |
| `email` | string | |
| `role` | Role | |
| `is_active` | bool | |

**Response:** `{ user: User }`

---

### DeleteUser

```
rpc DeleteUser(DeleteUserRequest) returns (DeleteUserResponse)
```

**Request:** `{ id: uint32 }`

---

### ListUsers

```
rpc ListUsers(ListUsersRequest) returns (ListUsersResponse)
```

**Request**

| Field | Type | Description |
|-------|------|-------------|
| `page` | int32 | 1-based page number |
| `page_size` | int32 | Results per page |

**Response:** `{ users: User[], total: int32 }`

---

### ChangePassword

```
rpc ChangePassword(ChangePasswordRequest) returns (ChangePasswordResponse)
```

**Request**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `current_password` | string | yes | min 1 char |
| `new_password` | string | yes | min 6 chars |
