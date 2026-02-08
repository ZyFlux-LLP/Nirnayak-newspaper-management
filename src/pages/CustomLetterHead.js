import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase'; // Adjust the path to your firebase config
import logo from '../../src/assets/Nirnayak Logo.png';  // Adjust path based on location

// हिंदी फॉन्ट के लिए CSS import करें
// Import CSS for Hindi font support
import "../css/CustomLetterHead.css";

const HindiLetterhead = () => {
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentContent, setDocumentContent] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [senderName, setSenderName] = useState('');
  const [office, setOffice] = useState('ujjain'); // उज्जैन या इंदौर
  const [isLoading, setIsLoading] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const letterheadRef = useRef(null);
  const calendarRef = useRef(null);
  const [dateDisplayValue, setDateDisplayValue] = useState(formatDate(new Date()));

  const offices = {
    ujjain: {
      title: 'उज्जैन',
      address: 'प्रधान कार्यालय : 36, भोज मार्ग फ्रीगंज उज्जैन 456010 (म.प्र.)',
      phone: 'Mob. 9424560111 - 9424560786',
      landline: '0734-2515420, 0734-4060666',
      email: 'nirnayak.news@gmail.com,',
      email2: 'nirnayak_news@yahoo.co.in',
      dprCode: 'DPR Code - 0910 (Ujjain)'
    },
    indore: {
      title: 'इंदौर',
      address: `मुद्रित एम.डी. - 56 बजरंगनगर (71 एम.जी. डुप्लेक्स) इंदौर 4520001 म.प्र.\nMob. 9424560111\nRNI No.-MPHIN/2013/50289`,
      phone: 'Mob. 9826235467 - 9826235467',
      landline: '0731-2345678, 0731-4056789',
      email: 'nirnayak.news@gmail.com, nirnayak_news@yahoo.co.in',
      dprCode: 'DPR Code - 0539 (Indore)'
    }
  };
  

  // चयनित दिनांक को भारतीय प्रारूप में प्रदर्शित करें
  function formatDate(date) {
    return date.toLocaleDateString('hi-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  // कैलेंडर वर्ष और महीना हैंडलर
  const [calendarYear, setCalendarYear] = useState(selectedDate.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(selectedDate.getMonth());
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  
  // साल की रेंज बनाएं (वर्तमान से 5 साल पहले तक और 5 साल आगे तक)
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 20; i <= currentYear + 20; i++) {
      years.push(i);
    }
    return years;
  };
  
  const yearOptions = generateYearOptions();

  // महीने का नाम प्राप्त करें
  const getMonthName = (month) => {
    const monthNames = ["जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून", 
                        "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"];
    return monthNames[month];
  };

  // पिछले महीने का हैंडलर
  const handlePrevMonth = () => {
    setCalendarMonth(prev => {
      if (prev === 0) {
        setCalendarYear(year => year - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  // अगले महीने का हैंडलर
  const handleNextMonth = () => {
    setCalendarMonth(prev => {
      if (prev === 11) {
        setCalendarYear(year => year + 1);
        return 0;
      }
      return prev + 1;
    });
  };
  
  // वर्ष चयन हैंडलर
  const handleYearSelect = (year) => {
    setCalendarYear(year);
    setShowYearDropdown(false);
  };

  // महीने के सभी दिन प्राप्त करें
  const getDaysInMonth = (year, month) => {
    // महीने में दिनों की संख्या
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // इस महीने का पहला दिन कौन सा वार है
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    const days = [];
    
    // पिछले महीने के दिन जोड़ें
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({
        date: new Date(year, month, -firstDayOfMonth + i + 1),
        isCurrentMonth: false
      });
    }
    
    // इस महीने के दिन जोड़ें
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    // अगले महीने के दिन जोड़ें (कैलेंडर को पूरा करने के लिए)
    const totalDaysDisplayed = Math.ceil(days.length / 7) * 7;
    const remainingDaysToAdd = totalDaysDisplayed - days.length;
    
    for (let i = 1; i <= remainingDaysToAdd; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  // दिन चुनने का हैंडलर
  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setDateDisplayValue(formatDate(date)); // Set the display value for the input
    setShowCalendar(false);
  };

  // क्लिक हैंडलर - कैलेंडर के बाहर क्लिक करने पर कैलेंडर बंद करें
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target) && 
          !event.target.classList.contains('date-selector-button')) {
        setShowCalendar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // दस्तावेज़ को PDF के रूप में निर्यात करें - MOBILE & DESKTOP COMPATIBLE VERSION
  const exportToPDF = async () => {
    if (!documentTitle.trim() || !documentContent.trim()) {
      setSavedMessage('कृपया शीर्षक और सामग्री दर्ज करें');
      setTimeout(() => setSavedMessage(''), 3000);
      return;
    }

    try {
      setIsLoading(true);
      
      // Create a completely isolated container for PDF rendering
      const printContainer = document.createElement('div');
      printContainer.style.cssText = `
        position: absolute;
        left: -99999px;
        top: 0;
        width: 794px;
        background: white;
        font-family: 'Noto Sans Devanagari', Arial, sans-serif;
      `;
      document.body.appendChild(printContainer);
      
      // Clone the letterhead for PDF generation
      const clonedElement = letterheadRef.current.cloneNode(true);
      printContainer.appendChild(clonedElement);
      
      // Remove any responsive classes that might interfere
      clonedElement.classList.remove('responsive-letterhead');
      
      // Force desktop A4 layout - CRITICAL for mobile compatibility
      clonedElement.style.cssText = `
        width: 794px !important;
        min-width: 794px !important;
        max-width: 794px !important;
        margin: 0 !important;
        padding: 60px 50px !important;
        box-sizing: border-box !important;
        background: white !important;
        font-size: 14px !important;
        line-height: 1.6 !important;
        color: #000 !important;
        overflow: visible !important;
      `;
      
      // Fix header layout - CRITICAL for mobile
      const headerTop = clonedElement.querySelector('.letterhead-top');
      if (headerTop) {
        headerTop.style.cssText = `
          display: flex !important;
          flex-direction: row !important;
          justify-content: space-between !important;
          align-items: flex-start !important;
          width: 100% !important;
          flex-wrap: nowrap !important;
          gap: 20px !important;
        `;
      }
      
      // Fix left section (logo + tagline)
      const headerLeft = clonedElement.querySelector('.letterhead-left');
      if (headerLeft) {
        headerLeft.style.cssText = `
          flex: 0 0 48% !important;
          max-width: 48% !important;
          width: 48% !important;
          display: block !important;
        `;
      }
      
      // Fix tagline
      const letterheadTagline = clonedElement.querySelector('.letterhead-tagline');
      if (letterheadTagline) {
        letterheadTagline.style.cssText = `
          width: 100% !important;
          font-size: 10px !important;
          line-height: 1.3 !important;
          margin-bottom: 10px !important;
        `;
        
        // Fix tagline paragraphs
        const taglinePs = letterheadTagline.querySelectorAll('p');
        taglinePs.forEach(p => {
          p.style.cssText = `
            margin: 0 0 3px 0 !important;
            padding: 0 !important;
            font-size: 10px !important;
            line-height: 1.3 !important;
          `;
        });
      }
      
      // Fix logo
      const letterheadLogo = clonedElement.querySelector('.letterhead-logo');
      if (letterheadLogo) {
        letterheadLogo.style.cssText = `
          width: 100% !important;
          max-width: 100% !important;
          text-align: left !important;
        `;
        
        const logoImg = letterheadLogo.querySelector('img');
        if (logoImg) {
          logoImg.style.cssText = `
            width: auto !important;
            max-width: 85% !important;
            height: auto !important;
            display: block !important;
          `;
        }
      }
      
      // Fix address section
      const headerAddress = clonedElement.querySelector('.letterhead-address');
      if (headerAddress) {
        headerAddress.style.cssText = `
          flex: 0 0 48% !important;
          max-width: 48% !important;
          width: 48% !important;
          text-align: right !important;
          font-size: 10px !important;
          line-height: 1.3 !important;
        `;
        
        const addressPs = headerAddress.querySelectorAll('p');
        addressPs.forEach(p => {
          p.style.cssText = `
            margin: 0 0 3px 0 !important;
            padding: 0 !important;
            font-size: 10px !important;
            line-height: 1.3 !important;
            text-align: right !important;
          `;
        });
      }
      
      // Fix divider
      const divider = clonedElement.querySelector('.letterhead-divider');
      if (divider) {
        divider.style.cssText = `
          width: 100% !important;
          height: 2px !important;
          background: #000 !important;
          margin: 15px 0 !important;
        `;
      }
      
      // Fix content area
      const contentArea = clonedElement.querySelector('.letterhead-content');
      if (contentArea) {
        contentArea.style.cssText = `
          font-size: 14px !important;
          line-height: 1.6 !important;
          width: 100% !important;
        `;
      }
      
      // Fix content header (receiver + date)
      const contentHeader = clonedElement.querySelector('.content-header');
      if (contentHeader) {
        contentHeader.style.cssText = `
          display: flex !important;
          justify-content: space-between !important;
          align-items: flex-start !important;
          margin-bottom: 20px !important;
        `;
      }
      
      // Fix receiver address
      const receiverAddress = clonedElement.querySelector('.receiver-address');
      if (receiverAddress) {
        receiverAddress.style.cssText = `
          flex: 1 !important;
          font-size: 14px !important;
        `;
      }
      
      // Fix date
      const dateEl = clonedElement.querySelector('.date');
      if (dateEl) {
        dateEl.style.cssText = `
          text-align: right !important;
          font-size: 14px !important;
        `;
      }
      
      // Fix subject line
      const subjectLine = clonedElement.querySelector('.subject-line');
      if (subjectLine) {
        subjectLine.style.cssText = `
          font-size: 14px !important;
          font-weight: bold !important;
          margin: 15px 0 !important;
          word-wrap: break-word !important;
        `;
      }
      
      // Fix all paragraphs
      const allParagraphs = clonedElement.querySelectorAll('p');
      allParagraphs.forEach(p => {
        if (!p.closest('.letterhead-address') && !p.closest('.letterhead-tagline')) {
          p.style.cssText = `
            font-size: 14px !important;
            line-height: 1.6 !important;
            margin: 8px 0 !important;
            padding: 0 !important;
          `;
        }
      });
      
      // Fix signature section
      const signatureSection = clonedElement.querySelector('.signature-section');
      if (signatureSection) {
        signatureSection.style.cssText = `
          margin-top: 40px !important;
          text-align: left !important;
        `;
      }
      
      const signatureName = clonedElement.querySelector('.signature-name');
      if (signatureName) {
        signatureName.style.cssText = `
          font-size: 14px !important;
          margin-top: 5px !important;
        `;
      }
      
      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create canvas with fixed dimensions
      const canvas = await html2canvas(clonedElement, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: 794,
        windowWidth: 794,
        backgroundColor: '#ffffff'
      });
      
      // Clean up
      document.body.removeChild(printContainer);
      
      // Convert to image
      const imgData = canvas.toDataURL('image/png', 1.0);
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [794, 1123]
      });
      
      const imgWidth = 794;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
      
      // Save PDF
      pdf.save(`Letter-${formatDate(selectedDate).replace(/\s/g, '-')}.pdf`);
      
      setSavedMessage('PDF सफलतापूर्वक निर्यात किया गया!');
      setTimeout(() => setSavedMessage(''), 3000);
    } catch (error) {
      console.error("PDF निर्यात में त्रुटि: ", error);
      setSavedMessage('PDF निर्यात करने में विफल');
      setTimeout(() => setSavedMessage(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Format the document content with proper line breaks for display
  const formatContentForDisplay = () => {
    if (!documentContent) return '';
    return documentContent.split('\n').map((paragraph, index) => (
      <p key={index} className="content-paragraph">{paragraph}</p>
    ));
  };

  // Format the subject with proper word wrapping
  const formatSubject = () => {
    if (!documentTitle) return '[विषय]';
    return documentTitle;
  };

  return (
    <div className="letterhead-notepad-container">
      <h1>Custom Letterhead Notepad</h1>

      <div className="letterhead-controls">
        <div className="control-group">
          <label htmlFor="documentTitle">विषय / दस्तावेज़ शीर्षक:</label>
          <input
            type="text"
            id="documentTitle"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            placeholder="विषय दर्ज करें"
          />
        </div>

        <div className="control-group">
          <label htmlFor="receiverName">प्रति (प्राप्तकर्ता का नाम):</label>
          <textarea
            id="receiverName"
            value={receiverName}
            onChange={(e) => setReceiverName(e.target.value)}
            placeholder="प्राप्तकर्ता का नाम दर्ज करें"
            rows={3}
            className="receiver-textarea"
          />
        </div>

        <div className="control-group">
          <label htmlFor="senderName">हस्ताक्षरकर्ता का नाम:</label>
          <textarea
            id="senderName"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="अपना नाम दर्ज करें"
            rows={3}
            className="receiver-textarea1"
          />
        </div>

        <div className="control-group">
          <label htmlFor="office">कार्यालय स्थान:</label>
          <select
            id="office"
            value={office}
            onChange={(e) => setOffice(e.target.value)}
          >
            <option value="ujjain">उज्जैन कार्यालय</option>
            <option value="indore">इंदौर कार्यालय</option>
          </select>
        </div>

        {/* दिनांक चयन नियंत्रण */}
        <div className="control-group date-selector">
          <label>दिनांक चुनें:</label>
          <div className="date-selector-container">
            {/* मैन्युअल इनपुट फील्ड - Read-only and shows the selected date */}
            <div className="date-input-wrapper">
              <input
                type="text"
                className="date-input-field"
                value={dateDisplayValue}
                readOnly={true}
                placeholder="कैलेंडर से दिनांक चुनें"
              />
              <button 
                type="button" 
                className="date-selector-button"
                onClick={() => setShowCalendar(!showCalendar)}
              >
                📅
              </button>
            </div>

            {showCalendar && (
              <div className="calendar-dropdown" ref={calendarRef}>
                <div className="calendar-header">
                  <button type="button" onClick={handlePrevMonth}>&lt;</button>
                  
                  <div className="month-year">
                    {getMonthName(calendarMonth)}
                    
                    {/* वर्ष का ड्रॉपडाउन */}
                    <div className="year-dropdown-container">
                      <button 
                        type="button"
                        className="year-selector-button"
                        onClick={() => setShowYearDropdown(!showYearDropdown)}
                      >
                        {calendarYear} ▼
                      </button>
                      
                      {showYearDropdown && (
                        <div className="year-dropdown">
                          {yearOptions.map(year => (
                            <div 
                              key={year} 
                              className={`year-option ${calendarYear === year ? 'selected' : ''}`}
                              onClick={() => handleYearSelect(year)}
                            >
                              {year}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button type="button" onClick={handleNextMonth}>&gt;</button>
                </div>
                
                <div className="calendar-grid">
                  {/* दिन के नाम */}
                  {['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'].map(day => (
                    <div key={day} className="calendar-day-name">{day}</div>
                  ))}
                  
                  {/* कैलेंडर के दिन */}
                  {getDaysInMonth(calendarYear, calendarMonth).map((dayInfo, index) => {
                    const { date, isCurrentMonth } = dayInfo;
                    const isSelected = 
                      date.getDate() === selectedDate.getDate() && 
                      date.getMonth() === selectedDate.getMonth() && 
                      date.getFullYear() === selectedDate.getFullYear();
                    
                    const isToday = 
                      date.getDate() === new Date().getDate() && 
                      date.getMonth() === new Date().getMonth() && 
                      date.getFullYear() === new Date().getFullYear();
                    
                    return (
                      <div 
                        key={index}
                        className={`calendar-day ${isCurrentMonth ? '' : 'other-month'} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                        onClick={() => handleDateSelect(date)}
                      >
                        {date.getDate()}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Keep the textarea for editing, but outside the preview area */}
      <div className="letterhead-editor">
        <label htmlFor="documentContent">पत्र सामग्री:</label>
        <textarea
          id="documentContent"
          value={documentContent}
          onChange={(e) => setDocumentContent(e.target.value)}
          placeholder="अपनी दस्तावेज़ सामग्री यहां दर्ज करें..."
          rows="10"
        />
      </div>
      
      <div className="letterhead-preview-container">
        {/* This is the visible preview area that will be converted to PDF */}
        <div className="letterhead-preview responsive-letterhead" ref={letterheadRef}>
          <div className="letterhead-header">
            <div className="letterhead-top">
              <div className="letterhead-left">
                <div className="letterhead-tagline">
                  <p>उज्जैन एवं इंदौर से एक साथ प्रकाशित</p>
                  <p>भारत सरकार एवं मध्यप्रदेश शासन से विज्ञापन के प्रकाशन हेतु मान्यता प्राप्त</p>
                </div>
                <div className="letterhead-logo">
                  <img src={logo} alt="Dainik Nirnayak Logo" />
                </div>
              </div>
              <div className="letterhead-address">
                <p>{offices[office].address}</p>
                <p>{offices[office].phone}</p>
                <p>{offices[office].landline}</p>
                <p>E-mail: {offices[office].email}</p>
                <p>{offices[office].email2}</p>
                <p>{offices[office].dprCode}</p>
              </div>
            </div>

            <div className="letterhead-divider"></div>
          </div>
          <div className="letterhead-content">
            <div className="content-header">
              <div className="reference">
                <div className="receiver-address">
                  <p>प्रति,</p>
                  {(receiverName || '[प्राप्तकर्ता का नाम]')
                    .split('\n')
                    .map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                </div>
              </div>

              <div className="date">
                <p>दिनांक: {formatDate(selectedDate)}</p>
              </div>
            </div>

            {/* Improved subject line with proper word wrapping */}
            <div className="subject-line">
              <span className="subject-label">विषय:- </span>
              <span className="subject-content">{formatSubject()}</span>
            </div>

            <br />
            <br />

            <p>मानिनीय महोदय,</p>

            {/* Replace textarea with formatted paragraphs for the PDF preview */}
            <div className="document-content-preview">
              {formatContentForDisplay()}
            </div>

            {/* Updated signature section with reduced gap */}
            <div className="signature-section">
              <p className="signature-label">भवदीय</p>
              <div className="signature-name"
                dangerouslySetInnerHTML={{
                  __html: (senderName || '[आपका नाम]').replace(/\n/g, '<br />')
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="letterhead-actions">
        <button
          className="export-btn"
          onClick={exportToPDF}
          disabled={isLoading}
        >
          {isLoading ? 'Exporting...' : 'Export To PDF'}
        </button>
      </div>


      {savedMessage && <div className="saved-message">{savedMessage}</div>}

      {/* Add CSS for the calendar */}
      <style jsx>{`
        .date-selector-container {
          position: relative;
        }
        
        .date-input-wrapper {
          display: flex;
          width: 100%;
        }
        
        .date-input-field {
          flex-grow: 1;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px 0 0 4px;
          font-size: 14px;
          background-color: #f9f9f9;
          cursor: default;
        }
        
        .date-selector-button {
          padding: 8px 12px;
          background-color: #f8f8f8;
          border: 1px solid #ddd;
          border-left: none;
          border-radius: 0 4px 4px 0;
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 14px;
        }
        
        .calendar-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 4px;
          background-color: white;
          border: 1px solid #ccc;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          z-index: 1000;
          padding: 12px;
          width: 320px;
        }
        
        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        
        .calendar-header button {
          background: none;
          border: none;
          font-size: 16px;
          cursor: pointer;
          padding: 0 10px;
        }
        
        .month-year {
          font-weight: bold;
          font-size: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .year-dropdown-container {
          position: relative;
          display: inline-block;
        }
        
        .year-selector-button {
          background: none;
          border: none;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
        }
        
        .year-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          background-color: white;
          border: 1px solid #ccc;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          max-height: 200px;
          overflow-y: auto;
          z-index: 1010;
          width: 80px;
        }
        
        .year-option {
          padding: 5px 10px;
          cursor: pointer;
          text-align: center;
        }
        
        .year-option:hover {
          background-color: #f0f0f0;
        }
        
        .year-option.selected {
          background-color: #e6f2ff;
          font-weight: bold;
        }
        
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
        }
        
        .calendar-day-name {
          text-align: center;
          font-weight: bold;
          padding: 6px 0;
          font-size: 12px;
        }
        
        .calendar-day {
          text-align: center;
          padding: 8px 0;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .calendar-day:hover {
          background-color: #f0f0f0;
        }
        
        .calendar-day.other-month {
          color: #aaa;
        }
        
        .calendar-day.selected {
          background-color: #4a90e2;
          color: white;
        }
        
        .calendar-day.today {
          border: 1px solid #4a90e2;
        }
      `}</style>
    </div>
  );
};

export default HindiLetterhead;