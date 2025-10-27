import multer from 'multer';

export const uploadErrorHandler = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File too large. Maximum size is 5MB' 
      });
    }
    return res.status(400).json({ error: error.message });
  }
  
  if (error) {
    return res.status(500).json({ error: 'Something went wrong' });
  }
  
  next();
};