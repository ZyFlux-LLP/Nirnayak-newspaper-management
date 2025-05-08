import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; // Import your existing Firebase setup
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import '../css/Dashboard.css';
import { Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
// import { Modal, Input, Button } from 'antd';
// API URL - should be consistent across components
const API_URL = 'https://api-olbm2m4ljq-uc.a.run.app';

const Dashboard = () => {
  const [selectedDate, setSelectedDate] = useState('');
  const [dateType, setDateType] = useState('daily'); // 'daily' or 'weekly'
  const [weekStartDate, setWeekStartDate] = useState('');
  const [pagesData, setPagesData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [editionStats, setEditionStats] = useState({});
  const [recentUploads, setRecentUploads] = useState([]);
  const [downloadingEdition, setDownloadingEdition] = useState(null);
  const [generatedPdfs, setGeneratedPdfs] = useState({});
  const navigate = useNavigate();

  const editions = ['Ujjain', 'Indore'];
  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Date utility functions - same as in UploadPage
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
    setSelectedDate(today);

    // Calculate the Monday of current week for weekly view
    const currentDate = new Date();
    const dayOfWeek = currentDate.getDay();
    const diff = currentDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(currentDate.setDate(diff));
    setWeekStartDate(formatDate(monday));

    // Fetch data immediately when component mounts
    fetchData();
  }, []);

  // Fetch data when date selection changes
  useEffect(() => {
    if (selectedDate || (dateType === 'weekly' && weekStartDate)) {
      fetchData();
    }
  }, [selectedDate, dateType, weekStartDate]);

  // Check if all pages are accepted and generate PDF if needed
  useEffect(() => {
    checkAndGeneratePdfs();
  }, [pagesData]);

  // Check if all pages are accepted for each edition and date
  const checkAndGeneratePdfs = async () => {
    const newGeneratedPdfs = { ...generatedPdfs };

    // For each date with data
    for (const date in pagesData) {
      // For each edition
      for (const edition of editions) {
        const editionPages = pagesData[date][edition];

        if (!editionPages || editionPages.length !== 8) continue;

        // Check if all 8 pages exist and are accepted
        const allPagesAccepted = editionPages.length === 8 &&
          editionPages.every(page => page && page.status === 'accepted');

        // Create unique key for this edition and date
        const pdfKey = `${date}_${edition}`;

        // If all pages are accepted and we haven't already generated a PDF, generate one
        if (allPagesAccepted && !newGeneratedPdfs[pdfKey]) {
          try {
            // Don't actually generate the PDF here, just store the key for later
            // This will happen when the user clicks the button
            newGeneratedPdfs[pdfKey] = {
              generated: false,
              url: null,
              date,
              edition
            };
          } catch (error) {
            console.error(`Error pre-checking PDF generation status for ${edition} on ${date}:`, error);
          }
        }
      }
    }

    setGeneratedPdfs(newGeneratedPdfs);
  };

// Dashboard.js - Updated generateAndDownloadPdf function

const generateAndDownloadPdf = async (date, edition) => {
  const pdfKey = `${date}_${edition}`;
  const editionPages = pagesData[date]?.[edition];

  console.log("🛠️ Attempting to generate PDF...");
  console.log("📅 Date:", date, "📰 Edition:", edition);
  
  if (!editionPages || editionPages.length !== 8) {
      console.error("❌ Cannot generate PDF: missing pages.");
      alert("Cannot generate PDF: missing pages.");
      return;
  }

  // Check if all pages are accepted
  const allPagesAccepted = editionPages.every(page => page && page.status === 'accepted');

  if (!allPagesAccepted) {
      console.error("❌ Cannot generate PDF: Not all pages are accepted.");
      alert("Cannot generate PDF: not all pages are accepted.");
      return;
  }

  try {
      setDownloadingEdition(pdfKey);

      // Gather all page URLs in order
      const pageUrls = editionPages.map(page => page.url);

      console.log("📜 Sending page URLs:", pageUrls);

      if (pageUrls.some(url => !url)) {
          console.error("❌ Some page URLs are missing!");
          alert("Some page URLs are missing. Cannot generate PDF.");
          return;
      }

      // Enhanced API call with better error handling
      console.log("🔗 API URL:", API_URL + "/api/generate-pdf");
      
      const response = await fetch(`${API_URL}/api/generate-pdf`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Origin': window.location.origin,
          },
          mode: 'cors', // Explicitly set CORS mode
          credentials: 'include', // Include credentials if needed
          body: JSON.stringify({
              pageUrls,
              date,
              edition,
              compressionLevel: 'medium'
          }),
      });

      // Log response status for debugging
      console.log(`Response status: ${response.status} ${response.statusText}`);

      // Handle non-success responses
      if (!response.ok) {
          const errorText = await response.text();
          console.error("Error response:", errorText);
          throw new Error(`❌ Failed to generate PDF: ${response.statusText || 'Server error'}`);
      }

      // Parse JSON response, with error handling
      let result;
      try {
          result = await response.json();
          console.log("✅ PDF generated:", result);
      } catch (jsonError) {
          console.error("Failed to parse JSON response:", jsonError);
          throw new Error("Server returned invalid response format");
      }

      if (!result.pdfUrl) {
          console.error("❌ No PDF URL returned from server.");
          alert("Failed to retrieve the PDF URL.");
          return;
      }

      // Prompt for issue number using native browser prompt
      const customIssueNumber = prompt('Enter Custom Issue Number:', '');

      // If no issue number is provided, throw an error
      if (!customIssueNumber || customIssueNumber.trim() === '') {
          throw new Error('Issue number is required');
      }

      // Generate constant title based on edition and date
      const title = `${edition.toUpperCase()}_${date.replace(/-/g, '')}`;

      // Update our state with the new PDF URL
      const updatedPdfs = { ...generatedPdfs };
      updatedPdfs[pdfKey] = {
          ...updatedPdfs[pdfKey],
          generated: true,
          url: result.pdfUrl
      };
      setGeneratedPdfs(updatedPdfs);

      // Store PDF information in Firestore
      // The date parameter already contains the selected date, so we're using it correctly here
      try {
          await addDoc(collection(db, 'newspaper_data'), {
              date: date, // This is already the selected date passed from the calling function
              edition: edition,
              issueNumber: customIssueNumber,
              pdfUrl: result.pdfUrl,
              timestamp: new Date(), // This is just the current timestamp of when the PDF was generated
              title: title
          });
          console.log(`✅ PDF information stored in Firestore for ${edition} on ${date}`);
      } catch (firestoreError) {
          console.error("Failed to store PDF info in Firestore:", firestoreError);
          // Continue execution - we still have the PDF URL
      }

      // Open PDF in new tab
      window.open(result.pdfUrl, '_blank');
  } catch (error) {
      console.error("❌ Error generating PDF:", error);
      if (error.message === 'Issue number is required') {
          alert('Issue number is required. Please try again.');
      } else {
          alert(`Failed to generate PDF: ${error.message}. Please try again later.`);
      }
  } finally {
      setDownloadingEdition(null);
  }
};

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch pages data
      const newPagesData = {};
      const stats = {};
      let datesToFetch = [];

      if (dateType === 'daily') {
        datesToFetch = [selectedDate];
        // Also fetch yesterday and tomorrow for context
        if (selectedDate === getTodayDate()) {
          datesToFetch = [getTodayDate(), getYesterdayDate(), getTomorrowDate()];
        } else if (selectedDate === getYesterdayDate()) {
          datesToFetch = [getYesterdayDate(), getTodayDate()];
        } else if (selectedDate === getTomorrowDate()) {
          datesToFetch = [getTomorrowDate(), getTodayDate()];
        }
      } else {
        // Weekly view
        datesToFetch = [];
        for (let i = 0; i < 7; i++) {
          datesToFetch.push(getDateForWeekday(weekStartDate, i));
        }
      }

      // Initialize stats for all editions
      editions.forEach(edition => {
        stats[edition] = {
          totalPages: 8 * datesToFetch.length,
          uploadedPages: 0,
          acceptedPages: 0,
          rejectedPages: 0,
          reviewPages: 0
        };
      });

      // Fetch pages for each date
      for (const date of datesToFetch) {
        newPagesData[date] = {};

        for (const edition of editions) {
          newPagesData[date][edition] = [];

          // Fetch pages for this date and edition
          const q = query(
            collection(db, 'pages'),
            where('date', '==', date),
            where('edition', '==', edition)
          );

          const querySnapshot = await getDocs(q);

          // Initialize with 8 empty pages
          for (let i = 0; i < 8; i++) {
            newPagesData[date][edition][i] = null;
          }

          // Fill in the fetched pages
          querySnapshot.forEach(doc => {
            const data = doc.data();
            const pageIndex = data.pageNumber - 1;

            // Store the page data with its document ID
            newPagesData[date][edition][pageIndex] = {
              id: doc.id,
              ...data
            };

            // Update stats
            stats[edition].uploadedPages++;

            if (data.status === 'accepted') {
              stats[edition].acceptedPages++;
            } else if (data.status === 'rejected') {
              stats[edition].rejectedPages++;
            } else if (data.status === 'review') {
              stats[edition].reviewPages++;
            }
          });
        }
      }

      setPagesData(newPagesData);
      setEditionStats(stats);

      // 2. Fetch recent uploads (last 10 uploads in review status)
      const recentQ = query(
        collection(db, 'pages'),
        where('status', '==', 'review')
      );

      const recentSnapshot = await getDocs(recentQ);
      const recentData = [];

      recentSnapshot.forEach(doc => {
        recentData.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Sort by timestamp (newest first)
      recentData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Take only the 10 most recent
      setRecentUploads(recentData.slice(0, 10));

      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setIsLoading(false);
    }
  };

  // Handle date type change (daily/weekly)
  const handleDateTypeChange = (e) => {
    setDateType(e.target.value);
    if (e.target.value === 'daily') {
      setSelectedDate(getTodayDate());
    } else {
      // Using the current week start date
    }
  };

  // Handle week change for weekly view
  const handleWeekChange = (e) => {
    setWeekStartDate(e.target.value);
  };

  // Handle date selection
  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  // Navigate to page review
  const navigateToPageReview = (page) => {
    navigate(`/review/${page.id}`, { state: { pageData: page } });
  };

  const getStatusClass = (status) => {
    if (!status) return '';
    switch (status) {
      case 'accepted': return 'status-accepted';
      case 'rejected': return 'status-rejected';
      case 'review': return 'status-review';
      default: return '';
    }
  };

  const getDateOptions = () => {
    if (dateType === 'daily') {
      return (
        <select value={selectedDate} onChange={handleDateChange}>
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
            <label>Week Starting:</label>
            <input
              type="date"
              value={weekStartDate}
              onChange={handleWeekChange}
            />
          </div>
          <div className="form-group">
            <label>Day:</label>
            <select value={selectedDate} onChange={handleDateChange}>
              <option value="">All Days</option>
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

  // Check if all pages are accepted for a specific date and edition
  const areAllPagesAccepted = (date, edition) => {
    if (!pagesData[date] || !pagesData[date][edition]) return false;

    const pages = pagesData[date][edition];
    if (pages.length !== 8) return false;

    return pages.every(page => page && page.status === 'accepted');
  };

  const renderEditionTabs = () => {
    if (selectedDate && pagesData[selectedDate]) {
      return (
        <div className="date-container">
          <h3>{formatDisplayDate(selectedDate)}</h3>
          <div className="editions-container">
            {editions.map(edition => {
              const allAccepted = areAllPagesAccepted(selectedDate, edition);
              const pdfKey = `${selectedDate}_${edition}`;
              const isPdfReady = generatedPdfs[pdfKey]?.generated;
              const isDownloading = downloadingEdition === pdfKey;

              return (
                <div key={edition} className="edition-pages">
                  <div className="edition-header">
                    <h4>{edition} Edition</h4>
                    <div className="edition-actions">
                      <button
                        className={`download-all-button ${allAccepted ? 'active' : 'disabled'}`}
                        disabled={!allAccepted || isDownloading}
                        onClick={() => generateAndDownloadPdf(selectedDate, edition)}
                      >
                        {isDownloading ? 'Generating...' : (
                          <>
                            <Download size={16} /> Download All Pages
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="pages-grid">
                    {pagesData[selectedDate][edition]?.map((page, index) => (
                      <div
                        key={`${selectedDate}_${edition}_${index}`}
                        className={`page-card ${page ? getStatusClass(page.status) : 'page-missing'}`}
                      >
                        <div className="page-header">
                          <span>Page {index + 1}</span>
                          {page && (
                            <span className="page-status">{page.status}</span>
                          )}
                        </div>
                        {page ? (
                          <>
                            <div className="page-thumbnail">
                              {page.url && (
                                <iframe
                                  src={page.url}
                                  alt={`${edition} Page ${index + 1}`}
                                  className="thumbnail-image"
                                />
                              )}
                            </div>
                            <div className="page-actions">
                              <button
                                className="review-button"
                                onClick={() => navigateToPageReview(page)}
                              >
                                Review
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="page-placeholder">
                            Not uploaded
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    } else if (dateType === 'weekly') {
      // Show weekly summary
      return (
        <div className="week-summary">
          <h3>Week of {formatDisplayDate(weekStartDate)}</h3>
          <div className="days-grid">
            {weekDays.map((day, index) => {
              const date = getDateForWeekday(weekStartDate, index);
              const hasData = pagesData[date] ? true : false;

              return (
                <div key={day} className="day-card">
                  <h4>{day}</h4>
                  <div className={`day-status ${hasData ? 'has-data' : 'no-data'}`}>
                    {hasData ? (
                      <button
                        className="view-day-button"
                        onClick={() => setSelectedDate(date)}
                      >
                        View Pages
                      </button>
                    ) : (
                      <span>No uploads</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return null;
  };

  // Calculate completion percentages for each edition
  const calculateCompletion = (edition) => {
    if (!editionStats[edition]) return { upload: 0, review: 0, approved: 0 };

    const stats = editionStats[edition];
    const totalPages = stats.totalPages || 1; // Prevent division by zero

    return {
      upload: Math.round((stats.uploadedPages / totalPages) * 100),
      review: Math.round(((stats.acceptedPages + stats.rejectedPages) / stats.uploadedPages) * 100) || 0,
      approved: Math.round((stats.acceptedPages / stats.uploadedPages) * 100) || 0
    };
  };

  // Render stats dashboard
  const renderStats = () => {
    return (
      <div className="stats-dashboard">
        <h3>Current Status</h3>
        <div className="editions-stats">
          {editions.map(edition => {
            const completion = calculateCompletion(edition);
            const stats = editionStats[edition] || {};

            return (
              <div key={edition} className="edition-stat-card">
                <h4>{edition} Edition</h4>
                <div className="stat-grid">
                  <div className="stat-item">
                    <span className="stat-label">Pages Uploaded</span>
                    <span className="stat-value">{stats.uploadedPages || 0}/{stats.totalPages || 0}</span>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${completion.upload}%` }}
                      ></div>
                    </div>
                    <span className="stat-percentage">{completion.upload}%</span>
                  </div>

                  <div className="stat-item">
                    <span className="stat-label">Pages Reviewed</span>
                    <span className="stat-value">
                      {(stats.acceptedPages || 0) + (stats.rejectedPages || 0)}/{stats.uploadedPages || 0}
                    </span>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${completion.review}%` }}
                      ></div>
                    </div>
                    <span className="stat-percentage">{completion.review}%</span>
                  </div>

                  <div className="stat-item">
                    <span className="stat-label">Pages Approved</span>
                    <span className="stat-value">{stats.acceptedPages || 0}/{stats.uploadedPages || 0}</span>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${completion.approved}%` }}
                      ></div>
                    </div>
                    <span className="stat-percentage">{completion.approved}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render recent uploads that need review
  const renderRecentUploads = () => {
    if (!recentUploads || recentUploads.length === 0) {
      return (
        <div className="recent-uploads">
          <h3>Recent Uploads Pending Review</h3>
          <p className="no-uploads">No pages pending review</p>
        </div>
      );
    }
    
    return (

      <div className="recent-uploads">
        <h3>Recent Uploads Pending Review</h3>
        <div className="uploads-grid">
          {recentUploads.map(page => (
            <div key={page.id} className="upload-card">
              <div className="upload-thumbnail">
                {page.url && (
                  page.url.toLowerCase().endsWith('.pdf') ? (
                    <div className="pdf-thumbnail">
                      <object
                        data={page.url}
                        type="application/pdf"
                        className="pdf-preview"
                      >
                        <div className="pdf-fallback">
                          <div className="pdf-icon">PDF</div>
                        </div>
                      </object>
                    </div>
                  ) : (
                    <iframe
                      src={page.url}
                      alt={page.name}
                      className="thumbnail-image"
                    />
                  )
                )}
              </div>
              <div className="upload-details">
                <p><strong>{page.edition}</strong> - Page {page.pageNumber}</p>
                <p>{formatDisplayDate(page.date)}</p>
                <p className="upload-time">
                  Uploaded {new Date(page.timestamp).toLocaleTimeString()}
                </p>
              </div>
              <button
                className="review-button"
                onClick={() => navigateToPageReview(page)}
              >
                Review
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    
    <div className="dashboard-container">
      <h2>Newspaper Dashboard</h2>

      {isLoading ? (
        <div className="loading">Loading dashboard data...</div>
      ) : (
        <>
          <div className="dashboard-controls">
            <div className="form-group">
              <label>View Type:</label>
              <select value={dateType} onChange={handleDateTypeChange}>
                <option value="daily">Daily View</option>
                <option value="weekly">Weekly View</option>
              </select>
            </div>

            <div className="date-selector">
              {getDateOptions()}
            </div>
          </div>

          {renderStats()}

          {renderRecentUploads()}

          {renderEditionTabs()}
        </>
      )}
    </div>
  );
};

export default Dashboard;