import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import logo from '../../assets/Nirnayak Logo.png';

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { storage, firestore, auth } from '../../firebase';
import "../../css/invoice.css";

const NewspaperInvoiceGenerator = ({ client, adDetails }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const invoiceRef = useRef(null);
  const user = auth.currentUser;

  // Generate a unique invoice number
  const invoiceNumber = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Get dimensions from adDetails
  const dimensions = React.useMemo(() => {
    if (adDetails.adLength && adDetails.adBreadth) {
      const length = parseFloat(adDetails.adLength);
      const width = parseFloat(adDetails.adBreadth);
      const area = length * width;
      
      return {
        length: length,
        width: width,
        area: area,
        displayLength: Math.floor(length),
        displayWidth: Math.floor(width),
        displayArea: Math.floor(area)
      };
    } else if (adDetails.adSize) {
      const side = Math.sqrt(adDetails.adSize);
      return {
        length: Math.round(side),
        width: Math.round(side),
        area: adDetails.adSize,
        displayLength: Math.floor(Math.round(side)),
        displayWidth: Math.floor(Math.round(side)),
        displayArea: Math.floor(adDetails.adSize)
      };
    }
    return { 
      length: '-', 
      width: '-', 
      area: '-',
      displayLength: '-',
      displayWidth: '-',
      displayArea: '-'
    };
  }, [adDetails.adLength, adDetails.adBreadth, adDetails.adSize]);

  // Get city information from adDetails
  const cityInfo = React.useMemo(() => {
    if (adDetails.cityInfo) {
      return adDetails.cityInfo;
    }

    const city = adDetails.city || 'indore';

    const cityData = {
      indore: {
        address: 'MD - 56, Bajrang Nagar (71 - MG Duplex)',
        pincode: 'Indore - 452001',
        phone: '07344060666 / Mob.: 9424560111',
        email: 'nirnayak.news@gmail.com',
        dprCode: '0539'
      },
      ujjain: {
        address: '36, Bhoj Marg, Freeganj',
        pincode: 'Ujjain - 456010',
        phone: '07344060666 / Mob.: 9424560111',
        email: 'nirnayak.news@gmail.com',
        dprCode: '0910'
      }
    };

    return cityData[city];
  }, [adDetails.cityInfo, adDetails.city]);

  // Improved number to words conversion
  const convertToWords = (num) => {
    if (!num) return "Zero Rupees Only";
  
    const parts = num.toFixed(2).split('.');
    let rupees = parseInt(parts[0]);
    const paise = parseInt(parts[1]);
  
    const singleDigit = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
    const convertToWordsLessThanThousand = (n) => {
      if (n === 0) return '';
      else if (n < 10) return singleDigit[n];
      else if (n < 20) return teens[n - 10];
      else if (n < 100) {
        return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + singleDigit[n % 10] : '');
      } else {
        return singleDigit[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertToWordsLessThanThousand(n % 100) : '');
      }
    };
  
    let result = '';
  
    if (rupees >= 100000) {
      result += convertToWordsLessThanThousand(Math.floor(rupees / 100000)) + ' Lakh ';
      rupees %= 100000;
    }
  
    if (rupees >= 1000) {
      result += convertToWordsLessThanThousand(Math.floor(rupees / 1000)) + ' Thousand ';
      rupees %= 1000;
    }
  
    result += convertToWordsLessThanThousand(rupees);
  
    result = result.trim() + ' Rupees';
  
    if (paise > 0) {
      result += ' and ' + convertToWordsLessThanThousand(paise) + ' Paise';
    }
  
    return result + ' Only';
  };

  const handleGeneratePDF = async () => {
    try {
      setIsLoading(true);
      const element = invoiceRef.current;
  
      if (!element) {
        setSavedMessage('Invoice element not found');
        setTimeout(() => setSavedMessage(''), 3000);
        return;
      }
  
      const originalWidth = element.style.width;
      element.style.width = '800px';
  
      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true
      });
  
      element.style.width = originalWidth;
  
      const imgData = canvas.toDataURL('image/png');
  
      const pageWidth = 210;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
      const pdfDoc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [imgWidth, imgHeight],
      });
  
      pdfDoc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
  
      const fileName = `invoice_${adDetails.invoiceId || invoiceNumber}.pdf`;
  
      const pdfBlob = pdfDoc.output('blob');
  
      const storageRef = ref(storage, `invoices/${fileName}`);
      const snapshot = await uploadBytes(storageRef, pdfBlob);
      const pdfUrl = await getDownloadURL(snapshot.ref);
  
      const invoiceData = {
        invoiceId: adDetails.invoiceId,
        clientName: client.name,
        publicationCharges: adDetails.basePrice,
        clientType: client.type,
        gstNumber: client.gstNumber,
        date: adDetails.date,
        roNumber: adDetails.roNumber,
        roDate: adDetails.roDate,
        publicationDate: adDetails.publicationDate,
        pdfUrl: pdfUrl,
        basePrice: adDetails.basePrice,
        finalPrice: adDetails.finalPrice,
        gstAmount: adDetails.gstAmount,
        colorCharge: adDetails.colorCharge || 0,
        dimensions: {
          length: dimensions.length,
          width: dimensions.width,
          area: dimensions.area
        },
        city: adDetails.city || 'indore',
        cityInfo: cityInfo,
        uploadedBy: user.uid,
        createdAt: new Date()
      };
  
      await addDoc(collection(firestore, 'invoices'), invoiceData);
  
      setSavedMessage('Invoice PDF exported and saved to Firebase!');
      setTimeout(() => setSavedMessage(''), 3000);
  
      pdfDoc.save(fileName);
  
    } catch (error) {
      console.error("Error exporting PDF: ", error);
      setSavedMessage('Failed to export PDF');
      setTimeout(() => setSavedMessage(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="invoice-container">
      {savedMessage && (
        <div className="saved-message">
          {savedMessage}
        </div>
      )}

      <div ref={invoiceRef} className="invoice-preview">
        <div className="invoice-header">
          <div className="invoice-header-content">
            <div className="newspaper-logo">
              <img src={logo} alt="Dainik Nirnayak Logo" />
            </div>
            <div className="contact-info">
              <p>Ph.: {cityInfo.phone.split('/')[0].trim()}</p>
              <p>Mob.: {cityInfo.phone.split('/')[1].trim()}</p>
              <p>Email: {cityInfo.email}</p>
              <p>nirnayak.news@yahoo.com</p>
              {cityInfo.address}
            </div>
          </div>
        </div>

        <div className="address-section">
          <div className="office-addresses">
              <p><strong>GSTN No.:</strong> 23ABUPT9154H1ZZ</p>
              <p><strong>PAN No.:</strong> ABUPT9154H</p>
          </div>
          <div className="dpr-code-section">
            <div className="dpr-code">DPR CODE: {cityInfo.dprCode}</div>
          </div>
        </div>

        <div className="particulars-section">
          <div className="particulars-content">
            <div className="particulars-column">
              <p>Bill No:</p>
              <p>RO Number:</p>
              <p>Size:</p>
              <p>Name of the Department/Client:</p>
              <p>Date of Publication:</p>
              <p>RO Date:</p>
            </div>
            <div className="particulars-column">
              <p>{adDetails.invoiceId || '213'}</p>
              <p>{adDetails.roNumber || '-'}</p>
              <p>{dimensions.displayArea} cm²</p>
              <p>{client.name || '-'}</p>
              <p>{adDetails.publicationDate ? formatDate(adDetails.publicationDate) : '-'}</p>
              <p>{adDetails.roDate ? formatDate(adDetails.roDate) : '-'}</p>
            </div>
          </div>
          {adDetails.additionalInfo && (
            <div className="additional-info">
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Additional Information:</div>
              <div className="additional-info-content">
                {adDetails.additionalInfo}
              </div>
            </div>
          )}
        </div>

        <div className="invoice-table" style={{ marginTop: '15px', overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #000',
            minWidth: '650px'
          }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <th style={{ border: '1px solid #000', padding: '5px', width: '25%', borderBottom: 'none' }}>Particulars</th>
                <th style={{ border: '1px solid #000', padding: '5px', width: '5%' }}>S. No.</th>
                <th style={{ border: '1px solid #000', padding: '5px', width: '25%' }}>Particulars</th>
                <th style={{ border: '1px solid #000', padding: '5px', width: '10%' }}>Length (cm)</th>
                <th style={{ border: '1px solid #000', padding: '5px', width: '10%' }}>Width (cm)</th>
                <th style={{ border: '1px solid #000', padding: '5px', width: '10%' }}>Total (cm²)</th>
                <th style={{ border: '1px solid #000', padding: '5px', width: '10%' }}>Rate (cm²)</th>
                <th style={{ border: '1px solid #000', padding: '5px', width: '15%' }}>Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #000', padding: '5px', borderTop: '1px solid #000', borderBottom: 'none' }}>उपरोक्त आदेश के तहत विज्ञापन का प्रकाश</td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>1</td>
                <td style={{ border: '1px solid #000', padding: '5px' }}>Publication Charges</td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{dimensions.displayLength}</td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{dimensions.displayWidth}</td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{dimensions.displayArea}</td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>
                  {(parseFloat(adDetails.ratePerSqCm) || 0).toFixed(2)}
                </td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{adDetails.basePrice?.toFixed(2) || '-'}</td>
              </tr>

              {adDetails.colorCharge > 0 && (
                <tr>
                  <td style={{ border: '1px solid #000', padding: '5px', borderTop: 'none', borderBottom: 'none' }}>Our Bank Detail -</td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>2</td>
                  <td style={{ border: '1px solid #000', padding: '5px' }}>Color Charges (+40%)</td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }} colSpan="4"></td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{adDetails.colorCharge?.toFixed(2) || '0.00'}</td>
                </tr>
              )}

              <tr>
                <td style={{ border: '1px solid #000', padding: '5px', borderTop: adDetails.colorCharge > 0 ? 'none' : '1px solid #000', borderBottom: '1px solid #000' }}>
                  {adDetails.colorCharge > 0 ? 'Bank Name - Bank of India' : 'Our Bank Detail -'}
                </td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{adDetails.colorCharge > 0 ? '3' : '2'}</td>
                <td style={{ border: '1px solid #000', padding: '5px' }}>Total Charge</td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }} colSpan="4"></td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{(adDetails.basePrice + (adDetails.colorCharge || 0)).toFixed(2)}</td>
              </tr>

              {client.type === 'private' && adDetails.commission > 0 && (
                <tr>
                  <td style={{ border: '1px solid #000', padding: '5px', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                    {adDetails.colorCharge > 0 ? 'Branch Freeganj Ujjain' : 'Bank Name - Bank of India'}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{adDetails.colorCharge > 0 ? '4' : '3'}</td>
                  <td style={{ border: '1px solid #000', padding: '5px' }}>Less Discount (15%)</td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }} colSpan="4"></td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{adDetails.commission?.toFixed(2) || '0.00'}</td>
                </tr>
              )}

              {client.type === 'state' ? (
                <>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '5px', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                      {client.type === 'private' && adDetails.commission > 0 ? 
                        (adDetails.colorCharge > 0 ? 'Branch Freeganj Ujjain' : 'Bank Name - Bank of India') : 
                        (adDetails.colorCharge > 0 ? 'Branch Freeganj Ujjain' : 'Bank Name - Bank of India')}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>
                      {adDetails.colorCharge > 0 ?
                        (client.type === 'private' && adDetails.commission > 0 ? '5' : '4') :
                        (client.type === 'private' && adDetails.commission > 0 ? '4' : '3')}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '5px' }}>Add: CGST (2.5%)</td>
                    <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }} colSpan="4"></td>
                    <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{(adDetails.gstAmount / 2).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '5px', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                      {client.type === 'private' && adDetails.commission > 0 ?
                        (adDetails.colorCharge > 0 ? 'A/c No. : 910130110002710' : 'Branch Freeganj Ujjain') :
                        (adDetails.colorCharge > 0 ? 'A/c No. : 910130110002710' : 'Branch Freeganj Ujjain')}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>
                      {adDetails.colorCharge > 0 ?
                        (client.type === 'private' && adDetails.commission > 0 ? '6' : '5') :
                        (client.type === 'private' && adDetails.commission > 0 ? '5' : '4')}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '5px' }}>Add: SGST (2.5%)</td>
                    <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }} colSpan="4"></td>
                    <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{(adDetails.gstAmount / 2).toFixed(2)}</td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td style={{ border: '1px solid #000', padding: '5px', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                    {client.type === 'private' && adDetails.commission > 0 ?
                      (adDetails.colorCharge > 0 ? 'Branch Freeganj Ujjain' : 'Bank Name - Bank of India') :
                      (adDetails.colorCharge > 0 ? 'Branch Freeganj Ujjain' : 'Bank Name - Bank of India')}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>
                    {adDetails.colorCharge > 0 ?
                      (client.type === 'private' && adDetails.commission > 0 ? '5' : '4') :
                      (client.type === 'private' && adDetails.commission > 0 ? '4' : '3')}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '5px' }}>
                    Add: {client.type === 'central' ? 'IGST (5%)' : 'GST (5%)'}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }} colSpan="4"></td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{adDetails.gstAmount?.toFixed(2) || '0.00'}</td>
                </tr>
              )}

              <tr>
                <td style={{ border: '1px solid #000', padding: '5px', borderTop: 'none', borderBottom: 'none' }}>
                  {client.type === 'state' ? 
                    (client.type === 'private' && adDetails.commission > 0 ?
                      (adDetails.colorCharge > 0 ? 'IFSC - BKID0009101' : 'A/c No. : 910130110002710') :
                      (adDetails.colorCharge > 0 ? 'IFSC - BKID0009101' : 'A/c No. : 910130110002710')) :
                    (client.type === 'private' && adDetails.commission > 0 ?
                      (adDetails.colorCharge > 0 ? 'A/c No. : 910130110002710' : 'Branch Freeganj Ujjain') :
                      (adDetails.colorCharge > 0 ? 'A/c No. : 910130110002710' : 'Branch Freeganj Ujjain'))}
                </td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }} colSpan="6">
                  <strong>Grand Total</strong>
                </td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right', fontWeight: 'bold' }}>
                  {adDetails.finalPrice?.toFixed(2) || '0.00'}
                </td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '5px', borderTop: 'none' }}>
                  {client.type === 'state' ?
                    (client.type === 'private' && adDetails.commission > 0 ? 
                      (adDetails.colorCharge > 0 ? '' : 'IFSC - BKID0009101') : 
                      '') :
                    (client.type === 'private' && adDetails.commission > 0 ? 
                      'IFSC - BKID0009101' : 
                      'IFSC - BKID0009101')}
                </td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'left', fontStyle: 'italic' }} colSpan="6">
                  Total in Rupees:
                </td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right', fontStyle: 'italic' }}>
                  {convertToWords(adDetails.finalPrice || 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="invoice-notes">
          <p>नोट :</p>
          <p>1) बिल का भुगतान अकाउंट पे चैक या ड्राफ्ट द्वारा स्वीकार किया जायेगा।</p>
          <p>2) कृपया चैक निर्णायक (Nirnayak) नाम से बनावे।</p>
        </div>
      </div>

      <div className="invoice-actions">
        <button
          onClick={handleGeneratePDF}
          disabled={isLoading}
          className="invoice-download-btn"
        >
          {isLoading ? 'Generating PDF...' : 'Download Invoice PDF'}
        </button>
      </div>
    </div>
  );
};

export default NewspaperInvoiceGenerator;