# 🔐 Authentication Setup Guide

## Authentication Credentials Required

Your application supports **two authentication methods**:

### 1. JWT Token Authentication
- Used for web/mobile app users
- Tokens expire after 24 hours
- Requires user registration/login

### 2. API Key Authentication  
- Used for server-to-server communication
- Permanent until regenerated
- Passed via `x-api-key` header

## 🔑 Required Environment Variables

Copy `.env.example` to `.env` and configure these authentication credentials:

```bash
# Core Authentication (REQUIRED)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
API_KEY_SECRET=your-api-key-secret-minimum-32-characters

# Database (REQUIRED)
DATABASE_URL=postgresql://username:password@localhost:5432/video_face_blur

# Redis (REQUIRED for queues)
REDIS_URL=redis://localhost:6379

# Cloudinary (REQUIRED for video storage)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Webhooks (REQUIRED for notifications)
WEBHOOK_SECRET=your-webhook-secret-minimum-32-characters
```

## 🚀 Authentication Endpoints

### User Registration
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

### User Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "api_key": "vfb_a1b2c3d4e5f6..."
    }
  }
}
```

### Get User Profile
```http
GET /api/auth/profile
Authorization: Bearer YOUR_JWT_TOKEN
```

### Regenerate API Key
```http
POST /api/auth/regenerate-api-key
Authorization: Bearer YOUR_JWT_TOKEN
```

## 📋 Authentication Headers

### JWT Token (Bearer)
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### API Key
```http
x-api-key: vfb_a1b2c3d4e5f6...
```

## 🔒 Security Best Practices

### Generate Strong Secrets
Use these commands to generate secure secrets:

```bash
# Generate JWT_SECRET (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate API_KEY_SECRET (32+ characters)  
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate WEBHOOK_SECRET (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Example .env Configuration
```bash
JWT_SECRET=4f8a9b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
API_KEY_SECRET=9a8b7c6d5e4f3g2h1i0j9k8l7m6n5o4p3q2r1s0t9u8v7w6x5y4z3a2b1c0d9e8f7g6
WEBHOOK_SECRET=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3g4
```

## 🧪 Testing Authentication

### Test JWT Authentication
```bash
# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}'

# Login to get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}'
```

### Test API Key Authentication
```bash
# Use API key from login response
curl -X GET http://localhost:3000/api/videos \
  -H "x-api-key: vfb_your_api_key_here"
```

## ⚠️ Important Notes

1. **Never commit your .env file** to version control
2. **Use different secrets** for development and production
3. **Rotate secrets regularly** in production
4. **Store production secrets** in secure environment variables
5. **API keys are permanent** until manually regenerated
6. **JWT tokens expire** after 24 hours

## 🔧 Troubleshooting

### "JWT_SECRET and API_KEY_SECRET environment variables are required"
- Make sure you've set both `JWT_SECRET` and `API_KEY_SECRET` in your `.env` file
- Both should be at least 32 characters long

### "Invalid or expired token"
- JWT tokens expire after 24 hours
- Generate a new token by logging in again

### "Invalid API key"
- Verify the API key in your database matches what you're sending
- Check you're using the correct header: `x-api-key`

### Database Connection Issues
- Ensure PostgreSQL is running and accessible
- Verify your `DATABASE_URL` format is correct
- Check database exists and user has proper permissions