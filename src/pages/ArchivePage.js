import React, { useState, useEffect } from 'react';
import '../css/ArchivePage.css';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import * as XLSX from 'xlsx';

const ArchivePage = () => {
  const [newspapers, setNewspapers] = useState([]);
  const [filteredNewspapers, setFilteredNewspapers] = useState([]);
  const [searchDate, setSearchDate] = useState('');
  const [searchIssueNumber, setSearchIssueNumber] = useState('');
  const [searchEdition, setSearchEdition] = useState('');
  const [availableEditions, setAvailableEditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Sort function to arrange newspapers by date (newest first)
  const sortNewspapersByDate = (newspaperList) => {
    return [...newspaperList].sort((a, b) => {
      // Convert date strings to Date objects for proper comparison
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      // Sort in descending order (newest first)
      return dateB - dateA;
    });
  };
  
  // Fetch newspapers and unique editions from Firebase
  useEffect(() => {
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
          
          // Sort newspapers by date (newest first)
          const sortedNewspapers = sortNewspapersByDate(newspaperList);
          
          // Extract unique editions
          const uniqueEditions = [
            { value: '', label: 'All Editions' },
            ...Array.from(new Set(sortedNewspapers.map(paper => paper.edition)))
              .filter(edition => edition) // Remove empty strings
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
    
    fetchNewspapersAndEditions();
  }, []);
  
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
      
      // Apply all constraints
      const filtered = newspapers.filter(paper => 
        constraints.every(constraint => constraint(paper))
      );
      
      // Ensure filtered results are also sorted
      const sortedFiltered = sortNewspapersByDate(filtered);
      
      setFilteredNewspapers(sortedFiltered);
    } catch (err) {
      console.error("Error searching newspapers:", err);
      setError("Failed to search newspaper data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };
  
  // Handle download PDF
  const handleDownload = (pdfUrl) => {
    window.open(pdfUrl, '_blank');
  };
  
  // Handle export to Excel
  const handleExportToExcel = () => {
    // Prepare data for export
    const dataToExport = filteredNewspapers.map(newspaper => ({
      Title: newspaper.title,
      'Published Date': newspaper.date,
      Edition: newspaper.edition,
      'Issue Number': newspaper.issueNumber,
      'Remark': '' // Add empty Remark column for user input
    }));
    
    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Newspapers");
    
    // Generate Excel file and trigger download
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const fileData = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Create download link
    const fileUrl = URL.createObjectURL(fileData);
    const fileName = `newspaper_archive_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Create temporary link element and trigger download
    const downloadLink = document.createElement('a');
    downloadLink.href = fileUrl;
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    
    // Clean up
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(fileUrl);
  };
  
  if (error) {
    return <div className="error-message">{error}</div>;
  }
  
  return (
    <div className="archive-page">
      <h1>Newspaper Archive</h1>
      
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
                    <td>{newspaper.title}</td>
                    <td>{newspaper.date}</td>
                    <td>{newspaper.edition}</td>
                    <td>{newspaper.issueNumber}</td>
                    <td>
                      <button 
                        onClick={() => handleDownload(newspaper.pdfUrl)}
                        className="download-button"
                      >
                        Download
                      </button>
                    </td>
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

export default ArchivePage;