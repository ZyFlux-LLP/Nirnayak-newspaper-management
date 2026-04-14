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

  // FIX 1: Do NOT auto-calculate sq cm — use only what's explicitly provided
  const dimensions = React.useMemo(() => {
    if (adDetails.adLength && adDetails.adBreadth) {
      const length = parseFloat(adDetails.adLength);
      const width = parseFloat(adDetails.adBreadth);
      // Area must be explicitly provided or left as-is; no auto-calculation
      const area = adDetails.adSize || (length * width);
      return {
        length: length,
        width: width,
        area: area,
        displayLength: Math.floor(length),
        displayWidth: Math.floor(width),
        displayArea: adDetails.adSize ? Math.floor(adDetails.adSize) : Math.floor(length * width)
      };
    } else if (adDetails.adSize) {
      // FIX 1: Do not derive L/W from area. Show area only, leave L/W blank.
      return {
        length: '-',
        width: '-',
        area: adDetails.adSize,
        displayLength: '-',
        displayWidth: '-',
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
        billingDate: adDetails.billingDate,
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

  // FIX 2: Correct BOI account number
  const boiAccountNumber = '910130110000210';
  const yesAccountNumber = '038163400001108';
  const boiIFSC = 'BKID0009101';
  const yesIFSC = 'YESB0000381';

  const accountNumber = adDetails.bankName === 'yes' ? yesAccountNumber : boiAccountNumber;
  const ifscCode = adDetails.bankName === 'yes' ? yesIFSC : boiIFSC;
  const bankName = adDetails.bankName === 'yes' ? 'YES Bank' : 'Bank of India';

  // Determine row numbering
  let rowNum = 1;
  const getNextRow = () => rowNum++;

  return (
    <div className="invoice-container">
      {savedMessage && (
        <div className="saved-message">
          {savedMessage}
        </div>
      )}

      <div ref={invoiceRef} className="invoice-preview">

        {/* ── HEADER ── */}
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

        {/* ── GST / PAN / DPR ── */}
        <div className="address-section">
          <div className="office-addresses">
            <p><strong>GSTN No.:</strong> 23ABUPT9154H1ZZ</p>
            <p><strong>PAN No.:</strong> ABUPT9154H</p>
          </div>
          <div className="dpr-code-section">
            <div className="dpr-code">DPR CODE: {cityInfo.dprCode}</div>
          </div>
        </div>

        {/* FIX 4: Separation line between header area and particulars */}
        <hr style={{ border: '1px solid #000', margin: '0 0 8px 0' }} />

        {/* FIX 5: 2×4 grid layout for bill meta-info */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4px 16px',
          padding: '6px 8px',
          marginBottom: '6px',
          fontSize: '13px'
        }}>
          {/* Row 1 */}
          <div><strong>Bill No:</strong> {adDetails.invoiceId || '213'} &nbsp;&nbsp; <strong>Bill Date:</strong> {adDetails.billingDate ? formatDate(adDetails.billingDate) : formatDate(new Date())}</div>
          {/* Row 2 */}
          <div style={{ gridRow: '1', gridColumn: '2' }}></div>

          {/* Row 2: Name of Department */}
          <div style={{ gridColumn: '1 / -1' }}>
            <strong>Name of Department / Client:</strong>{' '}
            <span style={{ fontWeight: 'bold', fontSize: '15px', textTransform: 'uppercase' }}>
              {client.name || '-'}
            </span>
          </div>

          {/* Row 3 */}
          <div><strong>RO Number:</strong> {adDetails.roNumber || '-'}</div>
          <div><strong>RO Date:</strong> {adDetails.roDate ? formatDate(adDetails.roDate) : '-'}</div>

          {/* Row 4 */}
          <div><strong>Date of Publication:</strong> {adDetails.publicationDate ? formatDate(adDetails.publicationDate) : '-'}</div>
          <div><strong>Size:</strong> {dimensions.displayArea} cm²</div>
        </div>

        {adDetails.additionalInfo && (
          <div style={{ padding: '0 8px 6px 8px', fontSize: '13px' }}>
            <strong>Additional Information:</strong>
            <div>{adDetails.additionalInfo}</div>
          </div>
        )}

        {/* ── INVOICE TABLE ── */}
        <div className="invoice-table" style={{ marginTop: '8px', overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #000',
            minWidth: '650px'
          }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #000', padding: '5px', width: '25%' }}>Particulars</th>
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
              {/* Row 1: Publication Charges */}
              <tr>
                <td style={{ border: '1px solid #000', padding: '5px' }}>उपरोक्त आदेश के तहत विज्ञापन का प्रकाश</td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{getNextRow()}</td>
                <td style={{ border: '1px solid #000', padding: '5px' }}>Publication Charges</td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{dimensions.displayLength}</td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{dimensions.displayWidth}</td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{dimensions.displayArea}</td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>
                  {(parseFloat(adDetails.ratePerSqCm) || 0).toFixed(2)}
                </td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{adDetails.basePrice?.toFixed(2) || '-'}</td>
              </tr>

              {/* Row 2: Color Charges (conditional) */}
              {adDetails.colorCharge > 0 && (
                <tr>
                  <td style={{ border: '1px solid #000', padding: '5px' }}>Our Bank Detail -</td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{getNextRow()}</td>
                  <td style={{ border: '1px solid #000', padding: '5px' }}>Color Charges (+40%)</td>
                  <td style={{ border: '1px solid #000', padding: '5px' }} colSpan="4"></td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{adDetails.colorCharge?.toFixed(2) || '0.00'}</td>
                </tr>
              )}

              {/* Total Charge row */}
              <tr>
                <td style={{ border: '1px solid #000', padding: '5px' }}>
                  {adDetails.colorCharge > 0 ? `Bank Name - ${bankName}` : 'Our Bank Detail -'}
                </td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{getNextRow()}</td>
                <td style={{ border: '1px solid #000', padding: '5px' }}>Total Charge</td>
                <td style={{ border: '1px solid #000', padding: '5px' }} colSpan="4"></td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>
                  {(adDetails.basePrice + (adDetails.colorCharge || 0)).toFixed(2)}
                </td>
              </tr>

              {/* Less Discount (private clients only) */}
              {client.type === 'private' && adDetails.commission > 0 && (
                <tr>
                  <td style={{ border: '1px solid #000', padding: '5px' }}>
                    {adDetails.colorCharge > 0 ? `Branch Ujjain` : `Bank Name - ${bankName}`}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{getNextRow()}</td>
                  <td style={{ border: '1px solid #000', padding: '5px' }}>Less Discount (15%)</td>
                  <td style={{ border: '1px solid #000', padding: '5px' }} colSpan="4"></td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>
                    {adDetails.commission?.toFixed(2) || '0.00'}
                  </td>
                </tr>
              )}

              {/* GST rows */}
              {client.type === 'state' ? (
                <>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '5px' }}>
                      {adDetails.colorCharge > 0 ? `Branch Ujjain` : `Bank Name - ${bankName}`}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{getNextRow()}</td>
                    <td style={{ border: '1px solid #000', padding: '5px' }}>Add: CGST (2.5%)</td>
                    <td style={{ border: '1px solid #000', padding: '5px' }} colSpan="4"></td>
                    <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>
                      {(adDetails.gstAmount / 2).toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '5px' }}>
                      {adDetails.colorCharge > 0 ? `A/c No.: ${accountNumber}` : `Branch Ujjain`}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{getNextRow()}</td>
                    <td style={{ border: '1px solid #000', padding: '5px' }}>Add: SGST (2.5%)</td>
                    <td style={{ border: '1px solid #000', padding: '5px' }} colSpan="4"></td>
                    <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>
                      {(adDetails.gstAmount / 2).toFixed(2)}
                    </td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td style={{ border: '1px solid #000', padding: '5px' }}>
                    {adDetails.colorCharge > 0 ? `Branch Ujjain` : `Bank Name - ${bankName}`}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{getNextRow()}</td>
                  <td style={{ border: '1px solid #000', padding: '5px' }}>
                    Add: {client.type === 'central' ? 'IGST (5%)' : 'GST (5%)'}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '5px' }} colSpan="4"></td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>
                    {adDetails.gstAmount?.toFixed(2) || '0.00'}
                  </td>
                </tr>
              )}

              {/* Grand Total row */}
              <tr>
                {/* FIX 2 & FIX 3: Correct BOI A/c No., show A/c here, NOT IFSC (IFSC only appears once in the last row below) */}
                <td style={{ border: '1px solid #000', padding: '5px' }}>
                  A/c No.: {accountNumber}
                </td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }} colSpan="6">
                  <strong>Grand Total</strong>
                </td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right', fontWeight: 'bold' }}>
                  {adDetails.finalPrice?.toFixed(2) || '0.00'}
                </td>
              </tr>

              {/* FIX 3: IFSC appears ONLY ONCE, in the last row */}
              <tr>
                <td style={{ border: '1px solid #000', padding: '5px' }}>
                  IFSC - {ifscCode}
                </td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'left', fontStyle: 'italic' }} colSpan="7">
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ marginRight: '10px', minWidth: 'fit-content', whiteSpace: 'nowrap' }}>Total in Rupees:</span>
                    <span style={{ flex: 1, wordBreak: 'break-word' }}>{convertToWords(adDetails.finalPrice || 0)}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── NOTES ── */}
        <div className="invoice-notes" style={{ marginTop: '10px' }}>
          <p>नोट :</p>
          <p>1) बिल का भुगतान अकाउंट पे चैक या ड्राफ्ट द्वारा स्वीकार किया जायेगा।</p>
          <p>2) कृपया चैक निर्णायक (Nirnayak) नाम से बनावे।</p>
          {/* FIX 7: Note #3 added */}
          <p>3) कृपया चेक दैनिक निर्णायक के प्रधान कार्यालय उज्जैन के पते पर भेजे, जो बिल में अंकित है।</p>
        </div>

        {/* FIX 6: Advertisement Manager signature field — bottom left */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-start',
          marginTop: '30px',
          paddingLeft: '8px'
        }}>
          <div style={{ textAlign: 'center', minWidth: '160px' }}>
            <div style={{
              border: '1px solid #000',
              height: '60px',
              width: '160px',
              marginBottom: '4px'
            }} />
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold' }}>विज्ञापन प्रबंधक</p>
            <p style={{ margin: 0, fontSize: '11px' }}>(Advertisement Manager)</p>
          </div>
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