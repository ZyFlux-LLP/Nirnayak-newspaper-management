import React from 'react';

const GSTReport = ({ records, month, year }) => {
  // Calculate summary statistics
  const calculateSummary = () => {
    if (!records.length) return null;
    
    // Initialize variables for accumulation
    let totalTaxableAmount = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;
    let totalGST = 0;
    let totalAmount = 0;
    
    // Group records by client type for detailed breakdown
    const clientTypes = {
      central: { count: 0, taxable: 0, gst: 0, total: 0 },
      state: { count: 0, taxable: 0, gst: 0, total: 0 },
      private: { count: 0, taxable: 0, gst: 0, total: 0 }
    };
    
    // Process each record
    records.forEach(record => {
      // Add to overall totals
      totalTaxableAmount += record.taxableAmount || 0;
      
      // Process GST based on client type
      if (record.adType === 'central') {
        // Central government - IGST only
        const igst = record.gstAmount || 0;
        totalIGST += igst;
        
        // Update client type summary
        clientTypes.central.count++;
        clientTypes.central.taxable += record.taxableAmount || 0;
        clientTypes.central.gst += igst;
        clientTypes.central.total += record.finalAmount || 0;
      } 
      else if (record.adType === 'state') {
        // State government - CGST & SGST
        const halfGST = (record.gstAmount || 0) / 2;
        totalCGST += halfGST;
        totalSGST += halfGST;
        
        // Update client type summary
        clientTypes.state.count++;
        clientTypes.state.taxable += record.taxableAmount || 0;
        clientTypes.state.gst += record.gstAmount || 0;
        clientTypes.state.total += record.finalAmount || 0;
      } 
      else {
        // Private - CGST & SGST
        const halfGST = (record.gstAmount || 0) / 2;
        totalCGST += halfGST;
        totalSGST += halfGST;
        
        // Update client type summary
        clientTypes.private.count++;
        clientTypes.private.taxable += record.taxableAmount || 0;
        clientTypes.private.gst += record.gstAmount || 0;
        clientTypes.private.total += record.finalAmount || 0;
      }
      
      // Add to total GST and amount
      totalGST += record.gstAmount || 0;
      totalAmount += record.finalAmount || 0;
    });
    
    return {
      recordCount: records.length,
      totalTaxableAmount,
      totalCGST,
      totalSGST,
      totalIGST,
      totalGST,
      totalAmount,
      clientTypes
    };
  };
  
  const summary = calculateSummary();
  
  // Format currency value
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(value);
  };
  
  // Handle export to Excel/CSV
  const handleExport = () => {
    // For a real implementation, you would use a library like xlsx or csv-export
    alert('Export functionality would be implemented here using xlsx or similar library.');
  };
  
  return (
    <div className="gst-report">
      <div className="report-header">
        <h2>
          {month && year ? `GST Report: ${month} ${year}` : 
           month ? `GST Report: ${month}` :
           year ? `GST Report: ${year}` : 'GST Report: All Records'}
        </h2>
        <button onClick={handleExport} className="export-btn">
          Export to Excel
        </button>
      </div>
      
      {summary ? (
        <>
          <div className="summary-cards">
            <div className="summary-card">
              <h3>Records</h3>
              <p className="summary-value">{summary.recordCount}</p>
            </div>
            <div className="summary-card">
              <h3>Total Taxable Amount</h3>
              <p className="summary-value">{formatCurrency(summary.totalTaxableAmount)}</p>
            </div>
            <div className="summary-card">
              <h3>Total GST</h3>
              <p className="summary-value">{formatCurrency(summary.totalGST)}</p>
            </div>
            <div className="summary-card">
              <h3>Total Amount</h3>
              <p className="summary-value">{formatCurrency(summary.totalAmount)}</p>
            </div>
          </div>
          
          <div className="gst-breakdown">
            <h3>GST Breakdown</h3>
            <div className="gst-cards">
              <div className="gst-card">
                <h4>CGST</h4>
                <p className="gst-value">{formatCurrency(summary.totalCGST)}</p>
              </div>
              <div className="gst-card">
                <h4>SGST</h4>
                <p className="gst-value">{formatCurrency(summary.totalSGST)}</p>
              </div>
              <div className="gst-card">
                <h4>IGST</h4>
                <p className="gst-value">{formatCurrency(summary.totalIGST)}</p>
              </div>
            </div>
          </div>
          
          <div className="client-type-summary">
            <h3>Client Type Breakdown</h3>
            <table className="client-type-table">
              <thead>
                <tr>
                  <th>Client Type</th>
                  <th>Invoices</th>
                  <th>Taxable Amount</th>
                  <th>GST</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Central Government</td>
                  <td>{summary.clientTypes.central.count}</td>
                  <td>{formatCurrency(summary.clientTypes.central.taxable)}</td>
                  <td>{formatCurrency(summary.clientTypes.central.gst)}</td>
                  <td>{formatCurrency(summary.clientTypes.central.total)}</td>
                </tr>
                <tr>
                  <td>State Government</td>
                  <td>{summary.clientTypes.state.count}</td>
                  <td>{formatCurrency(summary.clientTypes.state.taxable)}</td>
                  <td>{formatCurrency(summary.clientTypes.state.gst)}</td>
                  <td>{formatCurrency(summary.clientTypes.state.total)}</td>
                </tr>
                <tr>
                  <td>Private Companies</td>
                  <td>{summary.clientTypes.private.count}</td>
                  <td>{formatCurrency(summary.clientTypes.private.taxable)}</td>
                  <td>{formatCurrency(summary.clientTypes.private.gst)}</td>
                  <td>{formatCurrency(summary.clientTypes.private.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="no-records">
          <p>No GST records found for the selected filters.</p>
        </div>
      )}
      
      <div className="records-table-container">
        <h3>Invoice Records</h3>
        {records.length > 0 ? (
          <table className="records-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Client</th>
                <th>Client Type</th>
                <th>Taxable Amount</th>
                <th>GST</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {records.map(record => (
                <tr key={record.invoiceNumber}>
                  <td>{record.invoiceNumber}</td>
                  <td>{new Date(record.date).toLocaleDateString('en-IN')}</td>
                  <td>{record.clientName}</td>
                  <td>
                    {record.adType === 'central' ? 'Central Government' : 
                     record.adType === 'state' ? 'State Government' : 'Private'}
                  </td>
                  <td>{formatCurrency(record.taxableAmount)}</td>
                  <td>{formatCurrency(record.gstAmount)}</td>
                  <td>{formatCurrency(record.finalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No records to display.</p>
        )}
      </div>
    </div>
  );
};

export default GSTReport;