import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ImageUploader from '../../incidents/ImageUploader';
import VerificationBadge from '../../incidents/VerificationBadge';
import { incidentAPI } from '../../services/api';
import { getCurrentLocation, formatCoordinates } from '../../services/imageUtils';

const ReportIncidentPage = () => {
  const [formData, setFormData] = useState({
    description: '',
    reporterName: ''
  });

  const [selectedImage, setSelectedImage] = useState(null);
  
  const [location, setLocation] = useState({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null
  });

  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchLocation();
  }, []);

  const fetchLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const coords = await getCurrentLocation();
      setLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        error: null
      });
    } catch (error) {
      setLocation(prev => ({ ...prev, error: error.message }));
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleImageSelect = (file) => {
    setSelectedImage(file);
    setSubmitError('');
  };

  const handleImageRemove = () => {
    setSelectedImage(null);
  };

  const handleInputChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const validateForm = () => {
    const errors = [];
    if (!selectedImage) errors.push('Please upload an image');
    if (!location.latitude || !location.longitude) errors.push('GPS location required');
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setSubmitError('');
    setSubmitSuccess(null);

    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setSubmitError(validationErrors.join('. '));
      return;
    }

    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('image', selectedImage);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('reporterName', formData.reporterName || 'Anonymous');
      formDataToSend.append('latitude', location.latitude);
      formDataToSend.append('longitude', location.longitude);

      const response = await incidentAPI.createIncident(formDataToSend);
      setSubmitSuccess(response);

      setTimeout(() => {
        navigate('/incidents');
      }, 3000);

    } catch (error) {
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to submit report';
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🚨 Report Emergency
          </h1>
          <p className="text-gray-600">
            Help rescue teams locate people in danger
          </p>
        </div>

        {submitSuccess && (
          <div className="bg-green-100 border-2 border-green-500 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-green-800 mb-2">
              ✅ {submitSuccess.message}
            </h3>
            
            <VerificationBadge 
              verificationScore={submitSuccess.verificationScore}
              autoApproved={submitSuccess.autoApproved}
              warnings={submitSuccess.warnings}
            />

            <p className="text-sm text-gray-600 mt-2">
              Redirecting...
            </p>
          </div>
        )}

        {submitError && (
          <div className="bg-red-100 border-2 border-red-500 rounded-lg p-4 mb-6">
            ⚠️ {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
          
          <ImageUploader 
            onImageSelect={handleImageSelect}
            onImageRemove={handleImageRemove}
          />

          <div className="border-2 border-gray-300 rounded-lg p-6 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">📍 GPS Location</h3>
              <button
                type="button"
                onClick={fetchLocation}
                disabled={isLoadingLocation}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isLoadingLocation ? '⏳ Loading...' : '🔄 Refresh'}
              </button>
            </div>

            {location.error ? (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                ❌ {location.error}
              </div>
            ) : location.latitude ? (
              <div className="p-3 bg-green-100 border border-green-400 rounded">
                <p className="text-green-900 font-mono">
                  {formatCoordinates(location.latitude, location.longitude)}
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Accuracy: ±{Math.round(location.accuracy)}m
                </p>
              </div>
            ) : (
              <div className="p-3 bg-gray-100 rounded">
                Detecting location...
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Additional details..."
              rows="4"
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Your Name (Optional)
            </label>
            <input
              type="text"
              name="reporterName"
              value={formData.reporterName}
              onChange={handleInputChange}
              placeholder="Anonymous allowed"
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !selectedImage || !location.latitude}
            className={`w-full py-4 rounded-lg text-white font-bold ${
              isSubmitting || !selectedImage || !location.latitude
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isSubmitting ? '⏳ Submitting...' : '🚨 Submit Emergency Report'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReportIncidentPage;