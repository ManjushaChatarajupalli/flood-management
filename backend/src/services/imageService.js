// =============================================================
// IMAGE SERVICE — Upload to Cloudinary
// IMPORTANT: We keep the ORIGINAL buffer for EXIF reading.
//            Only the compressed version is uploaded to Cloudinary.
// =============================================================

const cloudinary = require('../config/cloudinary');
const sharp = require('sharp');

class ImageService {

  // ── Upload (compress → Cloudinary) ────────────────────────
  // Pass originalBuffer separately so EXIF is preserved for verification
  async uploadImage(originalBuffer, filename) {
    try {
      // Compress for storage (strips EXIF from upload, that's OK — we read EXIF first)
      const compressedBuffer = await sharp(originalBuffer)
        .resize(1920, 1920, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'flood-incidents',
            public_id: filename || `incident_${Date.now()}`,
            resource_type: 'image',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve({
              url: result.secure_url,
              publicId: result.public_id,
              width: result.width,
              height: result.height,
              format: result.format,
              bytes: result.bytes,
            });
          }
        );
        uploadStream.end(compressedBuffer);
      });
    } catch (error) {
      throw new Error('Image upload failed: ' + error.message);
    }
  }

  // ── Delete from Cloudinary ─────────────────────────────────
  async deleteImage(publicId) {
    try {
      await cloudinary.uploader.destroy(publicId);
      return true;
    } catch (error) {
      throw new Error('Image deletion failed: ' + error.message);
    }
  }

  // ── Extract thumbnail (for admin review panel) ─────────────
  async generateThumbnail(imageBuffer) {
    return sharp(imageBuffer)
      .resize(200, 200, { fit: 'cover' })
      .jpeg({ quality: 70 })
      .toBuffer();
  }
}

module.exports = new ImageService();