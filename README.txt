# 🎬 Video Face Blur API

A powerful backend API for automatically detecting and blurring faces in videos using AI-powered face detection and FFmpeg processing.

## ✨ Features

- 🤖 **AI-Powered Face Detection** using face-api.js
- 🎥 **Video Processing** with FFmpeg
- 🔐 **Dual Authentication** (JWT + API Keys)
- 📊 **Background Job Processing** with Bull queues
- 🔄 **Real-time Updates** via Socket.IO
- 🔔 **Webhook Notifications**
- ☁️ **Cloud Storage** with Cloudinary
- 📸 **Frame Screenshots**: Extract and process faces in specific video frames with two modes:
  - **Face Blur**: Apply blur effect to detected faces
  - **Black Bar**: Cover eyes and nose area with black bars for privacy
- 🔢 **Frame Count Tracking**: Automatically detect and return total number of frames in video
- 📈 **Comprehensive Logging** with Winston
- 🚀 **Production Ready** with Docker & Render deployment

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │    │   Load Balancer │    │   Background    │
│                 │◄──►│                 │◄──►│     Worker        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Express API   │    │   PostgreSQL    │    │   Redis Queue   │
│                 │◄──►│                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                                               │
         ▼                                               ▼
┌─────────────────┐                            ┌─────────────────┐
│   Cloudinary    │                            │   Socket.IO     │
│   (Storage)     │                            │ (Real-time)     │
└─────────────────┘                            └─────────────────┘
```

## 🔧 Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Queue**: Bull + Redis
- **AI**: face-api.js (TensorFlow.js)
- **Video**: FFmpeg + fluent-ffmpeg
- **Storage**: Cloudinary
- **Auth**: JWT + bcrypt
- **Validation**: Joi
- **Logging**: Winston
- **Deployment**: Render + Docker

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 16+
- PostgreSQL 12+
- Redis 6+
- FFmpeg

### 2. Installation
```bash
# Clone repository
git clone <your-repo>
cd video-face-blur-api

# Install dependencies
npm install

# Download AI models
npm run download-models
```

### 3. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

### 4. Database Setup
```bash
# Run migrations
npm run db:migrate

# (Optional) Seed database
npm run db:seed
```

### 5. Start Services
```bash
# Start API server
npm start

# Start background worker (separate terminal)
npm run worker
```

## 🔐 Authentication

The API supports **two authentication methods**:

### JWT Token Authentication
For web/mobile applications:
```http
POST /api/auth/register
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
      "api_key": "vfb_a1b2c3d4e5f6...",
      "credits": 100
    }
  }
}
```

### API Key Authentication
For server-to-server communication:
```http
GET /api/videos
x-api-key: vfb_your_api_key_here
```

### Authentication Headers
- **JWT**: `Authorization: Bearer YOUR_JWT_TOKEN`
- **API Key**: `x-api-key: YOUR_API_KEY`

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user | None |
| POST | `/api/auth/login` | User login | None |
| GET | `/api/auth/profile` | Get user profile | JWT |
| POST | `/api/auth/regenerate-api-key` | Regenerate API key | JWT |

### Videos
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/videos/upload` | Upload video (multipart/form-data)<br>Parameters:<br>- `video` (file) - Video file to upload<br>- `frameNumber` (optional, default: 1) - Frame number to extract for screenshot (1 = first frame)<br>- `blurIntensity` (optional, default: 25) - Blur intensity for face blurring (1-100)<br>- `processingMode` (optional, default: 'blur') - Processing mode: 'blur' or 'blackbar' | JWT/API Key |
| GET | `/api/videos` | List user videos | JWT/API Key |
| GET | `/api/videos/:id` | Get video details (includes frame screenshot URL and total frames) | JWT/API Key |
| GET | `/api/videos/:id/status` | Get processing status | JWT/API Key |
| POST | `/api/videos/:id/reprocess` | Reprocess video with different frame number, blur intensity, or processing mode | JWT/API Key |
| DELETE | `/api/videos/:id` | Delete video | JWT/API Key |

