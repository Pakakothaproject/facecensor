const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('cloudinary').v2;
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { addVideoProcessingJob } = require('../services/queue');
const { logger } = require('../utils/logger');
const Joi = require('joi');

const router = express.Router();

// Configure Cloudinary with hardcoded credentials
cloudinary.config({
  cloud_name: 'dzfd6igiw',
  api_key: '441935579452539',
  api_secret: 'jvnxDIoNZYLFJ_OOQ57RM8aoY'
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.VIDEO_MAX_SIZE) || 100 * 1024 * 1024 // 100MB default
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'), false);
    }
  }
});

// Register video from Cloudinary URL (for frontend that uploads directly to Cloudinary)
router.post('/register', authenticateToken, async (req, res) => {
  try {
    const { cloudinaryUrl, filename, frameNumber, blurIntensity, processingMode } = req.body;
    const userId = req.user.id;

    // Log the incoming request for debugging
    logger.info('Video registration request received', { 
      userId, 
      filename, 
      frameNumber, 
      blurIntensity, 
      processingMode,
      cloudinaryUrl: cloudinaryUrl ? 'provided' : 'missing',
      demoMode: req.user.demo_mode || false
    });

    // Validate required fields
    if (!cloudinaryUrl || !filename) {
      logger.warn('Video registration failed: missing required fields', { 
        userId, 
        hasCloudinaryUrl: !!cloudinaryUrl, 
        hasFilename: !!filename 
      });
      return res.status(400).json({ error: 'Cloudinary URL and filename are required' });
    }

    // Validate Cloudinary URL format
    if (!cloudinaryUrl.startsWith('https://res.cloudinary.com/')) {
      logger.warn('Video registration failed: invalid Cloudinary URL format', { 
        userId, 
        cloudinaryUrl 
      });
      return res.status(400).json({ error: 'Invalid Cloudinary URL format' });
    }

    const videoId = uuidv4();
    logger.info('Registering video from Cloudinary URL', { userId, videoId, cloudinaryUrl });

    // Try to create video record in database, fallback to demo mode if unavailable
    let video;
    try {
      const result = await query(
        `INSERT INTO videos (id, user_id, filename, input_url, status, upload_progress, processing_progress, blur_intensity, processing_mode) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
         RETURNING *`,
        [
          videoId,
          userId,
          filename || 'uploaded-video.mp4',
          cloudinaryUrl,
          'uploaded',
          100,
          0,
          parseInt(blurIntensity) || 25,
          processingMode || 'blur'
        ]
      );
      video = result.rows[0];
      logger.info('Video record created in database', { userId, videoId });
    } catch (dbError) {
      // Database not available, create demo video record
      logger.warn('Database not available, creating demo video record', { userId, videoId, error: dbError.message });
      
      video = {
        id: videoId,
        user_id: userId,
        filename: filename || 'demo-video.mp4',
        input_url: cloudinaryUrl,
        status: 'uploaded',
        upload_progress: 100,
        processing_progress: 0,
        blur_intensity: parseInt(blurIntensity) || 25,
        processing_mode: processingMode || 'blur',
        created_at: new Date().toISOString(),
        demo_mode: true
      };
    }

    // Try to add video processing job to queue, but don't fail if queue is unavailable
    try {
      await addVideoProcessingJob({
        videoId,
        inputUrl: cloudinaryUrl,
        options: {
          frameNumber: parseInt(frameNumber) || 1,
          blurIntensity: parseInt(blurIntensity) || 25,
          processingMode: processingMode || 'blur'
        }
      });
      logger.info('Video processing job queued', { userId, videoId });
    } catch (queueError) {
      logger.warn('Failed to queue video processing job', { userId, videoId, error: queueError.message });
      // Continue without processing - frontend can handle this
    }

    logger.info('Video registration completed successfully', { userId, videoId });

    res.json({
      success: true,
      video: {
        id: video.id,
        filename: video.filename,
        status: video.status,
        uploadProgress: video.upload_progress,
        processingProgress: video.processing_progress,
        createdAt: video.created_at,
        frameNumber: parseInt(frameNumber) || 1,
        blurIntensity: parseInt(blurIntensity) || 25,
        processingMode: processingMode || 'blur',
        demo_mode: video.demo_mode || false,
        message: video.demo_mode ? 'Video registered successfully (demo mode - processing unavailable)' : 'Video registered successfully'
      }
    });

  } catch (error) {
    logger.error('Video registration failed:', error);
    res.status(500).json({ error: 'Video registration failed', message: error.message });
  }
});

