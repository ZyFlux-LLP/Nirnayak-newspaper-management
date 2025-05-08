import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { ArrowLeft, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import '../css/ApprovedPages.css'; // We'll create this CSS file next

const ApprovedPages = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [approvedPages, setApprovedPages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unapproveStatus, setUnapproveStatus] = useState({});
  const [confirmUnapprove, setConfirmUnapprove] = useState(null);

  // Extract the state passed from Review.js
  const { edition, date, currentPageNumber, groupType } = location.state || {};

  useEffect(() => {
    const fetchApprovedPages = async () => {
      if (!edition || !date) {
        setError('Required information is missing');
        setIsLoading(false);
        return;
      }

      try {
        // Determine which pages belong to this group
        let pageNumbers = [];
        if (groupType === 'cover') {
          // Cover pages group (1 & 8)
          pageNumbers = [1, 8];
        } else {
          // Inner pages group (2-7)
          pageNumbers = [2, 3, 4, 5, 6, 7];
        }

        // Query for approved pages in this group
        const pagesQuery = query(
          collection(db, 'pages'),
          where('edition', '==', edition),
          where('date', '==', date),
          where('pageNumber', 'in', pageNumbers),
          where('status', '==', 'accepted')
        );

        const pagesSnapshot = await getDocs(pagesQuery);
        const approvedPagesData = [];

        pagesSnapshot.forEach(doc => {
          approvedPagesData.push({
            id: doc.id,
            ...doc.data()
          });
        });

        // Sort pages by page number
        approvedPagesData.sort((a, b) => parseInt(a.pageNumber) - parseInt(b.pageNumber));
        
        setApprovedPages(approvedPagesData);
        
        // Initialize unapprove status for each page
        const initialStatus = {};
        approvedPagesData.forEach(page => {
          initialStatus[page.id] = { isUnapproving: false, done: false, error: null };
        });
        setUnapproveStatus(initialStatus);
      } catch (err) {
        console.error('Error fetching approved pages:', err);
        setError('Failed to load approved pages');
      } finally {
        setIsLoading(false);
      }
    };

    fetchApprovedPages();
  }, [edition, date, groupType]);

  const goBack = () => {
    navigate(-1); // Go back to previous page
  };

  const handleUnapproveConfirmation = (pageId) => {
    setConfirmUnapprove(pageId);
  };

  const handleCancelUnapprove = () => {
    setConfirmUnapprove(null);
  };

  // Function to unapprove a page
  const handleUnapprove = async (pageId) => {
    // Update status for this specific page
    setUnapproveStatus(prevStatus => ({
      ...prevStatus,
      [pageId]: { ...prevStatus[pageId], isUnapproving: true, done: false, error: null }
    }));
    
    try {
      // Update the page status in Firestore to rejected
      const pageRef = doc(db, 'pages', pageId);
      await updateDoc(pageRef, {
        status: 'rejected',
        reviewedAt: new Date().toISOString()
      });
      
      // Update local state
      setApprovedPages(prevPages => 
        prevPages.filter(page => page.id !== pageId)
      );
      
      // Update unapprove status
      setUnapproveStatus(prevStatus => ({
        ...prevStatus,
        [pageId]: { isUnapproving: false, done: true, error: null }
      }));
      
      // Clear confirmation state
      setConfirmUnapprove(null);
    } catch (err) {
      console.error("Error unapproving page:", err);
      
      // Update error status
      setUnapproveStatus(prevStatus => ({
        ...prevStatus,
        [pageId]: { isUnapproving: false, done: false, error: "Failed to unapprove page" }
      }));
    }
  };

  // Get group name based on group type
  const getGroupName = () => {
    return groupType === 'cover' ? "Cover Pages (1 & 8)" : "Inner Pages (2-7)";
  };

  if (isLoading) {
    return (
      <div className="approved-pages-container">
        <div className="loading-wrapper">
          <div className="loading-spinner"></div>
          <p>Loading approved pages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="approved-pages-container">
        <div className="error-message">
          <h3>Error</h3>
          <p>{error}</p>
          <button className="primary-button" onClick={goBack}>
            <ArrowLeft size={16} /> Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="approved-pages-container">
      <div className="approved-pages-header">
        <button className="back-button" onClick={goBack}>
          <ArrowLeft size={20} /> Back
        </button>
        <h2>Approved Pages - {getGroupName()}</h2>
      </div>

      <div className="approved-pages-info">
        <p>
          <AlertCircle size={18} className="warning-icon" />
          Unapproving a page will change its status to "Rejected" and require re-approval of the entire group.
        </p>
      </div>

      {approvedPages.length === 0 ? (
        <div className="no-pages-message">
          <p>No approved pages found in this group.</p>
        </div>
      ) : (
        <div className="approved-pages-list">
          {approvedPages.map(page => (
            <div key={page.id} className="approved-page-card">
              <div className="page-preview">
                <object
                  data={page.url}
                  type="application/pdf"
                  className="mini-pdf-viewer"
                  aria-label={`PDF preview of ${page.name}`}
                >
                  <p>PDF preview not available</p>
                </object>
              </div>
              <div className="page-info">
                <h3>Page {page.pageNumber}</h3>
                <div className="page-details">
                  <p><strong>Filename:</strong> {page.name}</p>
                  <p><strong>Edition:</strong> {page.edition}</p>
                  <p><strong>Approved on:</strong> {new Date(page.reviewedAt).toLocaleString()}</p>
                </div>
                <div className="page-actions">
                  {confirmUnapprove === page.id ? (
                    <div className="confirm-actions">
                      <p>Are you sure you want to unapprove this page?</p>
                      <div className="confirm-buttons">
                        <button
                          className="cancel-button"
                          onClick={handleCancelUnapprove}
                        >
                          Cancel
                        </button>
                        <button
                          className="confirm-button"
                          onClick={() => handleUnapprove(page.id)}
                          disabled={unapproveStatus[page.id]?.isUnapproving}
                        >
                          {unapproveStatus[page.id]?.isUnapproving ? (
                            <>
                              <div className="spinner-small"></div> Processing...
                            </>
                          ) : (
                            "Confirm Unapprove"
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="unapprove-button"
                      onClick={() => handleUnapproveConfirmation(page.id)}
                      disabled={unapproveStatus[page.id]?.isUnapproving}
                    >
                      <XCircle size={16} /> Unapprove Page
                    </button>
                  )}
                  
                  {unapproveStatus[page.id]?.error && (
                    <div className="error-message">
                      {unapproveStatus[page.id].error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApprovedPages;