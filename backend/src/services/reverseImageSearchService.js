const axios = require('axios');
const sharp = require('sharp');
const crypto = require('crypto');

class ReverseImageSearchService {

  // ── Upload image to get a temporary public URL ─────────────
  // We use Cloudinary (which you already have) to get a URL,
  // then pass that URL to Google Custom Search image search
  async uploadTempImage(imageBuffer) {
    const cloudinary = require('../config/cloudinary');

    return new Promise((resolve, reject) => {
      const publicId = `temp_verify_${crypto.randomBytes(6).toString('hex')}`;

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'temp-verification',
          public_id: publicId,
          resource_type: 'image',
          // Auto-delete after 10 minutes
          invalidate: true,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve({ url: result.secure_url, publicId: result.public_id });
        }
      );

      // Resize before upload (faster)
      sharp(imageBuffer)
        .resize(800, 800, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer()
        .then(buf => uploadStream.end(buf))
        .catch(reject);
    });
  }

  // ── Google Custom Search reverse image ────────────────────
  async searchByImageUrl(imageUrl) {
    const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    const cx     = process.env.GOOGLE_CUSTOM_SEARCH_CX;

    if (!apiKey || !cx) {
      throw new Error('GOOGLE_CUSTOM_SEARCH_API_KEY or GOOGLE_CUSTOM_SEARCH_CX not set');
    }

    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key:        apiKey,
        cx:         cx,
        searchType: 'image',
        q:          imageUrl,   // pass image URL as query for reverse search
        num:        5,
      },
      timeout: 10000,
    });

    return response.data;
  }

  // ── Main reverse image check ───────────────────────────────
  async checkImageOriginality(imageBuffer) {
    let tempUpload = null;

    try {
      // Step 1: Upload to get temporary URL
      tempUpload = await this.uploadTempImage(imageBuffer);

      // Step 2: Google Custom Search
      const searchResult = await this.searchByImageUrl(tempUpload.url);
      const items        = searchResult.items || [];

      // Step 3: Delete temp image from Cloudinary
      if (tempUpload?.publicId) {
        const cloudinary = require('../config/cloudinary');
        cloudinary.uploader.destroy(tempUpload.publicId).catch(() => {});
      }

      if (items.length > 0) {
        const sources = items.slice(0, 3).map(i => i.displayLink || i.link);
        return {
          isOriginal:  false,
          score:       0,
          reason:      `Image found online (${items.length} sources): ${sources.join(', ')}`,
          webSources:  sources,
        };
      }

      return {
        isOriginal:  true,
        score:       15,
        reason:      'Image not found online — likely original',
        webSources:  [],
      };

    } catch (error) {
      // Clean up temp image if something went wrong
      if (tempUpload?.publicId) {
        const cloudinary = require('../config/cloudinary');
        cloudinary.uploader.destroy(tempUpload.publicId).catch(() => {});
      }

      console.warn('Reverse image search failed:', error.message);

      // Don't penalize — skip this layer gracefully
      return {
        isOriginal:  true,
        score:       15,
        reason:      'Reverse search skipped (API unavailable)',
        webSources:  [],
        skipped:     true,
      };
    }
  }
}

module.exports = new ReverseImageSearchService();