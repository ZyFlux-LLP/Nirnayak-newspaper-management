import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, deleteDoc, addDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Download, ArrowLeft, CheckCircle, XCircle, Copy, Check, ExternalLink, Maximize, Eye, Send } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import '../css/Review.css';

// API URL - should be consistent across components
const API_URL = 'https://api-olbm2m4ljq-uc.a.run.app';

const Review = () => {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const [pageData, setPageData] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [success, setSuccess] = useState();
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [relatedPagesStatus, setRelatedPagesStatus] = useState(null);
  const [isResending, setIsResending] = useState(false);
  const [isApprovingAll, setIsApprovingAll] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  useEffect(() => {
    const fetchPageData = async () => {
      if (!pageId) {
        setError('No page ID provided');
        setIsLoading(false);
        return;
      }

      try {
        const pageRef = doc(db, 'pages', pageId);
        const pageSnap = await getDoc(pageRef);

        if (pageSnap.exists()) {
          const data = {
            id: pageSnap.id,
            ...pageSnap.data()
          };
          setPageData(data);

          // Fetch status of related pages after setting page data
          if (data.pageNumber && data.date && data.edition) {
            await checkRelatedPagesStatus(data);
          }
        } else {
          setError('Page not found');
        }
      } catch (err) {
        console.error('Error fetching page:', err);
        setError('Failed to load page data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPageData();
  }, [pageId]);

  // Check the status of related pages based on the grouping requirement
  const checkRelatedPagesStatus = async (currentPage) => {
    try {
      const edition = currentPage.edition;
      const date = currentPage.date;
      const currentPageNumber = parseInt(currentPage.pageNumber);

      // Shikhar Sanket has only 1 page total - no related pages!
      if (currentPage.newspaper === 'Shikhar Sanket') {
        setRelatedPagesStatus({});
        return;
      }

      // Determine which group of pages to check
      let relatedPageNumbers = [];

      if (currentPageNumber === 1 || currentPageNumber === 8) {
        // Group 1: Pages 1 and 8
        relatedPageNumbers = [1, 8];
      } else {
        // Group 2: Pages 2, 3, 4, 5, 6, 7
        relatedPageNumbers = [2, 3, 4, 5, 6, 7];
      }

      // Filter out the current page from the list
      relatedPageNumbers = relatedPageNumbers.filter(num => num !== currentPageNumber);

      // Query for related pages
      const pagesQuery = query(
        collection(db, 'pages'),
        where('edition', '==', edition),
        where('date', '==', date),
        where('pageNumber', 'in', relatedPageNumbers)
      );

      const pagesSnapshot = await getDocs(pagesQuery);

      // Create a map of page numbers to their status
      const pagesStatus = {};
      relatedPageNumbers.forEach(num => {
        pagesStatus[num] = { exists: false, status: null };
      });

      const currentNewspaper = currentPage.newspaper || 'Nirnayak';

      // Fill in the data from the query results
      pagesSnapshot.forEach(doc => {
        const pageData = doc.data();
        const docNewspaper = pageData.newspaper || 'Nirnayak';
        
        // Filter out other newspapers' pages (e.g. Shikhar Sanket)
        if (docNewspaper !== currentNewspaper) {
          return;
        }

        const pageNum = parseInt(pageData.pageNumber);
        if (pagesStatus[pageNum]) {
          pagesStatus[pageNum] = {
            exists: true,
            status: pageData.status,
            id: doc.id,
            url: pageData.url,
            name: pageData.name
          };
        }
      });

      setRelatedPagesStatus(pagesStatus);
    } catch (err) {
      console.error('Error checking related pages:', err);
    }
  };

  const goBack = () => {
    navigate('/dashboard');
  };

  // Navigate to view related page
  const navigateToRelatedPage = (relatedPageId) => {
    navigate(`/review/${relatedPageId}`);
  };

  // Copy URL to clipboard function
  const copyUrlToClipboard = async () => {
    if (pageData && pageData.url) {
      try {
        await navigator.clipboard.writeText(pageData.url);
        setCopied(true);

        // Reset the copied state after 2 seconds
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      } catch (err) {
        console.error("Failed to copy URL: ", err);
      }
    }
  };

  // Check if all related pages are approved
  const checkAllRelatedPagesApproved = () => {
    if (!relatedPagesStatus) return false;

    // Shikhar Sanket has only 1 page total - no related pages to approve
    if (pageData && pageData.newspaper === 'Shikhar Sanket') return true;

    return Object.values(relatedPagesStatus).every(page =>
      page.exists && page.status === 'accepted'
    );
  };

  // Check if all pages (including current) are approved
  const isEntireGroupApproved = () => {
    if (!pageData || !relatedPagesStatus) return false;

    // Shikhar Sanket has only 1 page total
    if (pageData.newspaper === 'Shikhar Sanket') {
      return pageData.status === 'accepted';
    }

    // Check if current page is approved
    const isCurrentPageApproved = pageData.status === 'accepted';

    // Check if all related pages are approved
    const areAllRelatedPagesApproved = Object.values(relatedPagesStatus).every(page =>
      page.exists && page.status === 'accepted'
    );

    return isCurrentPageApproved && areAllRelatedPagesApproved;
  };

  // Check if any page in the group is not yet approved
  const hasPendingPagesInGroup = () => {
    if (!pageData || !relatedPagesStatus) return false;

    // Shikhar Sanket has only 1 page total
    if (pageData.newspaper === 'Shikhar Sanket') {
      return pageData.status !== 'accepted';
    }

    // Check if current page is not approved
    const isCurrentPagePending = pageData.status !== 'accepted';

    // Check if any related page is not approved
    const anyRelatedPagePending = Object.values(relatedPagesStatus).some(page =>
      page.exists && page.status !== 'accepted'
    );

    return isCurrentPagePending || anyRelatedPagePending;
  };

  // Get group name based on page number
  const getGroupName = (pageNumber) => {
    if (pageData && pageData.newspaper === 'Shikhar Sanket') {
      return "Full Newspaper";
    }
    if (pageNumber === 1 || pageNumber === 8) {
      return "Cover Pages (1 & 8)";
    } else {
      return "Inner Pages (2-7)";
    }
  };

  // Handle approve action
  const handleApprove = async () => {
    try {
      setIsSending(true);

      // 1. Update the page status in Firestore
      await updatePageStatus('accepted');

      // 2. Check if this approval completes a group
      const groupCompleted = await checkGroupCompletion();

      // 3. If group is completed, send notification for the entire group
      if (groupCompleted) {
        await sendGroupNotification();
        
        // 4. After approval, check if ALL 8 pages for this edition are now approved
        const all8Approved = await checkAndMergeAll8Pages();
        if (all8Approved) {
            navigate('/dashboard', { state: { message: `Page approved, group notification sent, and FINAL NEWSPAPER MERGED!` } });
            return;
        }

        navigate('/dashboard', { state: { message: `Page approved and ${getGroupName(parseInt(pageData.pageNumber))} group notification sent!` } });
      } else {
        // Just update the page status without sending individual notification
        navigate('/dashboard', { state: { message: 'Page approved successfully' } });
      }
    } catch (error) {
      console.error("Error approving page:", error);
      setError("Error updating page status. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  // Send notification for the entire group
  const sendGroupNotification = async () => {
    const currentPageNumber = parseInt(pageData.pageNumber);
    let groupPages = [];

    if (pageData.newspaper === 'Shikhar Sanket') {
      groupPages = [1];
    } else if (currentPageNumber === 1 || currentPageNumber === 8) {
      // Send notification for Group 1: Pages 1 and 8
      groupPages = [1, 8];
    } else {
      // Send notification for Group 2: Pages 2-7
      groupPages = [2, 3, 4, 5, 6, 7];
    }

    try {
      // Collect all page data in the group
      const groupPageDataPromises = groupPages.map(async (pageNum) => {
        let pageRef;

        if (pageNum === parseInt(pageData.pageNumber)) {
          // Current page data
          return {
            name: pageData.name || `Page-${pageData.pageNumber}.pdf`,
            edition: pageData.edition,
            pageNumber: pageData.pageNumber,
            date: pageData.date,
            url: pageData.url
          };
        } else if (relatedPagesStatus[pageNum]?.id) {
          // Get data for other pages in the group
          pageRef = doc(db, 'pages', relatedPagesStatus[pageNum].id);
          const pageSnap = await getDoc(pageRef);
          if (pageSnap.exists()) {
            const data = pageSnap.data();
            return {
              name: data.name || `Page-${data.pageNumber}.pdf`,
              edition: data.edition,
              pageNumber: data.pageNumber,
              date: data.date,
              url: data.url
            };
          }
        }
        return null;
      });

      const groupPageData = await Promise.all(groupPageDataPromises);
      const validGroupPageData = groupPageData.filter(data => data !== null);

      console.log("Sending group notification with pages:", validGroupPageData);

      // Send group notification with pages data
      const response = await fetch(`${API_URL}/api/notify/pages-group-approved`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupName: getGroupName(currentPageNumber),
          edition: pageData.edition,
          date: pageData.date,
          pagesData: validGroupPageData,
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response from notification API:", errorData);
        throw new Error(`API returned ${response.status}: ${errorData.message || "Unknown error"}`);
      }

      const responseData = await response.json();
      console.log("Group notification API response:", responseData);

      return responseData;
    } catch (error) {
      console.error("Error sending group notification:", error);
      throw error;
    }
  };

  // Resend group notification
  const handleResend = async () => {
    try {
      setIsResending(true);
      await sendGroupNotification();
      // Instead of navigating away, stay on page and show success message
      setError("Group notification resent successfully!");
      setTimeout(() => setError(null), 3000);
    } catch (error) {
      console.error("Error resending notification:", error);
      setError("Failed to resend notification. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  // Handle Approve All pages in group
  const handleApproveAll = async (sendMail = true) => {
    try {
      setIsApprovingAll(true);

      // 1. If current page is not approved, approve it
      if (pageData.status !== 'accepted') {
        await updatePageStatus('accepted');
      }

      // 2. Approve all related pages that are not yet approved
      const updatePromises = [];
      for (const [pageNum, status] of Object.entries(relatedPagesStatus)) {
        if (status.exists && status.status !== 'accepted' && status.id) {
          const pageRef = doc(db, 'pages', status.id);
          updatePromises.push(
            updateDoc(pageRef, {
              status: 'accepted',
              reviewedAt: new Date().toISOString()
            })
          );
        }
      }

      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
      }

      // 3. Send group notification since all pages are now approved
      if (sendMail) {
        await sendGroupNotification();
      }

      // 4. Refresh page data to show updated statuses
      const pageRef = doc(db, 'pages', pageId);
      const pageSnap = await getDoc(pageRef);
      if (pageSnap.exists()) {
        const data = {
          id: pageSnap.id,
          ...pageSnap.data()
        };
        setPageData(data);

        // Refresh related pages status
        if (data.pageNumber && data.date && data.edition) {
          await checkRelatedPagesStatus(data);
        }
      }

      // 5. Check if all 8 pages are now approved to trigger the final merge
      const all8Merged = await checkAndMergeAll8Pages();

      if (all8Merged) {
        alert("All pages approved! Final newspaper merged, stored, and temporary files deleted.");
      } else if (sendMail) {
        alert("All pages in the group have been approved and notification sent!");
      } else {
        alert("All pages in the group have been approved and saved in archive without mail!");
      }
      setTimeout(() => setError(null), 3000);
    } catch (error) {
      console.error("Error approving all pages:", error);
      setError("There was an issue approving all pages. Please try individually.");
    } finally {
      setIsApprovingAll(false);
    }
  };

  // Check if this approval completes a group
  const checkGroupCompletion = async () => {
    if (!pageData) return false;

    // Shikhar Sanket has only 1 page total
    if (pageData.newspaper === 'Shikhar Sanket') {
      return true;
    }

    const currentPageNumber = parseInt(pageData.pageNumber);
    let relatedPages = [];

    // Determine the group
    if (currentPageNumber === 1 || currentPageNumber === 8) {
      relatedPages = [1, 8];
    } else {
      relatedPages = [2, 3, 4, 5, 6, 7];
    }

    // Remove the current page
    relatedPages = relatedPages.filter(num => num !== currentPageNumber);

    // Check if all related pages exist and are approved
    for (const pageNum of relatedPages) {
      if (!relatedPagesStatus[pageNum]?.exists || relatedPagesStatus[pageNum]?.status !== 'accepted') {
        return false;
      }
    }

    // If we've reached here, all related pages are approved
    return true;
  };

  // Handle reject action
  const handleReject = async () => {
    try {
      await updatePageStatus('rejected');
      navigate('/dashboard', { state: { message: 'Page rejected - Changes requested' } });
    } catch (error) {
      console.error("Error rejecting page:", error);
      setError("Failed to reject page. Please try again.");
    }
  };

  // Update page status in Firestore
  const updatePageStatus = async (newStatus) => {
    try {
      const pageRef = doc(db, 'pages', pageId);
      await updateDoc(pageRef, {
        status: newStatus,
        reviewedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error("Error updating page status:", error);
      throw error;
    }
  };

  // CHECK AND MERGE ALL 8 PAGES
  const checkAndMergeAll8Pages = async () => {
    if (!pageData) return false;

    try {
      setIsMerging(true);
      // 1. Fetch all 8 pages for this newspaper/edition/date
      const conditions = [
        where('edition', '==', pageData.edition),
        where('date', '==', pageData.date)
      ];
      if (pageData.newspaper) {
        conditions.push(where('newspaper', '==', pageData.newspaper));
      }

      const pagesQuery = query(collection(db, 'pages'), ...conditions);
      const snap = await getDocs(pagesQuery);
      
      const expectedPages = pageData.newspaper === 'Shikhar Sanket' ? 1 : 8;
      if (snap.size !== expectedPages) return false; // not all pages uploaded yet

      let allApproved = true;
      const pages = [];
      snap.forEach(document => {
        const data = document.data();
        if (data.status !== 'accepted') allApproved = false;
        pages.push({ id: document.id, ...data });
      });

      if (!allApproved) return false;

      const storage = getStorage();
      const newspaperName = pageData.newspaper || 'Nirnayak';
      const finalFilename = `final_newspapers/${newspaperName}_${pageData.date}_${pageData.edition}.pdf`;

      let pdfBlob;
      if (expectedPages === 1) {
        console.log("Single page newspaper approved! Fetching direct PDF...");
        const res = await fetch(pages[0].url);
        pdfBlob = await res.blob();
      } else {
        // All 8 are approved! Let's merge!
        console.log("All 8 pages approved! Starting merge process...");
        pages.sort((a, b) => parseInt(a.pageNumber) - parseInt(b.pageNumber));
        
        try {
          // Try to merge using backend first (avoids CORS issues on the frontend)
          const urls = pages.map(p => p.url);
          const res = await fetch('http://localhost:3000/merge-urls', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls })
          });
          
          if (!res.ok) throw new Error('Backend merge failed');
          pdfBlob = await res.blob();
        } catch (backendError) {
          console.log("Backend merge failed or unavailable, falling back to browser merge", backendError);
          // Fallback to browser merge using pdf-lib
          const mergedPdf = await PDFDocument.create();
          for (const p of pages) {
              const res = await fetch(p.url);
              const arrayBuffer = await res.arrayBuffer();
              const pdfDoc = await PDFDocument.load(arrayBuffer);
              const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
              copiedPages.forEach((page) => mergedPdf.addPage(page));
          }
          const pdfBytes = await mergedPdf.save();
          pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        }
      }

      // Upload to Firebase Storage
      console.log("Uploading final PDF to Firebase...");
      const finalRef = storageRef(storage, finalFilename);
      await uploadBytes(finalRef, pdfBlob);
      const finalUrl = await getDownloadURL(finalRef);

      // Save to final_newspapers collection
      console.log("Saving to Firestore final_newspapers collection...");
      await addDoc(collection(db, 'final_newspapers'), {
          newspaper: newspaperName,
          edition: pageData.edition,
          date: pageData.date,
          url: finalUrl,
          timestamp: new Date().toISOString()
      });

      // Delete temporary 8 pages from Storage and Firestore
      console.log("Deleting temporary 8 pages...");
      for (const p of pages) {
          if (p.storagePath) {
              const sRef = storageRef(storage, p.storagePath);
              try { await deleteObject(sRef); } catch (e) { console.error("Error deleting storage object", e); }
          }
          await deleteDoc(doc(db, 'pages', p.id));
      }

      console.log("Merge and cleanup complete!");
      return true;

    } catch (error) {
      console.error("Error during final merge:", error);
      alert("Error merging final newspaper: " + error.message);
      return false;
    } finally {
      setIsMerging(false);
    }
  };

{/* Add this function to the Review.js component */}
const handleViewApprovedPages = () => {
  // Navigate to ApprovedPages view with necessary data
  navigate('/approved-pages', {
    state: {
      edition: pageData.edition,
      date: pageData.date,
      currentPageNumber: pageData.pageNumber,
      groupType: parseInt(pageData.pageNumber) === 1 || parseInt(pageData.pageNumber) === 8 ? 'cover' : 'inner'
    }
  });
};

{/* Modify the renderRelatedPagesStatus function to add unapprove option */}

const renderRelatedPagesStatus = () => {
  if (!relatedPagesStatus) return null;

  // Shikhar Sanket has only 1 page total, no groups or other pages to show
  if (pageData && pageData.newspaper === 'Shikhar Sanket') {
    return null;
  }

  const currentPageNumber = parseInt(pageData?.pageNumber);
  let groupLabel;

  if (currentPageNumber === 1 || currentPageNumber === 8) {
    groupLabel = "Cover Pages Group (1 & 8)";
  } else {
    groupLabel = "Inner Pages Group (2-7)";
  }

  // Get the status of the current group
  const allApproved = checkAllRelatedPagesApproved();
  const entireGroupApproved = isEntireGroupApproved();
  const hasPendingPages = hasPendingPagesInGroup();

  const relatedPagesList = Object.entries(relatedPagesStatus).map(([pageNum, status]) => {
    return (
      <div key={pageNum} className="related-page-item">
        <div className="related-page-info">
          <span className="related-page-number">Page {pageNum}:</span>
          <span className={`related-page-status status-${status.status || 'unknown'}`}>
            {status.exists ? (status.status || 'unknown') : 'Not Uploaded'}
          </span>
        </div>
        {status.exists && status.id && (
          <button
            className="view-related-page-button"
            onClick={() => navigateToRelatedPage(status.id)}
            title={`View Page ${pageNum}`}
          >
            <Eye size={16} /> View Page
          </button>
        )}
      </div>
    );
  });

  return (
    <div className="related-pages-card">
      <h3>{groupLabel} Status</h3>
      <div className="related-pages-list">
        {relatedPagesList}
      </div>
      <div className="group-status">
        <span className="group-status-label">Group Status:</span>
        <span className={`group-status-value ${entireGroupApproved ? 'status-complete' : 'status-incomplete'}`}>
          {entireGroupApproved ? 'Approved' : (hasPendingPages ? 'Awaiting Approvals' : 'Ready to Send')}
        </span>
      </div>

      {entireGroupApproved ? (
        <div className="group-notice">
          All pages in this group are approved. You can resend the notification or unapprove pages if needed.
        </div>
      ) : allApproved && pageData.status !== 'accepted' ? (
        <div className="group-notice">
          All related pages are approved. Approving this page will send the entire group to printing!
        </div>
      ) : null}

      <div className="group-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          className="approve-all-button"
          onClick={() => handleApproveAll(true)}
          disabled={isApprovingAll || entireGroupApproved || isMerging}
        >
          {isApprovingAll || isMerging ? (
            <>
              <div className="spinner-small"></div> Processing...
            </>
          ) : (
            <>
              <CheckCircle size={16} /> Approve All With Mail
            </>
          )}
        </button>

        <button
          className="approve-all-button approve-all-no-mail-button"
          onClick={() => handleApproveAll(false)}
          disabled={isApprovingAll || entireGroupApproved || isMerging}
        >
          {isApprovingAll || isMerging ? (
            <>
              <div className="spinner-small"></div> Processing...
            </>
          ) : (
            <>
              <CheckCircle size={16} /> Approve All Without Mail
            </>
          )}
        </button>
        
        {entireGroupApproved && (
          <button
            className="unapprove-button"
            onClick={handleViewApprovedPages}
          >
            <XCircle size={16} /> Unapprove Pages
          </button>
        )}
      </div>
    </div>
  );
};

  if (isLoading || isMerging) {
    return (
      <div className="review-container">
        <div className="loading-wrapper">
          <div className="loading-spinner"></div>
          <p>{isMerging ? "Merging final newspaper and cleaning up..." : "Loading page details..."}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="review-container">
        <div className="error-message">
          <h3>{error.includes("successfully") ? "Success!" : "Error"}</h3>
          <p>{error}</p>
          <button className="primary-button" onClick={goBack}>
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!pageData) {
    return (
      <div className="review-container">
        <div className="error-message">
          <h3>Page Not Found</h3>
          <p>The requested page could not be found.</p>
          <button className="primary-button" onClick={goBack}>
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Determine if buttons should be disabled
  const isCurrentPageApproved = pageData.status === 'accepted';
  const isCurrentPageRejected = pageData.status === 'rejected';
  const entireGroupApproved = isEntireGroupApproved();

  return (
    <div className="review-container">
      <div className="review-header">
        <button className="back-button" onClick={goBack}>
          <ArrowLeft size={20} /> Back to Dashboard
        </button>
        <h2>Page Review</h2>
      </div>

      <div className="review-content">
        <div className="page-preview-panel">
          <div className="preview-header">
            <h3>Page Preview</h3>
            <div className="preview-actions">
              <button
                className="action-button copy-button"
                onClick={copyUrlToClipboard}
                title="Copy PDF URL to clipboard"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy URL'}
              </button>
              <a
                href={pageData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="action-button view-button"
                title="Open PDF in new tab"
              >
                <Maximize size={16} /> Full Screen
              </a>
              <a
                href={pageData.url}
                download
                className="action-button download-button"
                title="Download PDF file"
              >
                <Download size={16} /> Download
              </a>
            </div>
          </div>
          <div className="preview-container">
            <object
              data={pageData.url}
              type="application/pdf"
              className="pdf-viewer"
              aria-label={`PDF preview of ${pageData.name}`}
            >
              <div className="pdf-fallback">
                <p>Your browser doesn't support embedded PDFs. You can:</p>
                <div className="fallback-actions">
                  <a href={pageData.url} target="_blank" rel="noopener noreferrer" className="action-button view-button">
                    <ExternalLink size={16} /> View PDF
                  </a>
                  <a href={pageData.url} download className="action-button download-button">
                    <Download size={16} /> Download PDF
                  </a>
                </div>
              </div>
            </object>
          </div>
        </div>

        <div className="page-details-panel">
          <div className="details-card">
            <h3>Page Information</h3>
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">Filename</span>
                <span className="detail-value">{pageData.name}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Edition</span>
                <span className="detail-value">{pageData.edition}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Date</span>
                <span className="detail-value">
                  {new Date(pageData.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Page Number</span>
                <span className="detail-value">
                  {pageData.newspaper === 'Shikhar Sanket' ? 'pages 1 to 8' : pageData.pageNumber}
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Status</span>
                <span className={`detail-value status-${pageData.status}`}>
                  {pageData.status.charAt(0).toUpperCase() + pageData.status.slice(1)}
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Uploaded</span>
                <span className="detail-value">
                  {new Date(pageData.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Render related pages status card */}
          {renderRelatedPagesStatus()}

          <div className="actions-card">
            <h3>Review Actions</h3>
            <p className="action-description">
              {isCurrentPageApproved
                ? entireGroupApproved
                  ? "All pages in this group are approved. You can resend the group notification if needed."
                  : "This page has been approved. All pages must be approved before notifications are sent."
                : isCurrentPageRejected
                  ? "This page has been rejected. Please go back to dashboard for further actions."
                  : "Approve this page to include it in the final newspaper edition, or reject it to request changes."}
            </p>

            <div className="action-buttons">
              {!isCurrentPageApproved && !isCurrentPageRejected && (
                <button
                  className="reject-button"
                  onClick={handleReject}
                  disabled={isSending || isCurrentPageRejected}
                >
                  <XCircle size={20} /> Reject - Request Changes
                </button>
              )}

              {isCurrentPageApproved && entireGroupApproved ? (
                <button
                  className="resend-button"
                  onClick={handleResend}
                  disabled={isResending}
                >
                  {isResending ? (
                    <>
                      <div className="spinner-small"></div> Resending...
                    </>
                  ) : (
                    <>
                      <Send size={20} /> Resend Group Notification
                    </>
                  )}
                </button>
              ) : !isCurrentPageRejected && (
                <button
                  className="approve-button"
                  onClick={handleApprove}
                  disabled={isSending || isCurrentPageApproved || isMerging}
                >
                  {isSending || isMerging ? (
                    <>
                      <div className="spinner-small"></div> Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} /> {isCurrentPageApproved ? "Already Approved" : "Approve Page"}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Review;