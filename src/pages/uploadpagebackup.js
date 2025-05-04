import React, { useState, useEffect } from 'react';
import '../css/UploadPage.css';
import { db } from '../firebase'; // Import your existing Firebase setup
import { collection, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

const UploadPage = () => {
  const [selectedEdition, setSelectedEdition] = useState('');
  const [selectedPage, setSelectedPage] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState({
    Ujjain: Array(8).fill(null),
    Indore: Array(8).fill(null)
  });
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const editions = ['Ujjain', 'Indore'];
  const pageNumbers = Array.from({ length: 8 }, (_, i) => i + 1);

  // Cloudinary config - using direct values instead of env variables
  const cloudName = "db8otn3nk"; // Your Cloudinary cloud name
  const uploadPreset = "my_preset"; // Your upload preset

  useEffect(() => {
    // Fetch existing uploads from Firebase
    const fetchUploads = async () => {
      try {
        const newUploadedFiles = { ...uploadedFiles };
        
        for (const edition of editions) {
          for (let i = 0; i < 8; i++) {
            const pageNum = i + 1;
            const docRef = doc(db, 'pages', `${edition}_Page${pageNum}`);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
              const data = docSnap.data();
              newUploadedFiles[edition][i] = {
                name: data.name,
                url: data.url,
                status: data.status,
                uploaded: data.timestamp
              };
            }
          }
        }
        
        setUploadedFiles(newUploadedFiles);
      } catch (error) {
        console.error("Error fetching uploads:", error);
        setMessage("Failed to load existing uploads. Please try again.");
      }
    };
    
    fetchUploads();
  }, []);

  const handleEditionChange = (e) => {
    setSelectedEdition(e.target.value);
    setSelectedPage(''); // Reset page selection when edition changes
  };

  const handlePageChange = (e) => {
    setSelectedPage(e.target.value);
  };

  const handleFileChange = (e) => {
    if (!selectedEdition || !selectedPage) {
      setMessage('Please select an edition and page number first.');
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    // Check file format
    const validFormats = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validFormats.includes(file.type)) {
      setMessage('Invalid file format. Please upload PDF, JPG, or PNG files.');
      return;
    }

    // Update the uploaded files state temporarily
    const pageIndex = parseInt(selectedPage, 10) - 1;
    const newUploadedFiles = { ...uploadedFiles };
    newUploadedFiles[selectedEdition][pageIndex] = {
      file,
      name: `${selectedEdition}_Page${selectedPage}.${file.name.split('.').pop()}`,
      status: 'selected',
      uploaded: new Date().toLocaleString()
    };

    setUploadedFiles(newUploadedFiles);
    setMessage(`${file.name} selected successfully. Click "Review" to upload.`);
  };

  const uploadToCloudinary = async (file) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    
    try {
      console.log(`Uploading to: https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Cloudinary error response:', errorText);
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setIsUploading(false);
      console.log('Cloudinary upload successful:', data);
      return data.secure_url;
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      setIsUploading(false);
      setMessage(`Failed to upload file: ${error.message}. Please try again.`);
      return null;
    }
  };

  const handleReviewClick = async (edition, pageNum) => {
    const pageIndex = pageNum - 1;
    const fileInfo = uploadedFiles[edition][pageIndex];

    if (!fileInfo || !fileInfo.file) {
      setMessage('No file selected for this page.');
      return;
    }

    setMessage('Uploading to Cloudinary...');
    
    // Upload to Cloudinary
    const url = await uploadToCloudinary(fileInfo.file);
    if (!url) return;

    setMessage('Saving to Firebase...');
    
    // Save to Firebase
    try {
      const docRef = doc(db, 'pages', `${edition}_Page${pageNum}`);
      await setDoc(docRef, {
        name: fileInfo.name,
        url: url,
        status: 'review',
        timestamp: new Date().toISOString()
      });

      // Update the local state
      const newUploadedFiles = { ...uploadedFiles };
      newUploadedFiles[edition][pageIndex] = {
        ...fileInfo,
        url: url,
        status: 'review',
        uploaded: new Date().toLocaleString()
      };
      setUploadedFiles(newUploadedFiles);
      
      // Reset the selected page after successful upload
      setSelectedPage('');
      
      setMessage(`${fileInfo.name} uploaded successfully and is now in review.`);
    } catch (error) {
      console.error('Error saving to Firebase:', error);
      setMessage(`Failed to save file data: ${error.message}. Please try again.`);
    }
  };

  const pageIsCommon = (pageNum) => {
    return pageNum !== 1 && pageNum !== 8;
  };

  const getStatusIcon = (status) => {
    if (status === 'accepted') {
      return '✅';
    } else if (status === 'rejected') {
      return '❌';
    } else if (status === 'review') {
      return '⏳';
    }
    return '';
  };

  // Check if a page is available for upload
  const isPageAvailableForUpload = (edition, pageNum) => {
    if (!edition) return false;
    
    const pageIndex = pageNum - 1;
    const fileInfo = uploadedFiles[edition][pageIndex];
    
    // Page is available if:
    // 1. No file has been uploaded yet
    // 2. Previous upload was rejected
    return !fileInfo || fileInfo.status === 'rejected';
  };

  const renderUploadSummary = () => {
    return (
      <div className="upload-summary">
        <h3>Upload Summary</h3>
        {editions.map(edition => (
          <div key={edition} className="edition-summary">
            <h4>{edition} Edition</h4>
            <div className="page-grid">
              {uploadedFiles[edition].map((fileInfo, index) => {
                const pageNum = index + 1;
                const isCommon = pageIsCommon(pageNum);
                return (
                  <div 
                    key={index} 
                    className={`page-item ${isCommon ? 'common-page' : 'unique-page'} ${fileInfo ? 'uploaded' : 'pending'}`}
                  >
                    <div className="page-number">
                      Page {pageNum} {fileInfo && fileInfo.status && getStatusIcon(fileInfo.status)}
                    </div>
                    <div className="page-status">
                      {fileInfo ? (
                        <>
                          <div>{fileInfo.name}</div>
                          <div className="upload-time">{fileInfo.uploaded}</div>
                          {fileInfo.status === 'rejected' && (
                            <div className="rejected-message">Rejected. Please upload again.</div>
                          )}
                        </>
                      ) : (
                        'Not uploaded'
                      )}
                    </div>
                    <button 
                      className="common-tag"
                      onClick={() => handleReviewClick(edition, pageNum)}
                      disabled={isUploading || !fileInfo || fileInfo.status === 'accepted' || fileInfo.status === 'review' || !fileInfo.file}
                    >
                      {isUploading && edition === selectedEdition && pageNum === parseInt(selectedPage) ? 
                        'Uploading...' : 
                        fileInfo && fileInfo.status === 'accepted' ? 'Accepted' : 
                        fileInfo && fileInfo.status === 'review' ? 'In Review' : 'Review'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="upload-page-container">
      <h2>Upload Newspaper Pages</h2>
      
      <div className="upload-section">
        <div className="form-group">
          <label>Select Edition:</label>
          <select value={selectedEdition} onChange={handleEditionChange}>
            <option value="">-- Select Edition --</option>
            {editions.map(edition => (
              <option key={edition} value={edition}>{edition} Edition</option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label>Select Page Number:</label>
          <select 
            value={selectedPage} 
            onChange={handlePageChange}
            disabled={!selectedEdition}
          >
            <option value="">-- Select Page --</option>
            {pageNumbers.map(num => {
              const isAvailable = isPageAvailableForUpload(selectedEdition, num);
              const status = selectedEdition ? 
                (uploadedFiles[selectedEdition][num-1]?.status || 'available') : 
                'available';
              
              return (
                <option 
                  key={num} 
                  value={num}
                  disabled={!isAvailable}
                  style={{ color: isAvailable ? 'black' : '#aaa' }}
                >
                  Page {num} {num !== 1 && num !== 8 ? '(Common)' : '(Unique)'} 
                  {status === 'review' ? ' - In Review' : 
                   status === 'accepted' ? ' - Accepted' : ''}
                </option>
              );
            })}
          </select>
        </div>
        
        <div className="form-group">
          <label>Upload File (PDF, JPG, PNG):</label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            disabled={!selectedEdition || !selectedPage || isUploading || !isPageAvailableForUpload(selectedEdition, selectedPage)}
          />
        </div>
        
        {message && <div className="message">{message}</div>}
        
      </div>
      
      {renderUploadSummary()}
    </div>
  );
};

export default UploadPage;