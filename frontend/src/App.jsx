import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import './App.css';

const API_BASE_URL = 'http://localhost:5000/api';

function App() {
  const [projectName, setProjectName] = useState('');
  const [images, setImages] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [projectId, setProjectId] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  // Image validation
  const validateImages = (files) => {
    const validMimes = ['image/jpeg', 'image/png', 'image/tiff'];
    const maxSize = 50 * 1024 * 1024; // 50MB

    return files.filter(file => {
      if (!validMimes.includes(file.type)) {
        setError(`Invalid file type: ${file.name}. Only JPG, PNG, TIFF allowed.`);
        return false;
      }
      if (file.size > maxSize) {
        setError(`File too large: ${file.name}. Max 50MB per image.`);
        return false;
      }
      return true;
    });
  };

  const onDrop = useCallback(acceptedFiles => {
    const validFiles = validateImages(acceptedFiles);
    setImages([...images, ...validFiles]);
    setError(null);
  }, [images]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleRemoveImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleProcessing = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!projectName.trim()) {
      setError('Please enter a project name');
      return;
    }

    if (images.length < 20) {
      setError(`Not enough images. Minimum 20 required, got ${images.length}`);
      return;
    }

    try {
      setProcessing(true);
      const newProjectId = Math.random().toString(36).substr(2, 9);
      setProjectId(newProjectId);

      const formData = new FormData();
      formData.append('projectName', projectName);
      formData.append('projectId', newProjectId);
      images.forEach(image => {
        formData.append('images', image);
      });

      const response = await axios.post(`${API_BASE_URL}/process`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setStatus('Processing started! This may take 10 minutes to several hours...');
      setProgress(5);

      // Poll for status
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await axios.get(`${API_BASE_URL}/status/${newProjectId}`);
          if (statusResponse.data.status === 'completed') {
            setStatus('✅ Processing completed! Your 3D model is ready.');
            setProgress(100);
            clearInterval(pollInterval);
          } else if (statusResponse.data.status === 'error') {
            setError('❌ Processing failed: ' + statusResponse.data.message);
            clearInterval(pollInterval);
          } else {
            setProgress(Math.min(progress + 5, 95));
          }
        } catch (err) {
          console.error('Status check failed:', err);
        }
      }, 5000);

    } catch (err) {
      setError('Upload failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📸 Photogrammetry Batch Processor</h1>
          <p className="text-xl text-gray-600">Turn your photos into stunning 3D models</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-xl p-8 mb-8">
          {/* Form */}
          <form onSubmit={handleProcessing}>
            {/* Project Name */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g., My House, Ancient Ruins, Statue"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={processing}
              />
            </div>

            {/* Dropzone */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Images ({images.length} selected)
              </label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-400'
                }`}
              >
                <input {...getInputProps()} disabled={processing} />
                <div className="text-4xl mb-2">📁</div>
                {isDragActive ? (
                  <p className="text-blue-600 font-semibold">Drop your images here...</p>
                ) : (
                  <div>
                    <p className="text-gray-700 font-semibold">Drag and drop images here, or click to select</p>
                    <p className="text-sm text-gray-500 mt-1">JPG, PNG, TIFF • Max 50MB each</p>
                  </div>
                )}
              </div>
            </div>

            {/* Image List */}
            {images.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-3">Selected Images</h3>
                <div className="max-h-48 overflow-y-auto bg-gray-50 rounded-lg p-3">
                  {images.map((image, index) => (
                    <div key={index} className="flex justify-between items-center py-2 px-3 bg-white mb-2 rounded border border-gray-200">
                      <span className="text-sm text-gray-700">{image.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium"
                        disabled={processing}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Validation Messages */}
            {images.length < 20 && images.length > 0 && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                ⚠️ You have {images.length} images. Recommended: 20-100+ for best results.
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                ❌ {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={processing || images.length < 20}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition"
            >
              {processing ? '⏳ Processing...' : '🚀 Start Batch Processing'}
            </button>
          </form>
        </div>

        {/* Processing Status */}
        {processing && (
          <div className="bg-white rounded-lg shadow-xl p-8 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Processing Status</h2>
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">{progress}% Complete</p>
            </div>
            {status && <p className="text-gray-700 font-semibold">{status}</p>}
            <p className="text-sm text-gray-500 mt-4">
              💡 This process can take 10 minutes to several hours depending on image count and quality.
            </p>
          </div>
        )}

        {/* Tips Section */}
        <div className="bg-blue-50 rounded-lg p-8 border border-blue-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">📚 Beginner Tips for Best Results</h3>
          <ul className="space-y-2 text-gray-700">
            <li>✅ <strong>50-80% overlap</strong> between consecutive images</li>
            <li>✅ <strong>Multiple angles</strong> - Walk around your subject in circles</li>
            <li>✅ <strong>Multiple heights</strong> - Capture from low, medium, and high positions</li>
            <li>✅ <strong>Good lighting</strong> - Natural light or consistent artificial lighting</li>
            <li>✅ <strong>Sharp images</strong> - Avoid blur and camera shake (use tripod if possible)</li>
            <li>✅ <strong>20-100+ images</strong> - More images = better 3D model</li>
            <li>❌ <strong>Avoid</strong> - Glass, mirrors, water, or very repetitive textures</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