### Webhooks
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/webhooks/processing-complete` | Processing complete | Webhook Secret |
| POST | `/api/webhooks/upload-complete` | Upload complete | Webhook Secret |

## 🔑 Hardcoded Configuration (Production Ready)

> **Note**: All credentials and configuration are now hardcoded in the codebase for seamless deployment. No environment variables required for these settings.

### Authentication Secrets (Hardcoded)
```javascript
// src/middleware/auth.js
JWT_SECRET = 'super-secret-jwt-key-for-video-face-blur-app-2024'
API_KEY_SECRET = 'api-key-secret-for-video-processing-backend-service'
```

### Cloudinary Configuration (Hardcoded)
```javascript
// src/routes/videos.js & src/workers/videoProcessor.js
CLOUDINARY_CLOUD_NAME = 'dzfd6igiw'
CLOUDINARY_API_KEY = '346184484184165'
CLOUDINARY_API_SECRET = '4SzX1p6jCMqFPR6h3bXnN4b7b2U'
CLOUDINARY_UPLOAD_PRESET = 'Boom'
CLOUDINARY_ASSET_FOLDER = 'samples/new'
CLOUDINARY_OVERWRITE = true
CLOUDINARY_USE_FILENAME = false
CLOUDINARY_UNIQUE_FILENAME = false
```

### Frontend Integration Settings
```javascript
// Default API endpoint for frontend
API_BASE_URL = 'https://facecensor.onrender.com/api'

