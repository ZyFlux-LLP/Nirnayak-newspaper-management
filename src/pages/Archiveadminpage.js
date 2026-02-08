import React, { useState, useEffect } from 'react';
import '../css/Archiveadminpage.css';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import * as XLSX from 'xlsx';

const ArchiveAdminPage = () => {
  const [newspapers, setNewspapers] = useState([]);
  const [filteredNewspapers, setFilteredNewspapers] = useState([]);
  const [searchDate, setSearchDate] = useState('');
  const [searchIssueNumber, setSearchIssueNumber] = useState('');
  const [searchEdition, setSearchEdition] = useState('');
  const [availableEditions, setAvailableEditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    date: '',
    edition: '',
    issueNumber: '',
    pdfUrl: ''
  });
  
  // Sort function to arrange newspapers by date (newest first)
  const sortNewspapersByDate = (newspaperList) => {
    return [...newspaperList].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB - dateA;
    });
  };
  
  // Fetch newspapers and unique editions from Firebase
  useEffect(() => {
    fetchNewspapersAndEditions();
  }, []);
  
  const fetchNewspapersAndEditions = async () => {
    try {
      setLoading(true);
      const newspaperCollection = collection(db, 'newspaper_data');
      const newspaperSnapshot = await getDocs(newspaperCollection);
      
      if (newspaperSnapshot.empty) {
        setNewspapers([]);
        setFilteredNewspapers([]);
        setAvailableEditions([]);
      } else {
        const newspaperList = newspaperSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        const sortedNewspapers = sortNewspapersByDate(newspaperList);
        
        const uniqueEditions = [
          { value: '', label: 'All Editions' },
          ...Array.from(new Set(sortedNewspapers.map(paper => paper.edition)))
            .filter(edition => edition)
            .map(edition => ({ value: edition, label: edition }))
        ];
        
        setNewspapers(sortedNewspapers);
        setFilteredNewspapers(sortedNewspapers);
        setAvailableEditions(uniqueEditions);
      }
    } catch (err) {
      console.error("Error fetching newspapers:", err);
      setError("Failed to load newspaper data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };
  
  // Handle search
  const handleSearch = async () => {
    try {
      setLoading(true);
      let constraints = [];
      
      if (searchDate) {
        constraints.push(doc => doc.date === searchDate);
      }
      
      if (searchIssueNumber) {
        constraints.push(doc => doc.issueNumber === searchIssueNumber);
      }
      
      if (searchEdition && searchEdition !== '') {
        constraints.push(doc => doc.edition === searchEdition);
      }
      
      const filtered = newspapers.filter(paper => 
        constraints.every(constraint => constraint(paper))
      );
      
      const sortedFiltered = sortNewspapersByDate(filtered);
      setFilteredNewspapers(sortedFiltered);
    } catch (err) {
      console.error("Error searching newspapers:", err);
      setError("Failed to search newspaper data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };
  
  // Handle delete
  const handleDelete = async (id, title) => {
    if (window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, 'newspaper_data', id));
        
        // Refresh the data
        await fetchNewspapersAndEditions();
        
        alert('Newspaper deleted successfully!');
      } catch (err) {
        console.error("Error deleting newspaper:", err);
        alert('Failed to delete newspaper. Please try again.');
      }
    }
  };
  
  // Handle edit - open edit mode
  const handleEditClick = (newspaper) => {
    setEditingId(newspaper.id);
    setEditFormData({
      title: newspaper.title,
      date: newspaper.date,
      edition: newspaper.edition,
      issueNumber: newspaper.issueNumber,
      pdfUrl: newspaper.pdfUrl
    });
  };
  
  // Handle edit - cancel
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({
      title: '',
      date: '',
      edition: '',
      issueNumber: '',
      pdfUrl: ''
    });
  };
  
  // Handle edit - save changes
  const handleSaveEdit = async (id) => {
    try {
      const newspaperRef = doc(db, 'newspaper_data', id);
      await updateDoc(newspaperRef, editFormData);
      
      // Refresh the data
      await fetchNewspapersAndEditions();
      
      setEditingId(null);
      setEditFormData({
        title: '',
        date: '',
        edition: '',
        issueNumber: '',
        pdfUrl: ''
      });
      
      alert('Newspaper updated successfully!');
    } catch (err) {
      console.error("Error updating newspaper:", err);
      alert('Failed to update newspaper. Please try again.');
    }
  };
  
  // Handle download PDF
  const handleDownload = (pdfUrl) => {
    window.open(pdfUrl, '_blank');
  };
  
  // Handle export to Excel
  const handleExportToExcel = () => {
    const dataToExport = filteredNewspapers.map(newspaper => ({
      Title: newspaper.title,
      'Published Date': newspaper.date,
      Edition: newspaper.edition,
      'Issue Number': newspaper.issueNumber,
      'Remark': ''
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Newspapers");
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const fileData = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const fileUrl = URL.createObjectURL(fileData);
    const fileName = `newspaper_archive_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    const downloadLink = document.createElement('a');
    downloadLink.href = fileUrl;
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(fileUrl);
  };
  
  if (error) {
    return <div className="error-message">{error}</div>;
  }
  
  return (
    <div className="archive-admin-page">
      <h1>Newspaper Archive - Admin</h1>
      
      <div className="search-container">
        <div className="search-field">
          <label>Date:</label>
          <input 
            type="date" 
            value={searchDate} 
            onChange={(e) => setSearchDate(e.target.value)} 
          />
        </div>
        
        <div className="search-field">
          <label>Edition:</label>
          <select 
            value={searchEdition} 
            onChange={(e) => setSearchEdition(e.target.value)}
          >
            {availableEditions.map((edition) => (
              <option key={edition.value} value={edition.value}>
                {edition.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="search-field">
          <label>Issue Number:</label>
          <input 
            type="text" 
            value={searchIssueNumber} 
            onChange={(e) => setSearchIssueNumber(e.target.value)} 
            placeholder="Enter issue number"
          />
        </div>
       
        <div className="button-group">
          <button onClick={handleSearch} className="search-button">Search</button>
        </div>
      </div>
      
      <div className="search-summary">
        {filteredNewspapers.length > 0 && (
          <p>Found {filteredNewspapers.length} newspaper(s)</p>
        )}
      </div>
      
      <div className="newspapers-container">
        {loading ? (
          <div className="loading">Loading newspaper data...</div>
        ) : filteredNewspapers.length > 0 ? (
          <>
            <table className="newspapers-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Published Date</th>
                  <th>Edition</th>
                  <th>Issue Number</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredNewspapers.map((newspaper) => (
                  <tr key={newspaper.id}>
                    {editingId === newspaper.id ? (
                      <>
                        <td>
                          <input
                            type="text"
                            value={editFormData.title}
                            onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                            className="edit-input"
                          />
                        </td>
                        <td>
                          <input
                            type="date"
                            value={editFormData.date}
                            onChange={(e) => setEditFormData({...editFormData, date: e.target.value})}
                            className="edit-input"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={editFormData.edition}
                            onChange={(e) => setEditFormData({...editFormData, edition: e.target.value})}
                            className="edit-input"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={editFormData.issueNumber}
                            onChange={(e) => setEditFormData({...editFormData, issueNumber: e.target.value})}
                            className="edit-input"
                          />
                        </td>
                        <td className="action-buttons">
                          <button 
                            onClick={() => handleSaveEdit(newspaper.id)}
                            className="save-button"
                          >
                            Save
                          </button>
                          <button 
                            onClick={handleCancelEdit}
                            className="cancel-button"
                          >
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{newspaper.title}</td>
                        <td>{newspaper.date}</td>
                        <td>{newspaper.edition}</td>
                        <td>{newspaper.issueNumber}</td>
                        <td className="action-buttons">
                          <button 
                            onClick={() => handleDownload(newspaper.pdfUrl)}
                            className="download-button"
                          >
                            Download
                          </button>
                          <button 
                            onClick={() => handleEditClick(newspaper)}
                            className="edit-button"
                            title="Edit"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button 
                            onClick={() => handleDelete(newspaper.id, newspaper.title)}
                            className="delete-button"
                            title="Delete"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="export-container">
              <button onClick={handleExportToExcel} className="export-excel-button">
                Export to Excel
              </button>
            </div>
          </>
        ) : (
          <div className="no-results">No newspapers found</div>
        )}
      </div>
    </div>
  );
};

export default ArchiveAdminPage;