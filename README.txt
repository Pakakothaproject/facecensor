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
CORS_ORIGIN=http://localhost:3000
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
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}'

# Upload video
curl -X POST http://localhost:3000/api/videos/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "video=@test-video.mp4" \
  -F "blur_all_faces=true"

# Check status
curl -X GET http://localhost:3000/api/videos/1/status \
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

## 🛠️ Troubleshooting

### Common Issues

**"JWT_SECRET and API_KEY_SECRET environment variables are required"**
- Set both secrets in your `.env` file (minimum 32 characters)

**Database connection failed**
- Verify PostgreSQL is running and accessible
- Check `DATABASE_URL` format
- Ensure database exists

**Redis connection failed**
- Verify Redis server is running
- Check `REDIS_URL` format

**FFmpeg not found**
- Install FFmpeg: `apt-get install ffmpeg` (Ubuntu) or `brew install ffmpeg` (macOS)

**Face detection models missing**
- Run: `npm run download-models`

### Debug Mode
```bash
# Enable debug logging
LOG_LEVEL=debug npm start

# Test database connection
node -e "require('./src/config/database').testConnection()"
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