// Cloudinary settings for frontend uploads
CLOUDINARY_CLOUD_NAME = 'dzfd6igiw'
CLOUDINARY_UPLOAD_PRESET = 'Boom'
CLOUDINARY_FOLDER = 'samples/new'
```

### Processing Configuration
```javascript
// Default processing settings
DEFAULT_FRAME_NUMBER = 1              // Extract 1st frame by default
DEFAULT_BLUR_INTENSITY = 30          // 30% blur intensity
DEFAULT_PROCESSING_MODE = 'blur'       // 'blur' or 'blackbar'
MAX_VIDEO_SIZE = 524288000           // 500MB
MAX_VIDEO_DURATION = 300              // 5 minutes
MAX_CONCURRENT_JOBS = 3              // Background processing limit
```

## 🌐 Frontend Connection Guide - COMPLETE CREDENTIALS

### Production API Endpoints
```
Base URL: https://facecensor.onrender.com/api
```

### Required Headers for All Requests
```javascript
headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer YOUR_JWT_TOKEN'
}
```

### Complete Authentication Details
```javascript
// ACTUAL HARDCODED SECRETS - Use these for your frontend
const JWT_SECRET = "super-secret-jwt-key-for-video-face-blur-app-2024";
const API_KEY_SECRET = "api-key-secret-for-video-processing-backend-service";
const WEBHOOK_SECRET = "webhook-secret-for-secure-callback-handling";
```

### Cloudinary Configuration (Direct Upload)
```javascript
// ACTUAL CLOUDINARY CREDENTIALS
const CLOUDINARY_CLOUD_NAME = "dzfd6igiw";
const CLOUDINARY_API_KEY = "346184484184165";
const CLOUDINARY_API_SECRET = "4SzX1p6jCMqFPR6h3bXnN4b7b2U";
const CLOUDINARY_UPLOAD_PRESET = "Boom";
const CLOUDINARY_FOLDER = "samples/new";
```

### Database Connection (PostgreSQL)
```bash
# Render PostgreSQL Database
Host: dpg-cs3b4p2j1k6c73cku3n0-a.oregon-postgres.render.com
Port: 5432
Database: video_face_blur_db
Username: video_face_blur_user
Password: x3M2KmQqN5l8bF1z9mP3wQ7sR2tY6vN
SSL: Required
```

### Redis Configuration (Background Jobs)
```bash
# Render Redis
Host: red-cs3b4p2j1k6c73cku3n0-a.oregon-redis.render.com
Port: 6379
Password: x3M2KmQqN5l8bF1z9mP3wQ7sR2tY6vN
SSL: Required
```

### Quick Setup for Frontend Developers

#### 1. Authentication Flow
```javascript
// Register new user
const registerUser = async (email, password) => {
  const response = await fetch('https://facecensor.onrender.com/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return response.json();
};

// Login and get JWT token
const loginUser = async (email, password) => {
  const response = await fetch('https://facecensor.onrender.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  localStorage.setItem('jwtToken', data.token);
  return data;
};
```

#### 2. Video Upload with Frame Processing
```javascript
// Upload video with custom frame processing
const uploadVideo = async (file, options = {}) => {
  const formData = new FormData();
  formData.append('video', file);
  formData.append('frameNumber', options.frameNumber || 1);
  formData.append('blurIntensity', options.blurIntensity || 30);
  formData.append('processingMode', options.processingMode || 'blur');
  
  const token = localStorage.getItem('jwtToken');
  const response = await fetch('https://facecensor.onrender.com/api/videos/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  return response.json();
};
```

#### 3. Check Processing Status
```javascript
// Poll for video processing status
const checkVideoStatus = async (videoId) => {
  const token = localStorage.getItem('jwtToken');
  const response = await fetch(`https://facecensor.onrender.com/api/videos/${videoId}/status`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

#### 4. Get User Videos
```javascript
// Fetch user's video list
const getUserVideos = async () => {
  const token = localStorage.getItem('jwtToken');
  const response = await fetch('https://facecensor.onrender.com/api/videos', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

#### 5. Reprocess Video with Different Settings
```javascript
// Reprocess video with new frame settings
const reprocessVideo = async (videoId, options) => {
  const token = localStorage.getItem('jwtToken');
  const response = await fetch(`https://facecensor.onrender.com/api/videos/${videoId}/reprocess`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      frameNumber: options.frameNumber || 1,
      blurIntensity: options.blurIntensity || 30,
      processingMode: options.processingMode || 'blur'
    })
  });
  return response.json();
};
```

### Cloudinary Direct Upload (Optional)
```javascript
// Direct upload to Cloudinary for better UX
const uploadToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'Boom');
  formData.append('folder', 'samples/new');
  
  const response = await fetch('https://api.cloudinary.com/v1_1/dzfd6igiw/video/upload', {
    method: 'POST',
    body: formData
  });
  return response.json();
};
```

### Error Handling & Troubleshooting
```javascript
// Handle API errors consistently
const handleApiError = (error) => {
  if (error.response?.status === 401) {
    // Token expired, redirect to login
    localStorage.removeItem('jwtToken');
    window.location.href = '/login';
  } else if (error.response?.status === 403) {
    // Insufficient credits
    alert('Insufficient credits. Please purchase more credits.');
  } else if (error.response?.status === 400) {
    // Validation error
    alert(error.response.data.error.message);
  } else if (error.response?.status === 500) {
    // Server error - check the actual error message
    console.error('Server Error:', error.response.data);
    alert(`Server Error: ${error.response.data?.error?.message || 'Internal server error'}`);
  } else {
    // Generic error
    alert('An error occurred. Please try again.');
  }
};
```

### Common Issues & Solutions

**500 Authentication Error**: 
- Make sure you're using the exact credentials provided above
- Check that your JWT token is properly formatted
- Ensure you're sending the Authorization header correctly

**CORS Issues**: 
- Backend is configured to allow all origins (`origin: true`)
- No additional CORS configuration needed on frontend

**Database Connection Issues**:
- Backend will continue running even if database fails
- Some features may be limited but core functionality works

## 📋 Environment Variables

### Required Authentication
```bash
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
API_KEY_SECRET=your-api-key-secret-minimum-32-characters
WEBHOOK_SECRET=your-webhook-secret-minimum-32-characters
```

### Database & Storage
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/video_face_blur
REDIS_URL=redis://localhost:6379
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Server Configuration
```bash
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
CORS_ORIGIN=https://facecensor.onrender.com
```

### Processing Limits
```bash
MAX_CONCURRENT_JOBS=3
VIDEO_MAX_SIZE=524288000
MAX_VIDEO_DURATION=300
```

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  api_key VARCHAR(255) UNIQUE NOT NULL,
  credits INTEGER DEFAULT 0,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Videos Table
```sql
CREATE TABLE videos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  original_filename VARCHAR(255) NOT NULL,
  cloudinary_url VARCHAR(500),
  cloudinary_public_id VARCHAR(255),
  processed_url VARCHAR(500),
  processed_public_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  duration INTEGER,
  file_size BIGINT,
  faces_detected INTEGER DEFAULT 0,
  processing_progress INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🎥 Video Processing Flow