// Upload video endpoint
router.post('/upload', authenticateToken, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const { frameNumber, blurIntensity, processingMode } = req.body;
    const userId = req.user.id;
    const videoId = uuidv4();
    
    logger.info('Uploading video', { userId, videoId, filename: req.file.originalname });

    // Upload to Cloudinary with custom settings
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',
          folder: 'samples/new',
          public_id: videoId,
          overwrite: true,
          use_filename: false,
          unique_filename: false,
          eager: [
            { format: 'mp4', quality: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      
      uploadStream.end(req.file.buffer);
    });

    logger.info('Video uploaded to Cloudinary successfully', { userId, videoId, url: uploadResult.secure_url });

    // Try to create video record in database, fallback to demo mode if unavailable
    let video;
    try {
      const result = await query(
        `INSERT INTO videos (id, user_id, filename, input_url, status, upload_progress, processing_progress, blur_intensity, processing_mode) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
         RETURNING *`,
        [
          videoId,
          userId,
          req.file.originalname,
          uploadResult.secure_url,
          'uploaded',
          100,
          0,
          parseInt(blurIntensity) || 25,
          processingMode || 'blur'
        ]
      );
      video = result.rows[0];
      logger.info('Video record created in database', { userId, videoId });
    } catch (dbError) {
      // Database not available, create demo video record
      logger.warn('Database not available, creating demo video record', { userId, videoId, error: dbError.message });
      
      video = {
        id: videoId,
        user_id: userId,
        filename: req.file.originalname,
        input_url: uploadResult.secure_url,
        status: 'uploaded',
        upload_progress: 100,
        processing_progress: 0,
        blur_intensity: parseInt(blurIntensity) || 25,
        processing_mode: processingMode || 'blur',
        created_at: new Date().toISOString(),
        demo_mode: true
      };
    }

    // Try to add video processing job to queue, but don't fail if queue is unavailable
    try {
      await addVideoProcessingJob({
        videoId,
        inputUrl: uploadResult.secure_url,
        options: {
          frameNumber: parseInt(frameNumber) || 1,
          blurIntensity: parseInt(blurIntensity) || 25,
          processingMode: processingMode || 'blur'
        }
      });
      logger.info('Video processing job queued', { userId, videoId });
    } catch (queueError) {
      logger.warn('Failed to queue video processing job', { userId, videoId, error: queueError.message });
      // Continue without processing - frontend can handle this
    }

    logger.info('Video upload completed successfully', { userId, videoId });

    res.json({
      success: true,
      video: {
        id: video.id,
        filename: video.filename,
        status: video.status,
        uploadProgress: video.upload_progress,
        processingProgress: video.processing_progress,
        createdAt: video.created_at,
        frameNumber: parseInt(frameNumber) || 1,
        blurIntensity: parseInt(blurIntensity) || 25,
        processingMode: processingMode || 'blur',
        demo_mode: video.demo_mode || false,
        message: video.demo_mode ? 'Video uploaded successfully (demo mode - processing unavailable)' : 'Video uploaded successfully'
      }
    });

  } catch (error) {
    logger.error('Video upload failed:', error);
    res.status(500).json({ error: 'Video upload failed', message: error.message });
  }
});

// Get video status
router.get('/:videoId', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.user.id;

    // Check if this is a demo mode user
    if (req.user.demo_mode) {
      logger.info('Demo mode: Returning demo video status', { userId, videoId });
      
      // Return a demo video status
      const demoVideo = {
        id: videoId,
        filename: 'demo-video.mp4',
        status: 'completed',
        uploadProgress: 100,
        processingProgress: 100,
        facesDetected: 2,
        totalFrames: 150,
        frameScreenshotUrl: 'https://via.placeholder.com/640x360?text=Demo+Frame',
        blurIntensity: 25,
        processingMode: 'blur',
        inputUrl: 'https://via.placeholder.com/640x360?text=Demo+Input',
        outputUrl: 'https://via.placeholder.com/640x360?text=Demo+Output',
        errorMessage: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
        demo_mode: true
      };

      return res.json({
        success: true,
        video: demoVideo
      });
    }

    const result = await query(
      'SELECT * FROM videos WHERE id = $1 AND user_id = $2',
      [videoId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const video = result.rows[0];

    res.json({
      success: true,
      video: {
        id: video.id,
        filename: video.filename,
        status: video.status,
        uploadProgress: video.upload_progress,
        processingProgress: video.processing_progress,
        facesDetected: video.faces_detected,
        totalFrames: video.total_frames,
        frameScreenshotUrl: video.frame_screenshot_url,
        blurIntensity: video.blur_intensity,
        processingMode: video.processing_mode,
        inputUrl: video.input_url,
        outputUrl: video.output_url,
        errorMessage: video.error_message,
        createdAt: video.created_at,
        updatedAt: video.updated_at,
        processedAt: video.processed_at
      }
    });

  } catch (error) {
    logger.error('Get video status failed:', error);
    
    // Fallback for database errors
    if (req.user.demo_mode) {
      logger.info('Demo mode: Returning demo video status due to database error', { userId, videoId });
      return res.json({
        success: true,
        video: {
          id: videoId,
          filename: 'demo-video.mp4',
          status: 'completed',
          uploadProgress: 100,
          processingProgress: 100,
          facesDetected: 2,
          totalFrames: 150,
          frameScreenshotUrl: 'https://via.placeholder.com/640x360?text=Demo+Frame',
          blurIntensity: 25,
          processingMode: 'blur',
          inputUrl: 'https://via.placeholder.com/640x360?text=Demo+Input',
          outputUrl: 'https://via.placeholder.com/640x360?text=Demo+Output',
          errorMessage: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          processedAt: new Date().toISOString(),
          demo_mode: true
        }
      });
    }
    
    res.status(500).json({ error: 'Failed to get video status', message: error.message });
  }
});

