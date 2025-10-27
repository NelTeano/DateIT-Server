import express from 'express';
import { upload } from '../middlewares/upload.middleware.js';
import { 
  uploadSingleImage, 
  uploadMultipleImages, 
  deleteImage 
} from '../controllers/cloudinary.controller.js';

const router = express.Router();

// Single image upload
router.post('/upload', upload.single('image'), uploadSingleImage);

// Multiple images upload
router.post('/upload-multiple', upload.array('images', 10), uploadMultipleImages);

// Delete image
router.delete('/delete/:publicId', deleteImage);

export default router;