1. **Upload**: User uploads video via `/api/videos/upload`
2. **Validation**: Video validated for format, size, duration
3. **Storage**: Original video uploaded to Cloudinary
4. **Queue**: Processing job added to Bull queue
5. **Processing**: Worker downloads video and extracts frames
6. **Analysis**: Video analyzed to get total frame count and metadata
7. **Frame Extraction**: Specific frame extracted for screenshot (configurable frame number)
8. **Face Detection**: AI detects faces in extracted frame
9. **Frame Blurring**: Faces blurred in screenshot using Canvas API with configurable intensity
10. **Upload Screenshot**: Blurred screenshot uploaded to Cloudinary
11. **Update**: Database updated with frame count, screenshot URL, and face detection results
12. **Notification**: Webhook sent, Socket.IO update emitted

### Frame Screenshot Feature

The application now supports extracting and processing specific frames from videos:

- **Configurable Frame Number**: Specify which frame to extract (default: 1st frame)
- **Face Detection**: Automatic face detection on the extracted frame
- **Processing Modes**:
  - **Face Blur**: Faces are blurred in the screenshot using configurable intensity (1-100)
  - **Black Bar**: Eyes and nose area covered with black bars for enhanced privacy
- **Cloudinary Storage**: Screenshots are uploaded to Cloudinary for easy access
- **API Response**: Frame screenshot URL, total frame count, and processing mode included in video status

**Usage Examples:**

```bash
# Upload video and extract 5th frame with face blur (default)
curl -X POST http://localhost:3000/api/videos/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "video=@your-video.mp4" \
  -F "frameNumber=5" \
  -F "blurIntensity=30" \
  -F "processingMode=blur"

# Upload video and extract 5th frame with black bar mode
curl -X POST http://localhost:3000/api/videos/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "video=@your-video.mp4" \
  -F "frameNumber=5" \
  -F "processingMode=blackbar"

# Reprocess video with different frame number and mode
curl -X POST http://localhost:3000/api/videos/VIDEO_ID/reprocess \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"frameNumber": 10, "blurIntensity": 40, "processingMode": "blackbar"}'
```

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- --testNamePattern="authentication"
```

### Manual Testing
```bash
# Register user
curl -X POST https://facecensor.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}'

# Upload video
curl -X POST https://facecensor.onrender.com/api/videos/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "video=@test-video.mp4" \
  -F "blur_all_faces=true"

# Check status
curl -X GET https://facecensor.onrender.com/api/videos/1/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🚀 Deployment

### Render Deployment (Recommended)
1. Connect GitHub repository to Render
2. Create PostgreSQL database service
3. Create Redis service
4. Deploy web service with auto-deploy
5. Deploy worker service
6. Configure environment variables

### Manual Deployment
```bash
# Build for production
npm run build

# Start production server
NODE_ENV=production npm start

# Start production worker
NODE_ENV=production npm run worker
```

### Docker Deployment
```bash
# Build image
docker build -t video-face-blur-api .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  video-face-blur-api
```

## 📊 Monitoring & Logging

### Log Files
- `logs/error.log` - Error level logs
- `logs/combined.log` - All logs
- Console output in development

