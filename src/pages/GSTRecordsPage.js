import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; // Adjust the path to your firebase config
import { collection, getDocs, query, orderBy, where, doc, getDoc } from 'firebase/firestore';
import "../css/GSTRecordsPage.css"
import * as XLSX from 'xlsx';

const GSTRecordsPage = () => {
  const [gstRecords, setGstRecords] = useState([]);
  const [clientsData, setClientsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterClient, setFilterClient] = useState('');
  
  // Available filter options
  const [months, setMonths] = useState([]);
  const [years, setYears] = useState([]);
  const [clients, setClients] = useState([]);
  
  // Load GST records from Firebase on component mount
  useEffect(() => {
    const fetchGSTRecords = async () => {
      try {
        setLoading(true);
        const invoicesRef = collection(db, "invoices");
        const q = query(invoicesRef, orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);
        
        const records = [];
        querySnapshot.forEach((doc) => {
          records.push({ 
            id: doc.id,
            ...doc.data(),
            // Ensure date is a proper Date object for filtering
            date: doc.data().date ? new Date(doc.data().date) : new Date()
          });
        });
        
        setGstRecords(records);
        
        // Extract unique months, years, and clients for filters
        const uniqueMonths = [...new Set(records.map(record => {
          return record.date.getMonth();
        }))].sort();
        
        const uniqueYears = [...new Set(records.map(record => {
          return record.date.getFullYear();
        }))].sort();
        
        const uniqueClients = [...new Set(records.map(record => record.clientName))].sort();
        
        setMonths(uniqueMonths);
        setYears(uniqueYears);
        setClients(uniqueClients);
        
        // Fetch client data including overall GST
        const clientsInfo = {};
        for (const record of records) {
          if (record.clientId && !clientsInfo[record.clientName]) {
            try {
              const clientDocRef = doc(db, "clients", record.clientId);
              const clientDoc = await getDoc(clientDocRef);
              
              if (clientDoc.exists()) {
                clientsInfo[record.clientName] = {
                  id: record.clientId,
                  ...clientDoc.data()
                };
              }
            } catch (err) {
              console.error(`Error fetching client data for ${record.clientName}:`, err);
            }
          }
        }
        setClientsData(clientsInfo);
        
        // Set default filter to current month and year
        const currentDate = new Date();
        setFilterMonth(currentDate.getMonth().toString());
        setFilterYear(currentDate.getFullYear().toString());
        
      } catch (err) {
        console.error("Error fetching GST records:", err);
        setError("Failed to load GST records. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchGSTRecords();
  }, []);
  
  const handleDownloadInvoice = (pdfUrl, clientName, date) => {
    if (!pdfUrl) {
      alert("No invoice found!");
      return;
    }
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = `Invoice_${clientName}_${formatDate(date)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Apply filters to records
  const getFilteredRecords = () => {
    return gstRecords.filter(record => {
      const recordMonth = record.date.getMonth().toString();
      const recordYear = record.date.getFullYear().toString();
      
      // Apply filters (if set)
      const monthMatch = !filterMonth || recordMonth === filterMonth;
      const yearMatch = !filterYear || recordYear === filterYear;
      const clientMatch = !filterClient || record.clientName === filterClient;
      
      return monthMatch && yearMatch && clientMatch;
    });
  };
  
  // Get month name from month number
  const getMonthName = (monthNumber) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[parseInt(monthNumber)];
  };
  
  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    const d = new Date(date);
    return `${d.getDate()}-${getMonthName(d.getMonth()).substring(0, 3)}-${d.getFullYear()}`;
  };
  
  // Group records by client
  const getRecordsByClient = () => {
    const filteredRecords = getFilteredRecords();
    const groupedRecords = {};
    
    filteredRecords.forEach(record => {
      if (!groupedRecords[record.clientName]) {
        groupedRecords[record.clientName] = [];
      }
      groupedRecords[record.clientName].push(record);
    });
    
    return groupedRecords;
  };
  
  // Calculate summary data
  const getSummaryData = () => {
    const filteredRecords = getFilteredRecords();
    
    return {
      totalInvoices: filteredRecords.length,
      totalGST: filteredRecords.reduce((sum, record) => sum + (record.gstAmount || 0), 0),
      latestTotalGSTOverall: filteredRecords.length > 0 ? 
        Math.max(...filteredRecords.map(r => r.totalGstOverall || 0)) : 0
    };
  };
  
  // Get client's overall GST amount
  const getClientOverallGst = (clientName) => {
    if (clientsData[clientName] && clientsData[clientName].overallGst !== undefined) {
      return clientsData[clientName].overallGst;
    }
    return 0;
  };

  // Function to export a specific client's data to Excel
  const exportClientToExcel = (clientName, clientRecords) => {
    // Format the records for export
    const formattedRecords = clientRecords.map((record, index) => {
      return {
        "Sr No.": index + 1,
        "Date": formatDate(record.date),
        "Bill No.": record.invoiceId || record.id || "N/A",
        "Client GST Number": record.gstNumber || "N/A",
        "Adv Size": record.dimensions?.area?.toFixed(2) || "N/A",
        "Publication Charges": record.publicationCharges?.toFixed(2) || '0.00',
        "Color Charge": record.colorCharge?.toFixed(2) || '0.00',
        "GST Amount": record.gstAmount?.toFixed(2) || '0.00',
        "Final Price": record.finalPrice?.toFixed(2) || '0.00'
      };
    });
  
    // Calculate totals for this client
    const totalPublicationCharges = clientRecords.reduce((sum, record) =>
      sum + (record.publicationCharges || 0), 0);
    const totalColorCharge = clientRecords.reduce((sum, record) =>
      sum + (record.colorCharge || 0), 0);
    const totalGST = clientRecords.reduce((sum, record) =>
      sum + (record.gstAmount || 0), 0);
    const totalFinalPrice = clientRecords.reduce((sum, record) =>
      sum + (record.finalPrice || 0), 0);
  
    // Add totals row
    formattedRecords.push({
      "Sr No.": "",
      "Date": "",
      "Bill No.": "",
      "Client GST Number": "",
      "Adv Size": "TOTAL",
      "Publication Charges": totalPublicationCharges.toFixed(2),
      "Color Charge": totalColorCharge.toFixed(2),
      "GST Amount": totalGST.toFixed(2),
      "Final Price": totalFinalPrice.toFixed(2)
    });
  
    // Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(formattedRecords);
  
    // Set column widths for better readability
    const colWidths = [
      { wch: 8 },  // Sr No
      { wch: 12 }, // Date
      { wch: 12 }, // Bill No
      { wch: 20 }, // Client GST Number
      { wch: 12 }, // Adv Size
      { wch: 18 }, // Publication Charges
      { wch: 15 }, // Color Charge
      { wch: 15 }, // GST Amount
      { wch: 15 }  // Final Price
    ];
    worksheet['!cols'] = colWidths;
  
    const workbook = XLSX.utils.book_new();
  
    // FIX: sanitize and truncate sheet name
    let safeSheetName = clientName.replace(/[\[\]\*\/\\\:\?]/g, '');
    if (safeSheetName.length > 31) {
      safeSheetName = safeSheetName.substring(0, 31);
    }
    if (!safeSheetName) safeSheetName = 'Sheet1';
  
    XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
  
    // Generate filename with client name and current date
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${clientName}_GST_Records_${dateStr}.xlsx`;
  
    // Write file
    XLSX.writeFile(workbook, filename);
  };
  
  
  // Function to export all filtered records to Excel (existing function)
  const exportToExcel = () => {
    const filteredRecords = getFilteredRecords();
  
    // Map data for the Excel sheet with your required columns
    const formattedRecords = filteredRecords.map((record, index) => {
      return {
        "Sr No.": index + 1,
        "Date": formatDate(record.date),
        "Bill No.": record.invoiceId || record.id || "N/A",
        "Client Name": record.clientName,
        "Client GST Number": record.gstNumber || "N/A",
        "Adv Size": record.dimensions?.area?.toFixed(2) || "N/A",
        "Billing Amount": (record.publicationCharges + (record.colorCharge || 0)).toFixed(2) || '0.00',
        "GST Total": record.gstAmount?.toFixed(2) || '0.00',
        "Total": record.finalPrice?.toFixed(2) || '0.00'
      };
    });
  
    // Calculate totals
    const totalBillingAmount = filteredRecords.reduce((sum, record) => 
      sum + (record.publicationCharges || 0) + (record.colorCharge || 0), 0);
    const totalGST = filteredRecords.reduce((sum, record) => 
      sum + (record.gstAmount || 0), 0);
    const totalFinalPrice = filteredRecords.reduce((sum, record) => 
      sum + (record.finalPrice || 0), 0);
  
    // Add totals row
    formattedRecords.push({
      "Sr No.": "",
      "Date": "",
      "Bill No.": "",
      "Client Name": "TOTAL",
      "Client GST Number": "",
      "Adv Size": "",
      "Billing Amount": totalBillingAmount.toFixed(2),
      "GST Total": totalGST.toFixed(2),
      "Total": totalFinalPrice.toFixed(2)
    });
  
    // Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(formattedRecords);
    
    // Set column widths for better readability
    const colWidths = [
      { wch: 8 },  // Sr No
      { wch: 12 }, // Date
      { wch: 12 }, // Bill No
      { wch: 20 }, // Client Name
      { wch: 20 }, // Client GST Number
      { wch: 10 }, // Adv Size
      { wch: 15 }, // Billing Amount
      { wch: 15 }, // GST Total
      { wch: 15 }  // Total
    ];
    worksheet['!cols'] = colWidths;
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "GST Records");
  
    // Write file
    XLSX.writeFile(workbook, "GST_Records.xlsx");
  };
  
  if (loading) return <div className="loading">Loading GST records...</div>;
  if (error) return <div className="error-message">{error}</div>;
  
  const groupedRecords = getRecordsByClient();
  const summary = getSummaryData();
  
  return (
    <div className="gst-records-container">
      <h1>GST Records & Monthly Reports</h1>
      
      <div className="filters-container">
        <div className="filter-group">
          <label>Month:</label>
          <select 
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          >
            <option value="">All Months</option>
            {months.map(month => (
              <option key={month} value={month}>
                {getMonthName(month)}
              </option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label>Year:</label>
          <select 
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
          >
            <option value="">All Years</option>
            {years.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label>Client:</label>
          <select 
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
          >
            <option value="">All Clients</option>
            {clients.map(client => (
              <option key={client} value={client}>
                {client}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {Object.keys(groupedRecords).length === 0 ? (
        <div className="no-records">No records found for the selected filters.</div>
      ) : (
        <div className="records-section">
          {Object.keys(groupedRecords).map(clientName => {
            // Get the first record to extract client details (assuming all records for a client have the same client info)
            const clientRecords = groupedRecords[clientName];
            const firstRecord = clientRecords[0];
        
            return (
              <div key={clientName} className="client-records">
                <div className="client-header">
                  <h2 className="client-name">{clientName}</h2>
                  <div className="client-details">
                    <p><strong>Client GST Number:</strong> {firstRecord.gstNumber || "N/A"}</p>
                    <button 
                      className="client-export-btn" 
                      onClick={() => exportClientToExcel(clientName, clientRecords)}
                    >
                      Export {clientName} Data
                    </button>
                  </div>
                </div>
                
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Publication Charges</th>
                      <th>Color Charge</th>
                      <th>GST Amount</th>
                      <th>Final Price</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientRecords.map(record => (
                      <tr key={record.id}>
                        <td>{formatDate(record.date)}</td>
                        <td>₹{record.publicationCharges?.toFixed(2) || '0.00'}</td>
                        <td>₹{record.colorCharge?.toFixed(2) || '0.00'}</td>
                        <td>₹{record.gstAmount?.toFixed(2) || '0.00'}</td>
                        <td>₹{record.finalPrice?.toFixed(2) || '0.00'}</td>
                        <td>
                          <button className="btn-download" onClick={() => handleDownloadInvoice(record.pdfUrl, record.clientName, record.date)}>
                            Download Invoice
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  
                  <tfoot>
                    <tr>
                      <td colSpan="3" className="text-right"><strong>Client Subtotals:</strong></td>
                      <td>₹{clientRecords.reduce((sum, r) => sum + (r.gstAmount || 0), 0).toFixed(2)}</td>
                      <td>₹{clientRecords.reduce((sum, r) => sum + (r.finalPrice || 0), 0).toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })}
        </div>
      )}
      
      <div className="overall-gst-summary">
        {/* <h2>Total GST Paid by All Clients: ₹
          {Object.keys(groupedRecords)
            .reduce((totalGst, clientName) => totalGst + getClientOverallGst(clientName), 0)
            .toFixed(2)}
        </h2> */}
      </div>
      
      <div className="export-section">
        <button className="export-btn" onClick={exportToExcel}>Export All to Excel</button>
      </div>
    </div>
  );
};

export default GSTRecordsPage;