# Authentication System Implementation

This document describes the authentication system implemented for the Talk application to address issue #22.

## Overview

The authentication system uses **JWT (JSON Web Tokens)** with email/password authentication, providing a secure and simple solution that balances security and ease of implementation.

## Architecture

### Backend (Go)

#### Database Schema

Two tables were added to support authentication:

1. **users table**:
   - `id` (UUID): Primary key
   - `email` (VARCHAR): Unique email address
   - `password_hash` (VARCHAR): bcrypt hashed password
   - `username` (VARCHAR): Display name
   - `created_at`, `updated_at` (TIMESTAMP): Audit fields

2. **refresh_tokens table**:
   - `id` (UUID): Primary key
   - `user_id` (UUID): Foreign key to users table
   - `token` (VARCHAR): Refresh token string
   - `expires_at` (TIMESTAMP): Token expiration time
   - `created_at` (TIMESTAMP): Creation timestamp

#### Components

1. **JWT Manager** (`go/internal/auth/jwt.go`):
   - Generates and validates JWT tokens
   - Access tokens expire in 15 minutes
   - Refresh tokens expire in 7 days
   - Uses HS256 signing algorithm

2. **User Repository** (`go/internal/repository/user_repository.go`):
   - Handles user CRUD operations
   - Password hashing with bcrypt
   - Refresh token management

3. **Auth Handlers** (`go/internal/handlers/auth_handler.go`):
   - `/auth/register` - User registration
   - `/auth/login` - User login
   - `/auth/refresh` - Token refresh
   - `/auth/logout` - User logout
   - `/api/me` - Get current user info (protected)

4. **Middleware** (`go/middleware/auth.go`):
   - `JWTAuthMiddleware`: Validates JWT tokens

### Frontend (Next.js)

#### Components

1. **Auth API Client** (`next/src/lib/api/auth.ts`):
   - Handles API communication with backend
   - Token storage in localStorage
   - Automatic token refresh on 401 responses

2. **Auth Context** (`next/src/contexts/AuthContext.tsx`):
   - Global authentication state management
   - React hooks for auth operations
   - Automatic authentication check on app load

3. **Auth Screen** (`next/src/components/AuthScreen.tsx`):
   - User interface for login/registration
   - (Note: This component needs to be updated to use the new auth system)

## API Endpoints

### Public Endpoints

- `POST /auth/register` - Register new user
  ```json
  Request: {
    "email": "user@example.com",
    "password": "password123",
    "username": "John Doe"
  }
  Response: {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "user": { "id": "...", "email": "...", "username": "..." },
    "expires_in": 900
  }
  ```

- `POST /auth/login` - Login user
  ```json
  Request: {
    "email": "user@example.com",
    "password": "password123"
  }
  Response: {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "user": { "id": "...", "email": "...", "username": "..." },
    "expires_in": 900
  }
  ```

- `POST /auth/refresh` - Refresh access token
  ```json
  Request: { "refresh_token": "eyJhbGc..." }
  or use HTTP-only cookie
  Response: {
    "access_token": "eyJhbGc...",
    "expires_in": 900
  }
  ```

- `POST /auth/logout` - Logout user (clears refresh token)

### Protected Endpoints

- `GET /api/me` - Get current user info
  - Requires: `Authorization: Bearer <access_token>` header

## Setup Instructions

### 1. Environment Variables

Add to your `.env` file:

```bash
# JWT Configuration (REQUIRED)
# Generate a secure random string for production
# Example: openssl rand -base64 32
JWT_SECRET_KEY=your-secret-key-here-change-in-production

# Existing database configuration
DB_HOST=postgres
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
DB_SSLMODE=disable
```

**Important:** `JWT_SECRET_KEY` is required. The application will not start if this environment variable is not set. For production, generate a strong random key using:

```bash
openssl rand -base64 32
```

### 2. Database Migration

Migrations run automatically when the Go server starts. The migration files are located in `go/migrations/`.

### 3. Start the Services

```bash
# Start all services with Docker Compose
docker compose up -d

# Or start Go server manually (from go/ directory)
make run
```

### 4. Testing the Authentication

```bash
# Register a new user
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "username": "Test User"
  }'

# Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Get user info (use access_token from login response)
curl -X GET http://localhost:8000/api/me \
  -H "Authorization: Bearer <access_token>"
```

## Security Features

1. **Password Hashing**: Uses bcrypt with default cost factor
2. **JWT Tokens**: Signed with HS256 algorithm
3. **Token Expiration**:
   - Access tokens: 15 minutes
   - Refresh tokens: 7 days
4. **HTTP-Only Cookies**: Refresh tokens stored in HTTP-only cookies (when enabled)
5. **Database Indexes**: Optimized queries for user lookup and token validation

## Future Enhancements

1. **OAuth Integration**: Add support for Google, Apple, and Facebook OAuth
2. **Email Verification**: Implement email verification for new users
3. **Password Reset**: Add password reset functionality
4. **Two-Factor Authentication**: Implement 2FA for enhanced security
5. **Rate Limiting**: Add rate limiting for auth endpoints to prevent brute force attacks
6. **Session Management**: Track active sessions and allow users to revoke sessions
7. **Update Frontend**: Fully integrate the new auth system into the existing AuthScreen component

## Implementation Status

### Completed
- ✅ Database schema and migrations
- ✅ JWT token generation and validation
- ✅ User repository with password hashing
- ✅ Authentication API handlers
- ✅ JWT middleware
- ✅ Protected API routes
- ✅ Frontend API client
- ✅ Auth context for state management

### Pending
- ⏳ Update AuthScreen component to use new auth system
- ⏳ Add email verification
- ⏳ Implement password reset
- ⏳ Add OAuth providers
- ⏳ Write comprehensive tests
- ⏳ Add rate limiting

## Troubleshooting

### Migration Errors

If migrations fail to run automatically:

```bash
# Connect to PostgreSQL
docker exec -it talk-postgres psql -U your_db_user -d your_db_name

# Run migration manually
\i /path/to/migrations/001_create_users_table.sql
```

### Token Validation Errors

- Check that `JWT_SECRET_KEY` is set in environment variables
- Verify token hasn't expired
- Ensure `Authorization` header format is correct: `Bearer <token>`

### CORS Issues

If experiencing CORS issues, verify that your frontend origin is included in the CORS configuration in `main.go`:

```go
AllowOrigins: []string{"http://localhost:3000", "http://localhost:3003"},
```