// Get all videos for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Check if this is a demo mode user
    if (req.user.demo_mode) {
      logger.info('Demo mode: Returning demo video list', { userId });
      
      // Return a demo video list
      const demoVideos = [
        {
          id: 'demo-video-1',
          filename: 'demo-video-1.mp4',
          status: 'completed',
          uploadProgress: 100,
          processingProgress: 100,
          facesDetected: 2,
          totalFrames: 150,
          frameScreenshotUrl: 'https://via.placeholder.com/640x360?text=Demo+Frame+1',
          blurIntensity: 25,
          inputUrl: 'https://via.placeholder.com/640x360?text=Demo+Input+1',
          outputUrl: 'https://via.placeholder.com/640x360?text=Demo+Output+1',
          errorMessage: null,
          createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          updatedAt: new Date().toISOString(),
          processedAt: new Date().toISOString(),
          demo_mode: true
        },
        {
          id: 'demo-video-2',
          filename: 'demo-video-2.mp4',
          status: 'processing',
          uploadProgress: 100,
          processingProgress: 45,
          facesDetected: 1,
          totalFrames: 120,
          frameScreenshotUrl: 'https://via.placeholder.com/640x360?text=Demo+Frame+2',
          blurIntensity: 30,
          inputUrl: 'https://via.placeholder.com/640x360?text=Demo+Input+2',
          outputUrl: null,
          errorMessage: null,
          createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          updatedAt: new Date().toISOString(),
          processedAt: null,
          demo_mode: true
        }
      ];

      return res.json({
        success: true,
        videos: demoVideos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: demoVideos.length
        }
      });
    }

    const result = await query(
      'SELECT * FROM videos WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );

    const videos = result.rows.map(video => ({
      id: video.id,
      filename: video.filename,
      status: video.status,
      uploadProgress: video.upload_progress,
      processingProgress: video.processing_progress,
      facesDetected: video.faces_detected,
      totalFrames: video.total_frames,
      frameScreenshotUrl: video.frame_screenshot_url,
      blurIntensity: video.blur_intensity,
      inputUrl: video.input_url,
      outputUrl: video.output_url,
      errorMessage: video.error_message,
      createdAt: video.created_at,
      updatedAt: video.updated_at,
      processedAt: video.processed_at
    }));

    res.json({
      success: true,
      videos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: videos.length
      }
    });

  } catch (error) {
    logger.error('Get videos failed:', error);
    
    // Fallback for database errors
    if (req.user.demo_mode) {
      logger.info('Demo mode: Returning demo video list due to database error', { userId });
      
      const demoVideos = [
        {
          id: 'demo-video-1',
          filename: 'demo-video-1.mp4',
          status: 'completed',
          uploadProgress: 100,
          processingProgress: 100,
          facesDetected: 2,
          totalFrames: 150,
          frameScreenshotUrl: 'https://via.placeholder.com/640x360?text=Demo+Frame+1',
          blurIntensity: 25,
          inputUrl: 'https://via.placeholder.com/640x360?text=Demo+Input+1',
          outputUrl: 'https://via.placeholder.com/640x360?text=Demo+Output+1',
          errorMessage: null,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
          processedAt: new Date().toISOString(),
          demo_mode: true
        }
      ];

      return res.json({
        success: true,
        videos: demoVideos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: demoVideos.length
        }
      });
    }
    
    res.status(500).json({ error: 'Failed to get videos', message: error.message });
  }
});

