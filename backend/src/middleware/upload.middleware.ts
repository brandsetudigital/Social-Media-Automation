import multer from 'multer';

// Store uploaded image in memory buffer for instant AI processing
const storage = multer.memoryStorage();

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];

export const imageUploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB max file size
  },
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported image format "${file.mimetype}". Allowed: JPG, PNG, WEBP, GIF, BMP`));
    }
  },
});
