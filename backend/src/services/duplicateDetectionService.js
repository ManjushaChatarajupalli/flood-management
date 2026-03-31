// =============================================================
// DUPLICATE DETECTION SERVICE — Layer 4
// Uses MD5 (exact match) + pHash (near-duplicate / similar images)
// =============================================================

const crypto = require('crypto');
const sharp = require('sharp');
const Incident = require('../models/Incident');
const { Op } = require('sequelize');

class DuplicateDetectionService {

  // ── MD5 Exact Hash ─────────────────────────────────────────
  generateMD5Hash(imageBuffer) {
    return crypto.createHash('md5').update(imageBuffer).digest('hex');
  }

  // ── Perceptual Hash (pHash) ────────────────────────────────
  // Resize to 8x8 grayscale → compute average brightness → 64-bit hash
  // Detects near-duplicates (same image, different compression/crop)
  async generatePHash(imageBuffer) {
    try {
      // Resize to 8x8 grayscale
      const { data } = await sharp(imageBuffer)
        .resize(8, 8, { fit: 'fill' })
        .grayscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const pixels = Array.from(data);
      const avg = pixels.reduce((sum, p) => sum + p, 0) / pixels.length;

      // Build 64-bit binary string
      const hashBits = pixels.map(p => (p >= avg ? '1' : '0')).join('');

      // Convert to hex
      const hex = parseInt(hashBits, 2).toString(16).padStart(16, '0');
      return hex;
    } catch (error) {
      console.warn('pHash generation failed:', error.message);
      return null;
    }
  }

  // ── Hamming Distance between two pHashes ──────────────────
  hammingDistance(hash1, hash2) {
    if (!hash1 || !hash2 || hash1.length !== hash2.length) return Infinity;

    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) distance++;
    }
    return distance;
  }

  // ── Main Check ─────────────────────────────────────────────
  async checkDuplicate(imageBuffer) {
    const md5Hash = this.generateMD5Hash(imageBuffer);
    const pHash = await this.generatePHash(imageBuffer);

    // 1. Exact MD5 match
    const exactMatch = await Incident.findOne({
      where: { imageHash: md5Hash },
      attributes: ['id', 'createdAt', 'reporterName', 'status'],
    });

    if (exactMatch) {
      return {
        isUnique: false,
        duplicateType: 'exact',
        imageHash: md5Hash,
        pHash,
        existingIncidentId: exactMatch.id,
        originalUploadTime: exactMatch.createdAt,
        originalReporter: exactMatch.reporterName,
        reason: `Exact duplicate of incident #${exactMatch.id}`,
      };
    }

    // 2. Near-duplicate pHash check (compare against recent 500 incidents)
    if (pHash) {
      const recentIncidents = await Incident.findAll({
        where: {
          createdAt: {
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
          exifData: { [Op.not]: null },
        },
        attributes: ['id', 'createdAt', 'reporterName', 'exifData'],
        limit: 500,
      });

      for (const incident of recentIncidents) {
        const storedExif = incident.exifData;
        const storedPHash = storedExif?.pHash;

        if (storedPHash) {
          const distance = this.hammingDistance(pHash, storedPHash);

          // Hamming distance < 10 = very similar images (out of 16 hex chars)
          if (distance < 10) {
            return {
              isUnique: false,
              duplicateType: 'near-duplicate',
              imageHash: md5Hash,
              pHash,
              hammingDistance: distance,
              existingIncidentId: incident.id,
              originalUploadTime: incident.createdAt,
              originalReporter: incident.reporterName,
              reason: `Near-duplicate of incident #${incident.id} (similarity: ${Math.round((1 - distance / 16) * 100)}%)`,
            };
          }
        }
      }
    }

    return {
      isUnique: true,
      imageHash: md5Hash,
      pHash,
    };
  }
}

module.exports = new DuplicateDetectionService();