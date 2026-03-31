// =============================================================
// IMAGE VERIFICATION SERVICE — All 6 Layers
// Layer 1: Google Vision AI (flood content detection)
// Layer 2: EXIF metadata (GPS + timestamp + software check)
// Layer 3: Google Custom Search reverse image (replaces SerpAPI)
// Layer 4: MD5 duplicate detection (already submitted?)
// Layer 5: Geo-fence validation (flood zone cross-check)
// Layer 6: User trust score (credibility over time)
// =============================================================

const ExifParser = require('exif-parser');
const axios = require('axios');
const crypto = require('crypto');
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const calculateDistance = require('../utils/calculateDistance');
const Incident = require('../models/Incident');
const User = require('../models/User');
const reverseImageSearchService = require('./reverseImageSearchService'); // ← NEW

const visionClient = new ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_VISION_KEY_FILE,
});

// ─── SCORING WEIGHTS ──────────────────────────────────────────
const WEIGHTS = {
  LAYER1_AI_FLOOD:        30,
  LAYER2_EXIF_GPS:        20,
  LAYER2_EXIF_TIMESTAMP:  15,
  LAYER3_REVERSE_SEARCH:  15,
  LAYER4_NOT_DUPLICATE:   10,
  LAYER5_GEO_FENCE:        5,
  LAYER6_USER_TRUST:       5,
};

const SCORE_THRESHOLDS = {
  AUTO_APPROVE: 75,
  FLAG_REVIEW:  45,
  AUTO_REJECT:  44,
};

// ─── FLOOD KEYWORDS FOR AI DETECTION ─────────────────────────
const FLOOD_LABELS = [
  'flood', 'flooding', 'water', 'inundation', 'submerged',
  'rescue', 'disaster', 'storm', 'hurricane', 'rain',
  'overflow', 'river', 'waterlogged', 'mudslide', 'debris',
  'boat', 'evacuation', 'emergency', 'stranded', 'rescue boat',
];

const NON_FLOOD_LABELS = [
  'selfie', 'portrait', 'food', 'animal', 'pet', 'cat', 'dog',
  'building', 'clear sky', 'sunny', 'dry land', 'desert',
];

class ImageVerificationService {

