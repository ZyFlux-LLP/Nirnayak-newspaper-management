import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/RateCards.css';
import { storage, db } from "../firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { collection, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { v4 as uuidv4 } from 'uuid';

const RateCardsPage = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [rateCards, setRateCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for edit functionality
  const [editingCard, setEditingCard] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editFile, setEditFile] = useState(null);
  const [fileChanged, setFileChanged] = useState(false);

  // State for custom upload
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [customTitle, setCustomTitle] = useState('');

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Fetch rate cards from Firestore
  useEffect(() => {
    fetchRateCards();
  }, []);

  const fetchRateCards = async () => {
    try {
      setIsLoading(true);
      const rateCardsCollection = collection(db, "rateCards");
      const rateCardsSnapshot = await getDocs(rateCardsCollection);
      const rateCardsList = rateCardsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRateCards(rateCardsList);
      setError(null);
    } catch (err) {
      console.error("Error fetching rate cards:", err);
      setError("Failed to load rate cards. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter rate cards based on search term
  const filteredRateCards = rateCards.filter(card => 
    card.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle file selection for custom upload
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Only allow PDFs
    if (file.type !== 'application/pdf') {
      setError("Only PDF files are allowed.");
      return;
    }

    setSelectedFile(file);
    // Pre-populate the title field with the filename (without extension)
    setCustomTitle(file.name.replace('.pdf', ''));
  };

  // Handle file selection for edit mode
  const handleEditFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Only allow PDFs
    if (file.type !== 'application/pdf') {
      setError("Only PDF files are allowed.");
      return;
    }

    setEditFile(file);
    setFileChanged(true);
  };

  // Cancel custom upload
  const cancelCustomUpload = () => {
    setShowUploadForm(false);
    setSelectedFile(null);
    setCustomTitle('');
  };

  // Start editing a rate card
  const startEditing = (card) => {
    setEditingCard(card.id);
    setEditTitle(card.title || '');
    setEditFile(null);
    setFileChanged(false);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingCard(null);
    setEditTitle('');
    setEditFile(null);
    setFileChanged(false);
  };

  // Save edited rate card
  const saveEditedCard = async (cardId) => {
    try {
      const rateCardRef = doc(db, "rateCards", cardId);
      const cardToUpdate = rateCards.find(card => card.id === cardId);
      
      // Prepare update data
      const updateData = {
        title: editTitle,
        lastUpdated: new Date().toISOString()
      };
      
      // If file was changed, upload the new file
      if (fileChanged && editFile) {
        setUploading(true);
        
        // Delete the old file if we have its storage path
        if (cardToUpdate.storagePath) {
          try {
            const oldFileRef = ref(storage, cardToUpdate.storagePath);
            await deleteObject(oldFileRef);
            console.log("Old file deleted successfully");
          } catch (err) {
            console.error("Error deleting old file:", err);
            // Continue with the update even if deletion fails
          }
        }
        
        // Upload the new file
        const newFileName = `ratecards/${uuidv4()}-${editFile.name}`;
        const storageRef = ref(storage, newFileName);
        
        await uploadBytes(storageRef, editFile);
        const downloadURL = await getDownloadURL(storageRef);
        
        // Add file details to the update data
        updateData.fileName = editFile.name;
        updateData.fileURL = downloadURL;
        updateData.storagePath = newFileName;
        updateData.size = editFile.size;
        setUploading(false);
      }
      
      // Update the document in Firestore
      await updateDoc(rateCardRef, updateData);
      
      setSuccess("Rate card updated successfully!");
      setEditingCard(null);
      setEditFile(null);
      setFileChanged(false);
      
      // Refresh rate cards list
      fetchRateCards();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (error) {
      console.error("Error updating rate card:", error);
      setError("Failed to update rate card. Please try again.");
    }
  };

  // Delete rate card
  const deleteRateCard = async (rateCardId, rateCardTitle) => {
    // Show confirmation dialog
    if (window.confirm(`Do you want to delete the rate card "${rateCardTitle || rateCardId}"?`)) {
      try {
        setError(null);
        const rateCardToDelete = rateCards.find(card => card.id === rateCardId);
        
        // Delete from Firestore
        const rateCardRef = doc(db, "rateCards", rateCardId);
        await deleteDoc(rateCardRef);
        
        // Delete the file from Firebase Storage if we have the path
        if (rateCardToDelete && rateCardToDelete.storagePath) {
          try {
            const storageRef = ref(storage, rateCardToDelete.storagePath);
            await deleteObject(storageRef);
            console.log("File deleted from storage successfully");
          } catch (storageErr) {
            console.error("Error deleting file from storage:", storageErr);
            // Continue even if storage deletion fails
          }
        }
        
        console.log("Rate card deleted with ID:", rateCardId);
        
        // Refresh rate cards list
        fetchRateCards();
        
        setSuccess("Rate card deleted successfully!");
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
        
      } catch (error) {
        console.error("Error deleting rate card:", error);
        setError("Failed to delete rate card. Please try again.");
      }
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return 'Unknown';
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (error) {
      console.error("Error formatting date:", error);
      return 'Invalid date';
    }
  };

  return (
    <div className="clients-container">

      <div className="content-wrapper">
        <div className="page-header">
          <h1>Rate Cards</h1>
        </div>
        
        <div className="clients-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search rate cards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
        </div>
        {/* Upload progress */}
        {uploading && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p>Uploading... {uploadProgress}%</p>
          </div>
        )}
        
        {/* Display error message if any */}
        {error && <div className="error-message">{error}</div>}
        
        {/* Display success message if any */}
        {success && <div className="success-message">{success}</div>}
        
        {/* Loading state */}
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading rate cards...</p>
          </div>
        ) : (
          /* Rate cards list */
          <div className="client-cards">
            {filteredRateCards.length > 0 ? (
              filteredRateCards.map(card => (
                <div key={card.id} className="client-card">
                  {editingCard === card.id ? (
                    // Edit mode
                    <>
                      <div className="edit-form">
                        <div className="form-group">
                          <label>Title:</label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="edit-input"
                            required
                          />
                        </div>
                        
                        <div className="form-group">
                          <label>PDF File:</label>
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={handleEditFileSelect}
                            className="file-input"
                          />
                          {editFile ? (
                            <div className="selected-file">
                              <span><i className="far fa-file-pdf"></i> {editFile.name}</span>
                              <span className="file-size">({formatFileSize(editFile.size)})</span>
                            </div>
                          ) : (
                            <div className="current-file">
                              <span>Current file: {card.fileName}</span>
                              <span className="optional-label">(Optional: Upload a new file to replace)</span>
                            </div>
                          )}
                        </div>
                       
                        <div className="edit-actions">
                          <button 
                            className="btn-save"
                            onClick={() => saveEditedCard(card.id)}
                            disabled={uploading}
                          >
                            Save Changes
                          </button>
                          <button 
                            className="btn-cancel"
                            onClick={cancelEditing}
                            disabled={uploading}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    // View mode
                    <>
                      <div className="client-header">
                        <h3>{card.title || 'Unnamed Rate Card'}</h3>
                        <span className="client-badge rate-card">
                          PDF
                        </span>
                      </div>
                      
                      <div className="client-details">
                        <p><strong>File Name:</strong> {card.fileName || 'Unknown'}</p>
                        <p><strong>Size:</strong> {formatFileSize(card.size)}</p>
                        <p><strong>Uploaded:</strong> {formatDate(card.uploadedAt)}</p>
                        {card.lastUpdated && (
                          <p><strong>Last Updated:</strong> {formatDate(card.lastUpdated)}</p>
                        )}
                      </div>
                      
                      <div className="client-actions">
                        <a 
                          href={card.fileURL} 
                          download={card.fileName}
                          className="btn-download"
                        >
                          Download
                        </a>
                        <button 
                          className="btn-edit" 
                          onClick={() => startEditing(card)}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn-delete" 
                          onClick={() => deleteRateCard(card.id, card.title)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            ) : (
              // Explicit no cards message
              <div className="no-rate-cards">
                <div className="empty-state">
                  <i className="far fa-file-pdf empty-state-icon"></i>
                  <h3>No Rate Cards Available</h3>
                  <p>{searchTerm ? 
                    "No rate cards match your search criteria." : 
                    "You haven't uploaded any rate cards yet. Use the Add New Rate Card button to get started."}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RateCardsPage;