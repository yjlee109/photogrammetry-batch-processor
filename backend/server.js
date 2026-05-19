const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Create directories if they don't exist
const uploadsDir = process.env.UPLOAD_DIR || './uploads';
const projectsDir = path.join(uploadsDir, 'projects');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(projectsDir)) {
  fs.mkdirSync(projectsDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const projectDir = path.join(projectsDir, req.body.projectId);
    fs.mkdirSync(projectDir, { recursive: true });
    cb(null, path.join(projectDir, 'images'));
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || 52428800)
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/tiff'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and TIFF allowed.'));
    }
  }
});

// Store processing status
const processingStatus = {};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Upload and process images
app.post('/api/process', upload.array('images'), async (req, res) => {
  try {
    const projectId = req.body.projectId || uuidv4();
    const projectName = req.body.projectName || 'Untitled Project';
    const projectDir = path.join(projectsDir, projectId);
    const imagesDir = path.join(projectDir, 'images');

    // Validate image count
    const minImages = parseInt(process.env.MIN_IMAGES || 20);
    const imageCount = req.files.length;

    if (imageCount < minImages) {
      return res.status(400).json({
        error: `Not enough images. Minimum required: ${minImages}, got: ${imageCount}`
      });
    }

    // Initialize project metadata
    const projectMetadata = {
      projectId,
      projectName,
      createdAt: new Date().toISOString(),
      status: 'processing',
      imageCount,
      progress: 0
    };

    fs.writeFileSync(
      path.join(projectDir, 'metadata.json'),
      JSON.stringify(projectMetadata, null, 2)
    );

    processingStatus[projectId] = {
      status: 'processing',
      progress: 0,
      message: 'Initializing Meshroom...',
      imageCount
    };

    // Start Meshroom processing in background
    const meshRoomPath = process.env.MESHROOM_PATH || 'meshroom_photogrammetry';
    const outputDir = path.join(projectDir, 'output');
    fs.mkdirSync(outputDir, { recursive: true });

    const command = `"${meshRoomPath}" --input "${imagesDir}" --output "${outputDir}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Meshroom error:', error);
        processingStatus[projectId] = {
          status: 'error',
          message: 'Processing failed: ' + error.message
        };
      } else {
        console.log('Meshroom output:', stdout);
        processingStatus[projectId] = {
          status: 'completed',
          progress: 100,
          message: 'Processing completed successfully!',
          outputPath: outputDir
        };
      }
    });

    res.json({
      projectId,
      projectName,
      imageCount,
      message: 'Processing started. Check status for updates.',
      statusUrl: `/api/status/${projectId}`
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get processing status
app.get('/api/status/:projectId', (req, res) => {
  const { projectId } = req.params;
  const projectDir = path.join(projectsDir, projectId);

  if (!fs.existsSync(projectDir)) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const status = processingStatus[projectId] || {
    status: 'unknown',
    message: 'Status unavailable'
  };

  // Check if output files exist
  const outputDir = path.join(projectDir, 'output');
  const files = fs.existsSync(outputDir) ? fs.readdirSync(outputDir) : [];

  res.json({
    projectId,
    ...status,
    outputFiles: files
  });
});

// List all projects
app.get('/api/projects', (req, res) => {
  try {
    const projects = fs.readdirSync(projectsDir).filter(file => {
      const filePath = path.join(projectsDir, file);
      return fs.statSync(filePath).isDirectory();
    });

    const projectDetails = projects.map(projectId => {
      const metadataPath = path.join(projectsDir, projectId, 'metadata.json');
      if (fs.existsSync(metadataPath)) {
        return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      }
      return { projectId, status: 'unknown' };
    });

    res.json({ projects: projectDetails });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download project results
app.get('/api/download/:projectId', (req, res) => {
  const { projectId } = req.params;
  const projectDir = path.join(projectsDir, projectId);
  const outputDir = path.join(projectDir, 'output');

  if (!fs.existsSync(outputDir)) {
    return res.status(404).json({ error: 'Output not found. Processing may still be in progress.' });
  }

  const files = fs.readdirSync(outputDir);
  res.json({
    projectId,
    files,
    message: 'Download files from the output directory'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Photogrammetry Batch Processor Backend running on port ${PORT}`);
  console.log(`📁 Upload directory: ${uploadsDir}`);
  console.log(`🔧 Meshroom path: ${process.env.MESHROOM_PATH}`);
});