  // ══════════════════════════════════════════════════════════════
  // MAIN ENTRY POINT — runs all 6 layers and returns final verdict
  // ══════════════════════════════════════════════════════════════
  async verifyImage(imageBuffer, reportedLat, reportedLng, userId = null) {
    const results = {
      score: 0,
      maxScore: 100,
      verdict: 'pending',
      layers: {},
      warnings: [],
      metadata: {},
      imageHash: null,
    };

    // Run all layers in parallel (don't stop on failure — collect all signals)
    const [layer1, layer2, layer3, layer4, layer5, layer6] = await Promise.allSettled([
      this.layer1_aiFloodDetection(imageBuffer),
      this.layer2_exifVerification(imageBuffer, reportedLat, reportedLng),
      this.layer3_reverseImageSearch(imageBuffer),
      this.layer4_duplicateDetection(imageBuffer),
      this.layer5_geoFenceValidation(reportedLat, reportedLng),
      this.layer6_userTrustScore(userId),
    ]);

    // ── Layer 1: AI Flood Detection ──────────────────────────
    results.layers.layer1 = layer1.status === 'fulfilled'
      ? layer1.value
      : { passed: false, score: 0, reason: 'AI check failed: ' + layer1.reason?.message };

    if (results.layers.layer1.passed) {
      results.score += WEIGHTS.LAYER1_AI_FLOOD;
    } else {
      results.warnings.push('⚠️ Layer 1: ' + results.layers.layer1.reason);
    }
    if (results.layers.layer1.metadata) {
      results.metadata.aiAnalysis = results.layers.layer1.metadata;
    }

    // ── Layer 2: EXIF ────────────────────────────────────────
    results.layers.layer2 = layer2.status === 'fulfilled'
      ? layer2.value
      : { gpsValid: false, timestampValid: false, softwareClean: true, warnings: [] };

    const l2 = results.layers.layer2;
    if (l2.gpsValid)       results.score += WEIGHTS.LAYER2_EXIF_GPS;
    else results.warnings.push('⚠️ Layer 2 GPS: ' + (l2.gpsWarning || 'No GPS data'));

    if (l2.timestampValid) results.score += WEIGHTS.LAYER2_EXIF_TIMESTAMP;
    else results.warnings.push('⚠️ Layer 2 Timestamp: ' + (l2.timestampWarning || 'No timestamp'));

    if (!l2.softwareClean) results.warnings.push('⚠️ Layer 2: Image edited with photo software');
    if (l2.metadata)       results.metadata.exif = l2.metadata;

    // ── Layer 3: Reverse Image Search (Google Custom Search) ─
    results.layers.layer3 = layer3.status === 'fulfilled'
      ? layer3.value
      : { isOriginal: true, score: WEIGHTS.LAYER3_REVERSE_SEARCH, reason: 'Search skipped' };

    if (results.layers.layer3.isOriginal) {
      results.score += WEIGHTS.LAYER3_REVERSE_SEARCH;
    } else {
      results.warnings.push('⚠️ Layer 3: ' + results.layers.layer3.reason);
    }

    // ── Layer 4: Duplicate Detection ─────────────────────────
    results.layers.layer4 = layer4.status === 'fulfilled'
      ? layer4.value
      : { isUnique: true, imageHash: null };

    results.imageHash = results.layers.layer4.imageHash;
    if (results.layers.layer4.isUnique) {
      results.score += WEIGHTS.LAYER4_NOT_DUPLICATE;
    } else {
      results.warnings.push(
        `⚠️ Layer 4: Duplicate of incident #${results.layers.layer4.existingIncidentId}`
      );
    }

    // ── Layer 5: Geo-Fence ───────────────────────────────────
    results.layers.layer5 = layer5.status === 'fulfilled'
      ? layer5.value
      : { inFloodZone: false, reason: 'Geo-fence check skipped' };

    if (results.layers.layer5.inFloodZone) {
      results.score += WEIGHTS.LAYER5_GEO_FENCE;
    } else {
      results.warnings.push('⚠️ Layer 5: ' + results.layers.layer5.reason);
    }

    // ── Layer 6: User Trust ──────────────────────────────────
    results.layers.layer6 = layer6.status === 'fulfilled'
      ? layer6.value
      : { trustScore: 0, bonus: 0 };

    results.score += results.layers.layer6.bonus;
    results.metadata.userTrust = results.layers.layer6;

    // ── Final Verdict ────────────────────────────────────────
    results.score = Math.min(100, Math.max(0, results.score));

    if (results.score >= SCORE_THRESHOLDS.AUTO_APPROVE) {
      results.verdict = 'approved';
    } else if (results.score >= SCORE_THRESHOLDS.FLAG_REVIEW) {
      results.verdict = 'review';
    } else {
      results.verdict = 'rejected';
    }

    return results;
  }