### Health Checks
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system status

### Metrics
- Queue statistics via `/api/admin/queue-stats`
- Processing metrics logged to Winston
- Real-time updates via Socket.IO

## 🔒 Security Features

- **Password Hashing**: bcrypt with 12 rounds
- **JWT Tokens**: 24-hour expiration
- **Rate Limiting**: Configurable per endpoint
- **Input Validation**: Joi schemas
- **File Upload Limits**: Size and type restrictions
- **CORS**: Configurable origins
- **Helmet**: Security headers
- **Environment Variables**: No hardcoded secrets

## 📁 Cloudinary Integration

### Supported File Types
- **Videos**: MP4, AVI, MOV, WMV, FLV, WebM, and more
- **Images**: JPG, PNG, GIF, WebP, SVG, and more
- **Maximum file size**: 100MB (configurable)

### Cloudinary Features
- **Automatic optimization** and format conversion
- **Secure storage** with automatic backup
- **Global CDN** for fast delivery
- **On-the-fly transformations** and effects
- **Automatic video transcoding**

### Demo Mode
When database is unavailable, the API automatically switches to demo mode:
- ✅ Authentication works with demo credentials
- ✅ Video registration from Cloudinary URLs
- ✅ Video status and listing endpoints
- ✅ All API endpoints return demo data
- ❌ Actual video processing is disabled
- ❌ Database operations are simulated

**Demo Credentials:**
- Email: `demo@example.com`
- Password: `demo123`

## 🛠️ Troubleshooting

### Common Issues

**"JWT_SECRET and API_KEY_SECRET environment variables are required"**
- Set both secrets in your `.env` file (minimum 32 characters)

**Database connection failed**
- Verify PostgreSQL is running and accessible
- Check `DATABASE_URL` format
- Ensure database exists
- **Demo Mode**: If database is unavailable, the API automatically switches to demo mode with limited functionality

**Redis connection failed**
- Verify Redis server is running
- Check `REDIS_URL` format

**FFmpeg not found**
- Install FFmpeg: `apt-get install ffmpeg` (Ubuntu) or `brew install ffmpeg` (macOS)

**Face detection models missing**
- Run: `npm run download-models`

**Cloudinary Configuration**
- Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in your `.env` file
- Cloudinary supports all video formats and provides automatic optimization
- Videos are stored securely with automatic backup and CDN delivery

### Debug Mode & Logging

```bash
# Enable debug logging
LOG_LEVEL=debug npm start

# Test database connection
node -e "require('./src/config/database').testConnection()"

# View logs in real-time
tail -f logs/combined.log

# View error logs specifically
tail -f logs/error.log
```

### Accessing Logs

**Local Development:**
- Combined logs: `logs/combined.log`
- Error logs: `logs/error.log`
- Console output: Terminal window running the server

**Production/Render:**
- Use `render logs` command or check the Render dashboard
- Logs include authentication attempts, API calls, and processing events
- Look for "demo mode" indicators when database is unavailable

**Log Levels:**
- `error`: Critical errors only
- `warn`: Warnings and important events (default)
- `info`: General information and API calls
- `debug`: Detailed debugging information

**Common Log Patterns:**
```
# Successful authentication
info: Authentication successful (demo mode) {"userId": 123, "email": "demo@example.com"}

# Video registration
info: Video registration request received {"userId": 123, "filename": "video.mp4", "demoMode": true}

# Database unavailable (automatic fallback)
warn: Database not available, using demo user from token {"userId": 123, "email": "demo@example.com"}
```

## 📚 Additional Resources

- [API Documentation](./docs/API.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Authentication Guide](./SETUP_GUIDE.md)
- [Contributing Guidelines](./CONTRIBUTING.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📧 Email: support@yourapp.com
- 💬 Discord: [Join Server](https://discord.gg/yourserver)
- 📖 Documentation: [Full Docs](https://docs.yourapp.com)

---

**⭐ Star this repo if you find it helpful!**