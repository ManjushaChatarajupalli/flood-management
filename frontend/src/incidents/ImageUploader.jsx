import React, { useState, useRef, useEffect, useCallback } from 'react';
import { compressImage, validateImage, createImagePreview } from '../services/imageUtils';

// ─── GPS Source indicator ──────────────────────────────────────
const GPS_SOURCE = {
  EXIF:    'exif',
  BROWSER: 'browser',
  NONE:    'none',
};

const ImageUploader = ({ onImageSelect, onImageRemove, onLocationDetected }) => {
  // ── Image state ──────────────────────────────────────────────
  const [preview, setPreview]           = useState(null);
  const [rawFile, setRawFile]           = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError]               = useState('');

  // ── Camera state ─────────────────────────────────────────────
  const [showCamera, setShowCamera]     = useState(false);
  const [cameraReady, setCameraReady]   = useState(false);
  const [cameraError, setCameraError]   = useState('');
  const [facingMode, setFacingMode]     = useState('environment'); // rear camera default
  const [stream, setStream]             = useState(null);

  // ── GPS state ────────────────────────────────────────────────
  const [gpsSource, setGpsSource]       = useState(GPS_SOURCE.NONE);
  const [gpsCoords, setGpsCoords]       = useState(null);
  const [gpsLoading, setGpsLoading]     = useState(false);
  const [gpsError, setGpsError]         = useState('');

  // ── Verification pre-check ───────────────────────────────────
  const [preCheck, setPreCheck]         = useState(null);
  const [isChecking, setIsChecking]     = useState(false);

  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const fileInputRef = useRef(null);

  // ── Stop camera stream on unmount ────────────────────────────
  useEffect(() => {
    return () => stopCamera();
  }, []);

  // ── Attach stream to video element ───────────────────────────
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, showCamera]);

  // ════════════════════════════════════════════════════════════
  // CAMERA FUNCTIONS
  // ════════════════════════════════════════════════════════════

  const startCamera = async (facing = 'environment') => {
    setCameraError('');
    setCameraReady(false);
    setShowCamera(true);

    try {
      // Stop existing stream first
      if (stream) stopCamera(false);

      const constraints = {
        video: {
          facingMode: facing,
          width:  { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setFacingMode(facing);
      setCameraReady(true);

      // Also grab GPS while camera opens
      fetchBrowserGPS();
    } catch (err) {
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : err.name === 'NotFoundError'
          ? 'No camera found on this device.'
          : 'Could not start camera: ' + err.message
      );
      setShowCamera(false);
    }
  };

  const stopCamera = (hidePanel = true) => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    setCameraReady(false);
    if (hidePanel) setShowCamera(false);
  };

  const flipCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(next);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video  = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');

    // Mirror if front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    // Convert canvas to File object
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
      stopCamera();
      await processFile(file, 'camera');
    }, 'image/jpeg', 0.92);
  };

  // ════════════════════════════════════════════════════════════
  // GPS FUNCTIONS
  // ════════════════════════════════════════════════════════════

  const fetchBrowserGPS = () => {
    if (!navigator.geolocation) return;

    setGpsLoading(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          source: GPS_SOURCE.BROWSER,
        };
        setGpsCoords(coords);
        setGpsSource(GPS_SOURCE.BROWSER);
        setGpsLoading(false);
        // Notify parent (ReportIncidentPage) so it can pre-fill lat/lng
        if (onLocationDetected) onLocationDetected(coords);
      },
      (err) => {
        setGpsError('Location access denied — GPS will use reported location only');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // ════════════════════════════════════════════════════════════
  // FILE PROCESSING
  // ════════════════════════════════════════════════════════════

  const processFile = async (file, source = 'upload') => {
    setError('');
    setPreCheck(null);

    const validation = validateImage(file);
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return;
    }

    try {
      setIsCompressing(true);
      const compressedFile = await compressImage(file);
      const previewUrl     = createImagePreview(compressedFile);

      setPreview(previewUrl);
      setRawFile(compressedFile);
      onImageSelect(compressedFile, gpsCoords);

      // Auto-run pre-check after file is set
      await runPreCheck(compressedFile, source);
    } catch (err) {
      setError('Failed to process image: ' + err.message);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file, 'upload');
  };

  // ════════════════════════════════════════════════════════════
  // PRE-CHECK (client-side EXIF + GPS validation)
  // ════════════════════════════════════════════════════════════

  const runPreCheck = async (file, captureSource = 'upload') => {
    setIsChecking(true);
    try {
      let exifData = null;
      let exifGPS  = null;

      // Try reading EXIF
      try {
        const arrayBuffer = await file.arrayBuffer();
        const { default: ExifReader } = await import('exifr').catch(() => ({ default: null }));
        if (ExifReader) {
          exifData = await ExifReader.parse(arrayBuffer, { gps: true, tiff: true });
          if (exifData?.latitude && exifData?.longitude) {
            exifGPS = { lat: exifData.latitude, lng: exifData.longitude };
          }
        }
      } catch { exifData = null; }

      // Decide GPS source
      let finalGPS    = null;
      let finalSource = GPS_SOURCE.NONE;

      if (exifGPS) {
        finalGPS    = { ...exifGPS, source: GPS_SOURCE.EXIF };
        finalSource = GPS_SOURCE.EXIF;
        setGpsCoords(finalGPS);
        setGpsSource(GPS_SOURCE.EXIF);
        if (onLocationDetected) onLocationDetected(finalGPS);
      } else if (gpsCoords) {
        // Fall back to browser GPS
        finalGPS    = gpsCoords;
        finalSource = GPS_SOURCE.BROWSER;
      } else {
        // Try fetching browser GPS now
        fetchBrowserGPS();
        finalSource = GPS_SOURCE.NONE;
      }

      // Timestamp check
      const timestamp = exifData?.DateTimeOriginal || exifData?.DateTime;
      let timestampValid = false;
      let hoursOld       = null;
      if (timestamp) {
        hoursOld       = (Date.now() - new Date(timestamp).getTime()) / 3600000;
        timestampValid = hoursOld <= 48;
      } else if (captureSource === 'camera') {
        // Live capture — timestamp is now
        timestampValid = true;
        hoursOld       = 0;
      }

      // Software check
      const editingSoftware = ['photoshop', 'gimp', 'lightroom', 'snapseed', 'picsart', 'facetune'];
      const softwareUsed    = exifData?.Software
        ? editingSoftware.find(s => exifData.Software.toLowerCase().includes(s))
        : null;

      // Score
      const checks = {
        hasExif:        !!exifData && Object.keys(exifData).length > 2,
        hasGPS:         finalSource !== GPS_SOURCE.NONE,
        gpsSource:      finalSource,
        timestampValid,
        hoursOld:       hoursOld != null ? Math.round(hoursOld) : null,
        softwareClean:  !softwareUsed,
        softwareUsed,
        device:         exifData?.Make ? `${exifData.Make} ${exifData.Model || ''}`.trim() : null,
        captureSource,
        coords:         finalGPS,
      };

      // Warnings
      const warnings = [];
      if (!checks.hasExif && captureSource === 'upload')
        warnings.push('No EXIF data — image may be a screenshot or downloaded from web');
      if (finalSource === GPS_SOURCE.NONE)
        warnings.push('No GPS detected — please enable location on your device');
      if (finalSource === GPS_SOURCE.BROWSER)
        warnings.push('GPS from browser (not image EXIF) — still valid but lower confidence');
      if (!timestampValid && hoursOld != null)
        warnings.push(`Photo is ${Math.round(hoursOld)}h old — must be within 48 hours`);
      if (!timestampValid && hoursOld == null && captureSource === 'upload')
        warnings.push('No timestamp in image — recency cannot be verified');
      if (softwareUsed)
        warnings.push(`Editing software detected: ${exifData.Software}`);

      setPreCheck({ ...checks, warnings });
    } catch (err) {
      setPreCheck({ error: err.message, warnings: [] });
    } finally {
      setIsChecking(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  // REMOVE IMAGE
  // ════════════════════════════════════════════════════════════

  const handleRemove = () => {
    setPreview(null);
    setRawFile(null);
    setPreCheck(null);
    setError('');
    setGpsSource(GPS_SOURCE.NONE);
    setGpsCoords(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onImageRemove();
  };

  // ════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ════════════════════════════════════════════════════════════

  const gpsSourceBadge = () => {
    if (gpsLoading) return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 animate-pulse">
        📡 Getting location...
      </span>
    );
    if (gpsSource === GPS_SOURCE.EXIF) return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-300">
        📍 GPS from photo EXIF
      </span>
    );
    if (gpsSource === GPS_SOURCE.BROWSER) return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-300">
        🌐 GPS from browser
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300">
        ❌ No GPS
      </span>
    );
  };

  const CheckRow = ({ icon, label, pass, failText }) => (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium
      ${pass ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
      <span className="flex items-center gap-1.5">{icon} {label}</span>
      <span>{pass ? '✓ Pass' : `✗ ${failText}`}</span>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ════════════════════════════════════════════════════════════

  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden">

      {/* ── Header ── */}
      <div className="px-6 pt-5 pb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-700 flex items-center gap-2">
          📸 Photo Evidence
        </h3>
        {(preview || showCamera) && gpsSourceBadge()}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mx-6 mb-3 p-3 bg-red-50 border border-red-300 text-red-700 rounded-lg text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* ── Camera error ── */}
      {cameraError && (
        <div className="mx-6 mb-3 p-3 bg-orange-50 border border-orange-300 text-orange-700 rounded-lg text-sm">
          📷 {cameraError}
        </div>
      )}

      {/* ── GPS error ── */}
      {gpsError && !gpsCoords && (
        <div className="mx-6 mb-3 p-3 bg-yellow-50 border border-yellow-300 text-yellow-700 rounded-lg text-sm">
          📍 {gpsError}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          LIVE CAMERA PANEL
      ════════════════════════════════════════════════════ */}
      {showCamera && (
        <div className="mx-6 mb-4 rounded-xl overflow-hidden border border-slate-200 shadow-md bg-black">
          {/* Video feed */}
          <div className="relative bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full max-h-72 object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              onCanPlay={() => setCameraReady(true)}
            />

            {/* Loading overlay */}
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60">
                <div className="text-white text-sm animate-pulse">📡 Starting camera...</div>
              </div>
            )}

            {/* GPS badge overlay */}
            {gpsCoords && (
              <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full">
                📍 {gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}
              </div>
            )}

            {/* Flip camera button */}
            <button
              type="button"
              onClick={flipCamera}
              className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full w-9 h-9 flex items-center justify-center hover:bg-opacity-75 transition-all"
              title="Flip camera"
            >
              🔄
            </button>
          </div>

          {/* Camera controls */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900">
            <button
              type="button"
              onClick={() => stopCamera()}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 text-sm transition-all"
            >
              ✕ Cancel
            </button>

            {/* Shutter button */}
            <button
              type="button"
              onClick={capturePhoto}
              disabled={!cameraReady}
              className="w-16 h-16 rounded-full border-4 border-white bg-white disabled:opacity-40
                         flex items-center justify-center shadow-lg
                         hover:scale-105 active:scale-95 transition-transform"
              title="Take photo"
            >
              <div className="w-12 h-12 rounded-full bg-slate-200 hover:bg-slate-300 transition-colors" />
            </button>

            <button
              type="button"
              onClick={flipCamera}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 text-sm transition-all"
            >
              🔄 Flip
            </button>
          </div>
        </div>
      )}

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ════════════════════════════════════════════════════
          PREVIEW
      ════════════════════════════════════════════════════ */}
      {preview && !showCamera && (
        <div className="mx-6 mb-4">
          <div className="relative rounded-xl overflow-hidden shadow-md">
            <img
              src={preview}
              alt="Captured evidence"
              className="w-full max-h-72 object-cover"
            />
            {/* GPS overlay on preview */}
            {gpsCoords && (
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full">
                📍 {gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)}
                {gpsCoords.accuracy && ` ±${gpsCoords.accuracy}m`}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-3 justify-center">
            <button
              type="button"
              onClick={() => startCamera(facingMode)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-all"
            >
              📷 Retake
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 text-sm transition-all"
            >
              📁 Choose Different
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm transition-all"
            >
              🗑️ Remove
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          UPLOAD BUTTONS (no preview yet)
      ════════════════════════════════════════════════════ */}
      {!preview && !showCamera && (
        <div className="px-6 pb-5">
          {isCompressing ? (
            <div className="text-center py-8 text-blue-600 animate-pulse text-sm">
              ⏳ Processing image...
            </div>
          ) : (
            <>
              <div className="text-center mb-5">
                <div className="text-5xl mb-2">📷</div>
                <p className="text-slate-500 text-sm">Take a live photo or upload from device</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Live Camera */}
                <button
                  type="button"
                  onClick={() => startCamera('environment')}
                  className="flex flex-col items-center justify-center gap-2 py-5 px-3
                             bg-blue-600 text-white rounded-xl hover:bg-blue-700
                             active:scale-95 transition-all shadow-sm"
                >
                  <span className="text-3xl">📷</span>
                  <span className="text-sm font-semibold">Live Camera</span>
                  <span className="text-xs opacity-80">Opens in browser</span>
                </button>

                {/* Upload File */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 py-5 px-3
                             bg-emerald-600 text-white rounded-xl hover:bg-emerald-700
                             active:scale-95 transition-all shadow-sm"
                >
                  <span className="text-3xl">📁</span>
                  <span className="text-sm font-semibold">Upload File</span>
                  <span className="text-xs opacity-80">From gallery/device</span>
                </button>
              </div>

              {/* Mobile camera shortcut */}
              <button
                type="button"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.capture = 'environment';
                  input.onchange = handleFileChange;
                  input.click();
                }}
                className="mt-3 w-full py-3 border-2 border-dashed border-slate-300
                           text-slate-500 rounded-xl hover:border-blue-400 hover:text-blue-600
                           text-sm transition-all text-center"
              >
                📱 Open Device Camera App (mobile)
              </button>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          PRE-CHECK RESULTS
      ════════════════════════════════════════════════════ */}
      {preview && !showCamera && (
        <div className="px-6 pb-5">
          {isChecking ? (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl text-purple-700 text-sm animate-pulse text-center">
              🔍 Analysing image metadata...
            </div>
          ) : preCheck ? (
            preCheck.error ? (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500">
                Pre-check unavailable: {preCheck.error}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 bg-slate-800 text-white flex items-center justify-between">
                  <span className="text-sm font-semibold">🔎 Image Verification Pre-Check</span>
                  <span className="text-xs text-slate-400">
                    {preCheck.captureSource === 'camera' ? '📷 Live capture' : '📁 File upload'}
                  </span>
                </div>

                {/* GPS Source banner */}
                <div className={`px-4 py-2.5 text-xs font-medium flex items-center gap-2
                  ${preCheck.gpsSource === GPS_SOURCE.EXIF    ? 'bg-green-50 text-green-700 border-b border-green-200' :
                    preCheck.gpsSource === GPS_SOURCE.BROWSER ? 'bg-yellow-50 text-yellow-700 border-b border-yellow-200' :
                    'bg-red-50 text-red-700 border-b border-red-200'}`}>
                  {preCheck.gpsSource === GPS_SOURCE.EXIF    ? '📍 GPS from photo EXIF — strongest verification' :
                   preCheck.gpsSource === GPS_SOURCE.BROWSER ? '🌐 GPS from browser — will be used for location matching' :
                   '❌ No GPS available — enable location for better verification'}
                  {preCheck.coords && (
                    <span className="ml-auto font-mono opacity-70">
                      {preCheck.coords.lat.toFixed(4)}, {preCheck.coords.lng.toFixed(4)}
                    </span>
                  )}
                </div>

                {/* Check rows */}
                <div className="p-3 space-y-1.5 bg-white">
                  <CheckRow
                    icon="📄" label="EXIF Metadata"
                    pass={preCheck.hasExif}
                    failText="No metadata (screenshot/web image)"
                  />
                  <CheckRow
                    icon="📍" label="GPS Location"
                    pass={preCheck.hasGPS}
                    failText="No GPS detected"
                  />
                  <CheckRow
                    icon="⏱️" label="Recent Photo (≤48h)"
                    pass={preCheck.timestampValid}
                    failText={preCheck.hoursOld != null ? `${preCheck.hoursOld}h old` : 'No timestamp'}
                  />
                  <CheckRow
                    icon="🖼️" label="Not Photo-Edited"
                    pass={preCheck.softwareClean}
                    failText={preCheck.softwareUsed || 'Editing software detected'}
                  />
                  {preCheck.device && (
                    <div className="px-3 py-2 bg-slate-50 rounded-lg text-xs text-slate-500 border border-slate-200">
                      📱 Device: {preCheck.device}
                    </div>
                  )}
                </div>

                {/* Warnings */}
                {preCheck.warnings.length > 0 && (
                  <div className="px-3 pb-3 bg-white space-y-1">
                    {preCheck.warnings.map((w, i) => (
                      <div key={i} className="px-3 py-2 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg text-xs">
                        ⚠️ {w}
                      </div>
                    ))}
                  </div>
                )}

                {/* Full check note */}
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-400 text-center">
                  Full AI verification (flood detection + reverse image search) runs on submit
                </div>
              </div>
            )
          ) : null}
        </div>
      )}

      {/* ── Tips ── */}
      {!preview && !showCamera && (
        <div className="mx-6 mb-5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs font-semibold text-amber-800 mb-1.5">📌 Tips for passing verification:</p>
          <ul className="text-xs text-amber-700 space-y-0.5 list-disc list-inside">
            <li>Use <strong>Live Camera</strong> for best results — captures GPS automatically</li>
            <li>Enable location permission when browser asks</li>
            <li>Photo must be taken within the <strong>last 48 hours</strong></li>
            <li>Do not edit or filter the photo</li>
            <li>Show clear flood evidence — water, submerged areas, boats</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