  // ══════════════════════════════════════════════════════════════
  // LAYER 1 — Google Vision AI: Is this a flood image?
  // ══════════════════════════════════════════════════════════════
  async layer1_aiFloodDetection(imageBuffer) {
    try {
      const [labelResult] = await visionClient.labelDetection({ image: { content: imageBuffer } });
      const [safeSearchResult] = await visionClient.safeSearchDetection({ image: { content: imageBuffer } });

      const labels = labelResult.labelAnnotations || [];
      const safeSearch = safeSearchResult.safeSearchAnnotation || {};

      const detectedLabels = labels.map(l => l.description.toLowerCase());
      const topLabels = labels.slice(0, 10).map(l => ({
        label: l.description,
        confidence: Math.round(l.score * 100),
      }));

      const floodMatches = detectedLabels.filter(label =>
        FLOOD_LABELS.some(fl => label.includes(fl))
      );
      const nonFloodMatches = detectedLabels.filter(label =>
        NON_FLOOD_LABELS.some(nf => label.includes(nf))
      );

      const isSafe = !['LIKELY', 'VERY_LIKELY'].includes(safeSearch.adult)
        && !['LIKELY', 'VERY_LIKELY'].includes(safeSearch.violence);

      const hasFloodContent    = floodMatches.length >= 1;
      const hasNonFloodContent = nonFloodMatches.length >= 2 && floodMatches.length === 0;
      const passed             = hasFloodContent && !hasNonFloodContent && isSafe;

      return {
        passed,
        score: passed ? WEIGHTS.LAYER1_AI_FLOOD : 0,
        reason: passed
          ? `Flood content detected: ${floodMatches.join(', ')}`
          : hasNonFloodContent
            ? `Non-flood content: ${nonFloodMatches.join(', ')}`
            : !hasFloodContent
              ? 'No flood-related content detected'
              : 'Failed safety check',
        metadata: { detectedLabels: topLabels, floodMatches, nonFloodMatches, safeSearch },
      };
    } catch (error) {
      throw new Error('Google Vision API error: ' + error.message);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // LAYER 2 — EXIF: GPS match + timestamp recency + software check
  // ══════════════════════════════════════════════════════════════
  async layer2_exifVerification(imageBuffer, reportedLat, reportedLng) {
    try {
      const parser = ExifParser.create(imageBuffer);
      const result = parser.parse();
      const tags   = result.tags || {};

      const layer = {
        gpsValid:         false,
        timestampValid:   false,
        softwareClean:    true,
        gpsWarning:       null,
        timestampWarning: null,
        metadata:         {},
      };

      // No EXIF at all (screenshot / web download)
      if (!tags || Object.keys(tags).length === 0) {
        layer.gpsWarning       = 'No EXIF metadata — likely screenshot or web download';
        layer.timestampWarning = 'No EXIF metadata';
        return layer;
      }

      // GPS Check
      if (tags.GPSLatitude && tags.GPSLongitude) {
        const exifLat  = tags.GPSLatitude;
        const exifLng  = tags.GPSLongitude;
        const distance = calculateDistance(exifLat, exifLng, reportedLat, reportedLng);

        layer.metadata.exifLocation      = { lat: exifLat, lng: exifLng };
        layer.metadata.distanceFromReport = distance.toFixed(3) + ' km';

        if (distance <= 1.0) {
          layer.gpsValid = true;
        } else {
          layer.gpsWarning = `GPS mismatch: image taken ${distance.toFixed(2)}km from reported location`;
        }
      } else {
        layer.gpsWarning = 'No GPS coordinates in EXIF — may be edited or stripped';
      }

      // Timestamp Check
      const timestamp = tags.DateTimeOriginal || tags.DateTime;
      if (timestamp) {
        const photoTime = new Date(timestamp * 1000);
        const hoursDiff = (Date.now() - photoTime.getTime()) / (1000 * 60 * 60);

        layer.metadata.photoTimestamp = photoTime.toISOString();
        layer.metadata.hoursOld       = Math.round(hoursDiff);

        if (hoursDiff <= 48) {
          layer.timestampValid = true;
        } else {
          layer.timestampWarning = `Photo is ${Math.floor(hoursDiff)} hours old (max allowed: 48h)`;
        }
      } else {
        layer.timestampWarning = 'No timestamp in EXIF — cannot verify recency';
      }

      // Software Check
      if (tags.Software) {
        const software        = tags.Software.toLowerCase();
        const editingSoftware = ['photoshop', 'gimp', 'lightroom', 'snapseed', 'facetune', 'picsart'];
        const usedEditor      = editingSoftware.find(s => software.includes(s));
        if (usedEditor) {
          layer.softwareClean          = false;
          layer.metadata.editingSoftware = tags.Software;
        }
      }

      // Device Info
      if (tags.Make || tags.Model) {
        layer.metadata.device = `${tags.Make || ''} ${tags.Model || ''}`.trim();
      }

      return layer;
    } catch (error) {
      return {
        gpsValid:         false,
        timestampValid:   false,
        softwareClean:    true,
        gpsWarning:       'EXIF parse failed: ' + error.message,
        timestampWarning: 'EXIF parse failed',
        metadata:         {},
      };
    }
  }

  // ══════════════════════════════════════════════════════════════
  // LAYER 3 — Reverse Image Search (Google Custom Search)
  // SerpAPI fully removed — uses reverseImageSearchService.js
  // ══════════════════════════════════════════════════════════════
  async layer3_reverseImageSearch(imageBuffer) {
    return await reverseImageSearchService.checkImageOriginality(imageBuffer);
  }

  // ══════════════════════════════════════════════════════════════
  // LAYER 4 — Duplicate Detection (MD5 hash vs existing incidents)
  // ══════════════════════════════════════════════════════════════
  async layer4_duplicateDetection(imageBuffer) {
    const imageHash = crypto.createHash('md5').update(imageBuffer).digest('hex');

    const existingIncident = await Incident.findOne({
      where: { imageHash },
      attributes: ['id', 'createdAt', 'reporterName'],
    });

    if (existingIncident) {
      return {
        isUnique:          false,
        imageHash,
        existingIncidentId:  existingIncident.id,
        originalUploadTime:  existingIncident.createdAt,
        originalReporter:    existingIncident.reporterName,
      };
    }

    return { isUnique: true, imageHash };
  }

  // ══════════════════════════════════════════════════════════════
  // LAYER 5 — Geo-Fence: Is this location in a flood-prone area?
  // Uses Open-Meteo free weather API (no API key needed)
  // ══════════════════════════════════════════════════════════════
  async layer5_geoFenceValidation(lat, lng) {
    try {
      const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
        params: {
          latitude:      lat,
          longitude:     lng,
          current:       'precipitation,rain,showers',
          hourly:        'precipitation',
          past_days:     1,
          forecast_days: 1,
        },
        timeout: 8000,
      });

      const current       = response.data.current || {};
      const precipitation = current.precipitation || 0;
      const rain          = current.rain || 0;

      const isFloodCondition = precipitation > 5 || rain > 5;

      const nearbyIncidents = await Incident.count({
        where: { status: ['unrescued', 'rescue_in_progress'] },
      });

      const hasNearbyIncidents = nearbyIncidents > 0;
      const inFloodZone        = isFloodCondition || hasNearbyIncidents;

      return {
        inFloodZone,
        precipitation:           precipitation + 'mm',
        rain:                    rain + 'mm',
        nearbyVerifiedIncidents: nearbyIncidents,
        reason: inFloodZone
          ? `Flood conditions confirmed: ${precipitation}mm rain, ${nearbyIncidents} nearby incidents`
          : `No active flood conditions at this location (${precipitation}mm rain)`,
      };
    } catch (error) {
      return {
        inFloodZone: false,
        reason: 'Geo-fence check failed: ' + error.message,
      };
    }
  }

