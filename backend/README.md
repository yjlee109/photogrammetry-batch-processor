# Photogrammetry Batch Processor - Backend

This is the Node.js/Express backend for the Photogrammetry Batch Processor.

## Features

- 📤 Image upload with validation
- 🔄 Meshroom integration
- 📊 Real-time processing status
- 💾 Project management
- 📥 Model download

## Project Structure

```
backend/
├── routes/
│   └── api.js                 # API endpoints
├── middleware/
│   └── upload.js              # Multer upload configuration
├── server.js                  # Express server
├── package.json
├── .env.example
├── .gitignore
└── Dockerfile
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Edit `.env` with your configuration:
```
MESHROOM_PATH=C:\Program Files\Meshroom\bin
UPLOAD_DIR=./uploads
PROJECTS_DIR=./projects
MIN_IMAGES=20
MAX_FILE_SIZE=50000000
PORT=5000
NODE_ENV=development
```

## Running

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Endpoints

### POST `/api/process`
Upload images and start batch processing

**Request:**
```
multipart/form-data
- projectName: string
- projectId: string
- images: File[] (multiple files)
```

**Response:**
```json
{
  "success": true,
  "projectId": "uuid",
  "projectName": "Project Name",
  "imageCount": 50,
  "message": "Processing started..."
}
```

### GET `/api/status/:projectId`
Get processing status

**Response:**
```json
{
  "projectId": "uuid",
  "projectName": "Project Name",
  "status": "processing",
  "imageCount": 50,
  "progress": 45,
  "currentStep": "Creating 3D Mesh...",
  "startTime": "2024-01-01T12:00:00Z",
  "outputPath": "./projects/uuid/output"
}
```

### GET `/api/projects`
List all projects

**Response:**
```json
{
  "projects": [...],
  "total": 5
}
```

### GET `/api/download/:projectId`
Download 3D model file

### GET `/api/health`
Health check

## Requirements

- Node.js 16+
- npm
- Meshroom installed on system

## Docker

Build and run with Docker:
```bash
docker build -t photogrammetry-backend .
docker run -p 5000:5000 photogrammetry-backend
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| MESHROOM_PATH | N/A | Path to Meshroom executable |
| UPLOAD_DIR | ./uploads | Directory for uploaded images |
| PROJECTS_DIR | ./projects | Directory for project data |
| MIN_IMAGES | 20 | Minimum required images |
| MAX_FILE_SIZE | 50000000 | Max file size in bytes |
| PORT | 5000 | Server port |
| NODE_ENV | development | Node environment |

## Dependencies

- `express` - Web framework
- `multer` - File upload middleware
- `cors` - CORS middleware
- `dotenv` - Environment variables
- `uuid` - ID generation