// Reprocess video with different frame number
router.post('/:videoId/reprocess', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { frameNumber, blurIntensity, processingMode } = req.body;
    const userId = req.user.id;

    // Check if this is a demo mode user
    if (req.user.demo_mode) {
      logger.info('Demo mode: Simulating video reprocessing', { userId, videoId });
      
      // Return a simulated reprocessing response
      return res.json({
        success: true,
        message: 'Video reprocessing started (demo mode - processing unavailable)',
        video: {
          id: videoId,
          status: 'processing',
          processingProgress: 0,
          frameNumber: parseInt(frameNumber) || 1,
          blurIntensity: parseInt(blurIntensity) || 25,
          processingMode: processingMode || 'blur',
          demo_mode: true
        }
      });
    }

    // Check if video exists and belongs to user
    const videoResult = await query(
      'SELECT * FROM videos WHERE id = $1 AND user_id = $2',
      [videoId, userId]
    );

    if (videoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const video = videoResult.rows[0];

    // Delete existing screenshot from Cloudinary if it exists
    if (video.frame_screenshot_public_id) {
      try {
        await cloudinary.uploader.destroy(video.frame_screenshot_public_id);
      } catch (error) {
        logger.warn('Failed to delete old screenshot:', error);
      }
    }

    // Reset video processing status
    await query(
      `UPDATE videos 
       SET status = $1, 
           processing_progress = $2,
           faces_detected = $3,
           frame_screenshot_url = $4,
           frame_screenshot_public_id = $5,
           blur_intensity = $6,
           updated_at = NOW()
       WHERE id = $7`,
      ['uploaded', 0, 0, null, null, parseInt(blurIntensity) || 25, processingMode || 'blur', videoId]
    );

    // Delete existing face detections
    await query('DELETE FROM faces WHERE video_id = $1', [videoId]);

    // Add new processing job
    await addVideoProcessingJob({
      videoId,
      inputUrl: video.input_url,
      options: {
        frameNumber: parseInt(frameNumber) || 1,
        blurIntensity: parseInt(blurIntensity) || 25,
        processingMode: processingMode || 'blur'
      }
    });

    logger.info('Video reprocessing started', { userId, videoId, frameNumber, blurIntensity, processingMode });

    res.json({
      success: true,
      message: 'Video reprocessing started',
      video: {
        id: videoId,
        status: 'uploaded',
        processingProgress: 0,
        frameNumber: parseInt(frameNumber) || 1,
        blurIntensity: parseInt(blurIntensity) || 25,
        processingMode: processingMode || 'blur'
      }
    });

  } catch (error) {
    logger.error('Video reprocessing failed:', error);
    
    // Fallback for database errors
    if (req.user.demo_mode) {
      logger.info('Demo mode: Simulating video reprocessing due to database error', { userId, videoId });
      return res.json({
        success: true,
        message: 'Video reprocessing started (demo mode - processing unavailable)',
        video: {
          id: videoId,
          status: 'processing',
          processingProgress: 0,
          frameNumber: parseInt(frameNumber) || 1,
          blurIntensity: parseInt(blurIntensity) || 25,
          processingMode: processingMode || 'blur',
          demo_mode: true
        }
      });
    }
    
    res.status(500).json({ error: 'Video reprocessing failed', message: error.message });
  }
});

// Delete video
router.delete('/:videoId', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.user.id;

    // Check if this is a demo mode user
    if (req.user.demo_mode) {
      logger.info('Demo mode: Simulating video deletion', { userId, videoId });
      
      // Return a simulated deletion response
      return res.json({
        success: true,
        message: 'Video deleted successfully (demo mode - deletion simulated)'
      });
    }

    // Get video to delete associated files
    const videoResult = await query(
      'SELECT * FROM videos WHERE id = $1 AND user_id = $2',
      [videoId, userId]
    );

    if (videoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const video = videoResult.rows[0];

    // Delete from Cloudinary
    try {
      if (video.input_url) {
        const publicId = video.input_url.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
      }
      
      if (video.output_url) {
        const publicId = video.output_url.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
      }
      
      if (video.frame_screenshot_public_id) {
        await cloudinary.uploader.destroy(video.frame_screenshot_public_id);
      }
    } catch (cloudinaryError) {
      logger.warn('Failed to delete from Cloudinary:', cloudinaryError);
    }

    // Delete from database
    await query('DELETE FROM faces WHERE video_id = $1', [videoId]);
    await query('DELETE FROM videos WHERE id = $1', [videoId]);

    logger.info('Video deleted', { userId, videoId });

    res.json({
      success: true,
      message: 'Video deleted successfully'
    });

  } catch (error) {
    logger.error('Delete video failed:', error);
    
    // Fallback for database errors
    if (req.user.demo_mode) {
      logger.info('Demo mode: Simulating video deletion due to database error', { userId, videoId });
      return res.json({
        success: true,
        message: 'Video deleted successfully (demo mode - deletion simulated)'
      });
    }
    
    res.status(500).json({ error: 'Failed to delete video', message: error.message });
  }
});

module.exports = router;