  // ══════════════════════════════════════════════════════════════
  // LAYER 6 — User Trust Score (based on submission history)
  // ══════════════════════════════════════════════════════════════
  async layer6_userTrustScore(userId) {
    if (!userId) {
      return { trustLevel: 'anonymous', bonus: 0, reason: 'No user ID' };
    }

    try {
      const [verified, fake, total] = await Promise.all([
        Incident.count({ where: { reporterId: userId, status: ['rescued', 'unrescued', 'rescue_in_progress'] } }),
        Incident.count({ where: { reporterId: userId, status: 'fake_report' } }),
        Incident.count({ where: { reporterId: userId } }),
      ]);

      const user = await User.findByPk(userId, { attributes: ['createdAt', 'role'] });

      const accountAgeDays = user
        ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      let trustScore = 50;
      if (verified > 0)        trustScore += Math.min(30, verified * 5);
      if (fake > 0)            trustScore -= Math.min(40, fake * 10);
      if (accountAgeDays > 30) trustScore += 10;
      if (accountAgeDays > 90) trustScore += 10;

      trustScore = Math.min(100, Math.max(0, trustScore));

      const bonus = trustScore >= 80 ? WEIGHTS.LAYER6_USER_TRUST
        : trustScore >= 50           ? Math.round(WEIGHTS.LAYER6_USER_TRUST * 0.5)
        : 0;

      return {
        trustScore,
        trustLevel: trustScore >= 80 ? 'high' : trustScore >= 50 ? 'medium' : 'low',
        bonus,
        history: { verified, fake, total },
        accountAgeDays,
        reason: `Trust score: ${trustScore}/100 (${verified} good, ${fake} fake reports)`,
      };
    } catch (error) {
      return { trustLevel: 'unknown', bonus: 0, reason: 'Trust check failed: ' + error.message };
    }
  }

  // ══════════════════════════════════════════════════════════════
  // HELPER — Map verdict to Incident status
  // ══════════════════════════════════════════════════════════════
  verdictToStatus(verdict) {
    switch (verdict) {
      case 'approved': return 'unrescued';
      case 'review':   return 'pending_verification';
      case 'rejected': return 'fake_report';
      default:         return 'pending_verification';
    }
  }
}

module.exports = new ImageVerificationService();