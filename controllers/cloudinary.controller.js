import cloudinary from '../config/cloudinary.config.js';

export const uploadSingleImage = async (req, res) => {
  try {
    console.log('🔥 File received:', req.file);

    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Extract the Cloudinary URL from the uploaded file
    const imageUrl = req.file.path; // Cloudinary stores the URL in file.path
    const publicId = req.file.filename; // Cloudinary stores the public ID in file.filename

    return res.json({
      message: 'Upload successful',
      data: {
        secureUrl: imageUrl,  // ✅ This matches what your frontend expects
        publicId: publicId,
        format: req.file.format,
        width: req.file.width,
        height: req.file.height
      }
    });

  } catch (error) {
    console.error('💥 Upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
};

export const uploadMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFiles = req.files.map(file => ({
      url: file.path,
      publicId: file.filename,
      format: file.format,
      width: file.width,
      height: file.height
    }));

    res.json({
      success: true,
      message: 'Images uploaded successfully',
      data: uploadedFiles
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload images' });
  }
};

export const deleteImage = async (req, res) => {
  try {
    const { publicId } = req.params;
    
    if (!publicId) {
      return res.status(400).json({ error: 'Public ID is required' });
    }

    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'not found') {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json({
      success: true,
      message: 'Image deleted successfully',
      result
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
};