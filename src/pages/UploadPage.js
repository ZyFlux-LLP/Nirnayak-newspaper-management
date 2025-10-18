import React, { useState, useEffect } from 'react';
import '../css/UploadPage.css';
import { db } from '../firebase'; // Import your existing Firebase setup
import { collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'; // Import Firebase Storage

const UploadPage = () => {
  const [selectedEdition, setSelectedEdition] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedPage, setSelectedPage] = useState('');
  const [weekStartDate, setWeekStartDate] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [dateType, setDateType] = useState('daily'); // 'daily' or 'weekly'
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isNotifying, setIsNotifying] = useState(false);

  // New state for preview modal
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  // API URL for email service
  const API_URL = process.env.REACT_APP_API_URL || 'https://api-olbm2m4ljq-uc.a.run.app';

  const editions = ['Ujjain', 'Indore'];
  const pageNumbers = Array.from({ length: 8 }, (_, i) => i + 1);
  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Initialize Firebase Storage
  const storage = getStorage();

  // Generate date options: Today, Yesterday, Tomorrow
  const getTodayDate = () => {
    const today = new Date();
    return formatDate(today);
  };

  const getYesterdayDate = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return formatDate(yesterday);
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDate(tomorrow);
  };

  const formatDate = (date) => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  const formatDisplayDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Get date for a specific weekday based on week start date
  const getDateForWeekday = (weekStart, dayIndex) => {
    if (!weekStart) return '';
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIndex);
    return formatDate(date);
  };

  useEffect(() => {
    // Initialize with today's date
    const today = getTodayDate();
    setSelectedDate(today); // Set today as default selected date

    // Calculate the Monday of current week for weekly view
    const currentDate = new Date();
    const dayOfWeek = currentDate.getDay();
    const diff = currentDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(currentDate.setDate(diff));
    setWeekStartDate(formatDate(monday));

    // Fetch existing uploads from Firebase
    fetchUploads();
  }, []);

  // Fetch uploads based on current selection
  const fetchUploads = async () => {
    try {
      const newUploadedFiles = {};

      if (dateType === 'daily') {
        // Fetch daily papers (today, yesterday, tomorrow)
        const datesToFetch = [getTodayDate(), getYesterdayDate(), getTomorrowDate()];

        for (const date of datesToFetch) {
          newUploadedFiles[date] = {};

          for (const edition of editions) {
            newUploadedFiles[date][edition] = Array(8).fill(null);

            for (let i = 0; i < 8; i++) {
              const pageNum = i + 1;
              const docRef = doc(db, 'pages', `${date}_${edition}_Page${pageNum}`);
              const docSnap = await getDoc(docRef);

              if (docSnap.exists()) {
                const data = docSnap.data();
                newUploadedFiles[date][edition][i] = {
                  name: data.name,
                  url: data.url,
                  status: data.status,
                  uploaded: data.timestamp
                };
              }
            }
          }
        }
      } else {
        // Fetch weekly papers
        if (weekStartDate) {
          for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
            const date = getDateForWeekday(weekStartDate, dayIndex);
            newUploadedFiles[date] = {};

            for (const edition of editions) {
              newUploadedFiles[date][edition] = Array(8).fill(null);

              for (let i = 0; i < 8; i++) {
                const pageNum = i + 1;
                const docRef = doc(db, 'pages', `${date}_${edition}_Page${pageNum}`);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                  const data = docSnap.data();
                  newUploadedFiles[date][edition][i] = {
                    name: data.name,
                    url: data.url,
                    status: data.status,
                    uploaded: data.timestamp
                  };
                }
              }
            }
          }
        }
      }

      setUploadedFiles(newUploadedFiles);
    } catch (error) {
      console.error("Error fetching uploads:", error);
      setMessage("Failed to load existing uploads. Please try again.");
    }
  };

  // Send email notification about the page submission
  const sendPageSubmissionNotification = async (pageData) => {
    try {
      setIsNotifying(true);
      setMessage("Sending notification to admin...");

      // Prepare message for admin
      const subject = `New Page Submission for Review - ${pageData.edition} Edition, Page ${pageData.pageNumber}`;
      const messageText = `
A new newspaper page has been submitted for review:

Edition: ${pageData.edition}
Page Number: ${pageData.pageNumber}
Date: ${formatDisplayDate(pageData.date)}
Submission Time: ${new Date().toLocaleString()}

Please review the page at your earliest convenience.
Approve here: nirnayaknews.com/admin
      `;

      // Send notification to admin
      const response = await fetch(`${API_URL}/api/notify/review-submission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: 'adityaniltiwari@gmail.com',
          subject: subject,
          message: messageText,
          attachment: {
            url: pageData.url,
            filename: pageData.name
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send notification: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Notification result:", result);

      setMessage("Notification sent to admin for review");
    } catch (error) {
      console.error("Error sending notification:", error);
      setMessage(`Page uploaded successfully, but failed to notify admin: ${error.message}`);
    } finally {
      setIsNotifying(false);
    }
  };

  // Handle date type change (daily/weekly)
  const handleDateTypeChange = (e) => {
    setDateType(e.target.value);
    if (e.target.value === 'daily') {
      setSelectedDate(getTodayDate()); // Default to today
    } else {
      setSelectedDate(''); // Reset for weekly view
    }
    setSelectedEdition('');
    setSelectedPage('');
    // Refetch uploads
    fetchUploads();
  };

  // Handle week change for weekly view
  const handleWeekChange = (e) => {
    setWeekStartDate(e.target.value);
    setSelectedDate('');
    setSelectedEdition('');
    setSelectedPage('');
    // Fetch uploads for the new week
    fetchUploads();
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    setSelectedEdition('');
    setSelectedPage('');
  };

  const handleEditionChange = (e) => {
    setSelectedEdition(e.target.value);
    setSelectedPage('');
  };

  const handlePageChange = (e) => {
    setSelectedPage(e.target.value);
  };

  const handleFileChange = (e) => {
    if (!selectedDate || !selectedEdition || !selectedPage) {
      setMessage('Please select a date, edition, and page number first.');
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

    // Initialize nested objects if they don't exist
    if (!newUploadedFiles[selectedDate]) {
      newUploadedFiles[selectedDate] = {};
    }
    if (!newUploadedFiles[selectedDate][selectedEdition]) {
      newUploadedFiles[selectedDate][selectedEdition] = Array(8).fill(null);
    }

    newUploadedFiles[selectedDate][selectedEdition][pageIndex] = {
      file,
      name: `${selectedDate}_${selectedEdition}_Page${selectedPage}.${file.name.split('.').pop()}`,
      status: 'selected',
      uploaded: new Date().toLocaleString()
    };

    setUploadedFiles(newUploadedFiles);
    setMessage(`${file.name} selected successfully. Click "Review" to upload.`);
  };

  const uploadToFirebaseStorage = async (file, fileName) => {
    setIsUploading(true);
    setUploadProgress(0);

    // Create a reference to the file in Firebase Storage
    const storageRef = ref(storage, `newspaper_pages/${fileName}`);

    // Upload the file
    const uploadTask = uploadBytesResumable(storageRef, file);

    // Set up progress monitoring
    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => {
          // Track upload progress
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
          setMessage(`Uploading: ${progress.toFixed(0)}%`);
        },
        (error) => {
          // Handle errors
          console.error('Error uploading file:', error);
          setIsUploading(false);
          setUploadProgress(0);
          setMessage(`Failed to upload file: ${error.message}. Please try again.`);
          reject(error);
        },
        async () => {
          // Upload completed successfully
          try {
            // Get the download URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setIsUploading(false);
            setUploadProgress(0);
            setMessage('File uploaded successfully!');
            resolve(downloadURL);
          } catch (error) {
            console.error('Error getting download URL:', error);
            setIsUploading(false);
            setUploadProgress(0);
            setMessage(`Failed to get download URL: ${error.message}`);
            reject(error);
          }
        }
      );
    });
  };

  // Handle review click - now opens preview modal
  const handleReviewClick = (date, edition, pageNum) => {
    const pageIndex = pageNum - 1;

    // Safely access nested object
    const fileInfo = uploadedFiles[date]?.[edition]?.[pageIndex];

    if (!fileInfo || !fileInfo.file) {
      setMessage('No file selected for this page.');
      return;
    }

    // Create preview data
    const previewInfo = {
      date,
      edition,
      pageNum,
      fileInfo,
      previewUrl: URL.createObjectURL(fileInfo.file)
    };

    setPreviewData(previewInfo);
    setShowPreview(true);
  };

  // Confirm and proceed with upload
  const confirmUpload = async () => {
    if (!previewData) return;

    const { date, edition, pageNum, fileInfo } = previewData;
    const pageIndex = pageNum - 1;

    setShowPreview(false);
    setMessage('Uploading to Firebase Storage...');

    // Create a unique filename
    const fileName = `${date}_${edition}_Page${pageNum}_${Date.now()}.${fileInfo.file.name.split('.').pop()}`;

    try {
      // Upload to Firebase Storage
      const url = await uploadToFirebaseStorage(fileInfo.file, fileName);
      if (!url) return;

      setMessage('Saving to Firebase Firestore...');

      // Page data to be saved in Firestore and sent in notification
      const pageData = {
        name: fileInfo.name,
        url: url,
        status: 'review',
        timestamp: new Date().toISOString(),
        date: date,
        edition: edition,
        pageNumber: pageNum,
        storagePath: `newspaper_pages/${fileName}`
      };

      // Save to Firebase Firestore
      const docRef = doc(db, 'pages', `${date}_${edition}_Page${pageNum}`);
      await setDoc(docRef, pageData);

      // Update the local state
      const newUploadedFiles = { ...uploadedFiles };
      if (!newUploadedFiles[date]) newUploadedFiles[date] = {};
      if (!newUploadedFiles[date][edition]) newUploadedFiles[date][edition] = Array(8).fill(null);

      newUploadedFiles[date][edition][pageIndex] = {
        ...fileInfo,
        url: url,
        status: 'review',
        uploaded: new Date().toLocaleString()
      };
      setUploadedFiles(newUploadedFiles);

      // Send email notification
      await sendPageSubmissionNotification(pageData);

      // Reset the selected page after successful upload
      setSelectedPage('');

      setMessage(`${fileInfo.name} uploaded successfully and is now in review. Admin has been notified.`);

      // Clean up preview URL
      if (previewData.previewUrl) {
        URL.revokeObjectURL(previewData.previewUrl);
      }
      setPreviewData(null);

      alert("Page has been uploaded and sent for review!");

    } catch (error) {
      console.error('Error in upload process:', error);
      setMessage(`Failed to upload: ${error.message}. Please try again.`);
    }
  };

  // Cancel preview
  const cancelPreview = () => {
    if (previewData && previewData.previewUrl) {
      URL.revokeObjectURL(previewData.previewUrl);
    }
    setPreviewData(null);
    setShowPreview(false);
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
  const isPageAvailableForUpload = (date, edition, pageNum) => {
    if (!date || !edition) return false;

    const pageIndex = pageNum - 1;
    // Safely access nested objects
    const fileInfo = uploadedFiles[date]?.[edition]?.[pageIndex];

    // Page is available if:
    // 1. No file has been uploaded yet
    // 2. Previous upload was rejected
    return !fileInfo || fileInfo.status === 'rejected';
  };

  const getDateOptions = () => {
    if (dateType === 'daily') {
      return (
        <select value={selectedDate} onChange={handleDateChange}>
          <option value="">-- Select Date --</option>
          <option value={getTodayDate()}>Today ({formatDisplayDate(getTodayDate())})</option>
          <option value={getYesterdayDate()}>Yesterday ({formatDisplayDate(getYesterdayDate())})</option>
          <option value={getTomorrowDate()}>Tomorrow ({formatDisplayDate(getTomorrowDate())})</option>
        </select>
      );
    } else {
      // For weekly view
      return (
        <>
          <div className="form-group">
            <label>Select Week Starting:</label>
            <input
              type="date"
              value={weekStartDate}
              onChange={handleWeekChange}
            />
          </div>
          <div className="form-group">
            <label>Select Day:</label>
            <select value={selectedDate} onChange={handleDateChange}>
              <option value="">-- Select Day --</option>
              {weekDays.map((day, index) => {
                const date = getDateForWeekday(weekStartDate, index);
                return (
                  <option key={index} value={date}>
                    {day} ({formatDisplayDate(date)})
                  </option>
                );
              })}
            </select>
          </div>
        </>
      );
    }
  };

  const renderPageItem = (date, edition, pageNum, fileInfo, isCommon) => {
    return (
      <div
        key={pageNum}
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
          onClick={() => handleReviewClick(date, edition, pageNum)}
          disabled={isUploading || isNotifying || !fileInfo || fileInfo.status === 'accepted' || fileInfo.status === 'review' || !fileInfo.file}
        >
          {(isUploading || isNotifying) && date === selectedDate && edition === selectedEdition && pageNum === parseInt(selectedPage) ?
            (isUploading ? 'Uploading...' : 'Notifying...') :
            fileInfo && fileInfo.status === 'accepted' ? 'Accepted' :
              fileInfo && fileInfo.status === 'review' ? 'In Review' : 'Review'}
        </button>
      </div>
    );
  };

  const renderUploadSummary = () => {
    // If no date is selected, display a message to select a date
    if (!selectedDate) {
      return <div className="no-data">Please select a date to view uploads</div>;
    }

    // Ensure we have data for the selected date
    if (!uploadedFiles[selectedDate]) {
      return <div className="no-data">No uploads found for {formatDisplayDate(selectedDate)}</div>;
    }

    // Show summary only for the selected date
    return (
      <div className="upload-summary">
        <h3>Upload Summary for {formatDisplayDate(selectedDate)}</h3>
        <div className="date-container">
          {editions.map(edition => (
            <div key={`${selectedDate}_${edition}`} className="edition-summary">
              <h4>{edition} Edition</h4>
              <div className="page-grid">
                {uploadedFiles[selectedDate][edition]?.map((fileInfo, index) => {
                  const pageNum = index + 1;
                  const isCommon = pageIsCommon(pageNum);
                  return renderPageItem(selectedDate, edition, pageNum, fileInfo, isCommon);
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Preview Modal Component
  const PreviewModal = () => {
    if (!showPreview || !previewData) return null;

    const { date, edition, pageNum, fileInfo, previewUrl } = previewData;
    const fileType = fileInfo.file.type;
    const isPDF = fileType === 'application/pdf';
    const isImage = fileType.startsWith('image/');

    return (
      <div className="preview-modal-overlay">
        <div className="preview-modal">
          <div className="preview-header">
            <h3>Review Page Before Upload</h3>
            <button className="close-button" onClick={cancelPreview}>×</button>
          </div>

          <div className="preview-info">
            <p><strong>Date:</strong> {formatDisplayDate(date)}</p>
            <p><strong>Edition:</strong> {edition}</p>
            <p><strong>Page Number:</strong> {pageNum}</p>
            <p><strong>File:</strong> {fileInfo.file.name}</p>
          </div>

          <div className="preview-content">
            {isPDF ? (
              <div className="pdf-preview">
                <embed
                  src={previewUrl}
                  type="application/pdf"
                  width="100%"
                  height="500px"
                />
              </div>
            ) : isImage ? (
              <div className="image-preview">
                <img
                  src={previewUrl}
                  alt={`Page ${pageNum} preview`}
                  style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }}
                />
              </div>
            ) : (
              <div className="unsupported-preview">
                <p>Preview not available for this file type.</p>
                <p>File: {fileInfo.file.name}</p>
              </div>
            )}
          </div>

          <div className="preview-actions">
            <button
              className="cancel-button"
              onClick={cancelPreview}
              disabled={isUploading || isNotifying}
            >
              Cancel
            </button>
            <button
              className="confirm-button"
              onClick={confirmUpload}
              disabled={isUploading || isNotifying}
            >
              {isUploading ? 'Uploading...' : isNotifying ? 'Notifying...' : 'Confirm & Send for Review'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="upload-page-container">
      <h2>Upload Newspaper Pages</h2>

      <div className="upload-section">
        <div className="form-group">
          <label>Select Paper Type:</label>
          <select value={dateType} onChange={handleDateTypeChange}>
            <option value="daily">Daily Papers</option>
            <option value="weekly">Weekly Papers</option>
          </select>
        </div>

        {getDateOptions()}

        <div className="form-group">
          <label>Select Edition:</label>
          <select
            value={selectedEdition}
            onChange={handleEditionChange}
            disabled={!selectedDate}
          >
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
            disabled={!selectedEdition || !selectedDate}
          >
            <option value="">-- Select Page --</option>
            {pageNumbers.map(num => {
              const isAvailable = isPageAvailableForUpload(selectedDate, selectedEdition, num);
              const status = selectedDate && selectedEdition ?
                (uploadedFiles[selectedDate]?.[selectedEdition]?.[num - 1]?.status || 'available') :
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
            disabled={!selectedEdition || !selectedPage || !selectedDate || isUploading || isNotifying || !isPageAvailableForUpload(selectedDate, selectedEdition, selectedPage)}
          />
        </div>

        {message && <div className="message">{message}</div>}

        {isUploading && (
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
            <span className="progress-text">{uploadProgress.toFixed(0)}%</span>
          </div>
        )}
      </div>

      {renderUploadSummary()}

      {/* Preview Modal */}
      <PreviewModal />
    </div>
  );
};

export default UploadPage;