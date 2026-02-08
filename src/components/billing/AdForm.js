import React, { useState, useEffect } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { calculateAdPrice } from '../../utils/calculators';
import { db } from '../../firebase'; // Assuming you have Firebase config
import { collection, addDoc, getDocs, query, orderBy, limit, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

const AdForm = ({ client, onSubmit }) => {
  const [formData, setFormData] = useState({
    adCategory: client.type, // Pre-filled based on client type
    adLength: '',
    adBreadth: '',
    adArea: '', // Added direct area input field
    ratePerSqCm: '',
    colorType: 'bw', // Default to B/W
    additionalInfo: '',
    roNumber: '', // RO number field
    roDate: '', // No default date now
    publicationDate: '', // NEW: Publication date field
    billingDate: new Date().toISOString().split('T')[0], // Billing date - today's date by default
    city: 'indore', // Default city selection
    billNumber: '', // Added user input bill number field
    bankName: 'boi' // Default to Bank of India
  });

  // City information mapping
  const cityInfo = {
    indore: {
      address: 'MD - 56, Bajrang Nagar (71 - MG Duplex), Indore - 452001',
      phone: '07344060666 / Mob.: 9424560111',
      email: 'nirnayak.news@gmail.com',
      dprCode: '0539'
    },
    ujjain: {
      address: '36, Bhoj Marg, Freeganj Ujjain - 456010',
      phone: '07344060666 / Mob.: 9424560111',
      email: 'nirnayak.news@gmail.com',
      dprCode: '0910'
    }
  };

  // Bank information mapping
  const bankInfo = {
    boi: {
      name: 'Bank of India',
      accountNumber: '910130110002710',
      ifsc: 'BKID0009101',
      branch: 'Freeganj Ujjain'
    },
    yes: {
      name: 'YES Bank',
      accountNumber: '038163400001108',
      ifsc: 'YESB0000381',
      branch: 'Ujjain'
    }
  };

  const [calculatedArea, setCalculatedArea] = useState(0);
  const [pricePreview, setPricePreview] = useState({
    basePrice: 0,
    colorCharge: 0,
    gstAmount: 0,
    commission: 0,
    finalPrice: 0
  });

  const [totalGstOverall, setTotalGstOverall] = useState(0);
  const [clientOverallGst, setClientOverallGst] = useState(0);

  // Fetch the latest overall GST value when component mounts
  useEffect(() => {
    fetchLatestGstTotal();
    fetchClientGstTotal();
  }, [client.id]); // Added client.id as dependency

  // Function to fetch the latest overall GST value
  const fetchLatestGstTotal = async () => {
    try {
      const invoicesRef = collection(db, "invoices");
      const q = query(invoicesRef, orderBy("createdAt", "desc"), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const latestInvoice = querySnapshot.docs[0].data();
        if (latestInvoice.totalGstOverall) {
          setTotalGstOverall(latestInvoice.totalGstOverall);
        }
      }
    } catch (error) {
      console.error("Error fetching latest GST total:", error);
    }
  };

  // Function to fetch the client's overall GST
  const fetchClientGstTotal = async () => {
    try {
      if (client.id) {
        const clientDocRef = doc(db, "clients", client.id);
        const clientDoc = await getDoc(clientDocRef);

        if (clientDoc.exists()) {
          const clientData = clientDoc.data();
          // Get the overallGst value or default to 0 if it doesn't exist
          setClientOverallGst(clientData.overallGst || 0);
        }
      }
    } catch (error) {
      console.error("Error fetching client GST total:", error);
    }
  };

  // Handle swap of length and breadth
  const handleSwapDimensions = () => {
    setFormData(prevData => ({
      ...prevData,
      adLength: prevData.adBreadth,
      adBreadth: prevData.adLength
    }));
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Standard handling for all fields - no auto-calculation
    setFormData(prevData => ({ ...prevData, [name]: value }));

    // Update calculated area when adArea field changes
    if (name === 'adArea') {
      const area = parseFloat(value) || 0;
      setCalculatedArea(area);

      // Update price preview if we have all the needed data
      if (formData.ratePerSqCm && area > 0) {
        updatePricePreview(area);
      }
    }

    // Update price preview when rate changes
    if (name === 'ratePerSqCm' && calculatedArea > 0) {
      updatePricePreview(calculatedArea);
    }
  };

  // Update price preview when rate or color type changes
  useEffect(() => {
    if (calculatedArea > 0 && formData.ratePerSqCm) {
      updatePricePreview(calculatedArea);
    }
  }, [formData.ratePerSqCm, formData.colorType]);

  // Function to update price preview
  const updatePricePreview = (area) => {
    const price = calculateAdPrice({
      adType: client.type,
      adSize: area,
      ratePerSqCm: parseFloat(formData.ratePerSqCm),
      isColored: formData.colorType === 'colored'
    });

    setPricePreview(price);
  };

  // Save invoice data to Firebase
  const saveInvoiceToFirebase = async (invoiceData) => {
    try {
      // Use the user-provided bill number instead of auto-generating one
      const invoiceNumber = formData.billNumber;

      // Calculate the new overall GST total
      const newTotalGstOverall = totalGstOverall + invoiceData.gstAmount;

      // Calculate the new client-specific GST total
      const newClientGstTotal = clientOverallGst + invoiceData.gstAmount;

      // Get selected city information
      const selectedCityInfo = cityInfo[formData.city];

      // Get selected bank information
      const selectedBankInfo = bankInfo[formData.bankName];

      // Create the data object to save
      const dataToSave = {
        invoiceId: invoiceNumber, // Use the user-provided bill number
        clientId: client.id,
        clientName: client.name,
        clientType: client.type,
        gstNumber: client.gstNumber,
        adDimensions: {
          length: parseFloat(formData.adLength),
          breadth: parseFloat(formData.adBreadth),
          area: calculatedArea
        },
        date: new Date().toISOString(),
        publicationCharges: invoiceData.basePrice,
        colorCharge: invoiceData.colorCharge || 0,
        gstAmount: invoiceData.gstAmount,
        totalGstOverall: newTotalGstOverall,
        clientGstTotal: newClientGstTotal,
        finalPrice: invoiceData.finalPrice,
        createdAt: new Date(),
        roNumber: formData.roNumber,
        roDate: formData.roDate,
        publicationDate: formData.publicationDate,
        billingDate: formData.billingDate,
        city: formData.city,
        cityInfo: selectedCityInfo,
        bankName: formData.bankName,
        bankInfo: selectedBankInfo,
        billNumber: formData.billNumber // Store the user-provided bill number
      };

      // Use the user-provided bill number as the document ID
      const invoiceDocRef = doc(db, "invoices_beforeInvoice", invoiceNumber);
      await setDoc(invoiceDocRef, dataToSave);

      console.log("Invoice saved with ID: ", invoiceNumber);

      // Update the client's overall GST in the clients collection
      await updateDoc(doc(db, "clients", client.id), {
        overallGst: newClientGstTotal
      });

      // Update local state
      setTotalGstOverall(newTotalGstOverall);
      setClientOverallGst(newClientGstTotal);

      return invoiceNumber;
    } catch (error) {
      console.error("Error saving invoice:", error);
      throw error;
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if bill number is entered
    if (!formData.billNumber.trim()) {
      alert("Please enter a Bill Number");
      return;
    }

    // Calculate final price using the calculated area
    const finalCalculation = calculateAdPrice({
      adType: client.type,
      adSize: calculatedArea,
      ratePerSqCm: parseFloat(formData.ratePerSqCm),
      isColored: formData.colorType === 'colored'
    });

    // Get selected city information
    const selectedCityInfo = cityInfo[formData.city];

    // Get selected bank information
    const selectedBankInfo = bankInfo[formData.bankName];

    // Combine form data with price calculations and city info
    const adDetails = {
      ...formData,
      adSize: calculatedArea, // Include the calculated area
      ...finalCalculation,
      client: client,
      date: new Date().toISOString(),
      roNumber: formData.roNumber,
      roDate: formData.roDate,
      publicationDate: formData.publicationDate,
      billingDate: formData.billingDate,
      cityInfo: selectedCityInfo,
      bankInfo: selectedBankInfo,
      billNumber: formData.billNumber // Include the user-provided bill number
    };

    try {
      // Save to Firebase and get the bill number as invoice ID
      const invoiceId = await saveInvoiceToFirebase(finalCalculation);

      // Add the invoice ID to adDetails
      adDetails.invoiceId = invoiceId;

      // Call the parent component's onSubmit with the complete data
      onSubmit(adDetails);

      // Optional: Show success message
      alert("Invoice saved successfully! Invoice #" + invoiceId);

      // Reset form if needed
      // setFormData({...}); // Uncomment if you want to reset the form

    } catch (error) {
      alert("Error saving invoice. Please try again.");
      console.error("Submit error:", error);
    }
  };

  return (
    <form className="ad-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Client Name:</label>
        <input
          type="text"
          value={client.name}
          disabled
          className="form-control"
        />
        <p className="client-type-indicator">
          {client.type === 'central' ? 'Central Government' :
            client.type === 'state' ? 'State Government' : 'Private Company'}
        </p>
      </div>
      <div className="form-group">
        <label>Client GST number:</label>
        <input
          type="text"
          value={client.gstNumber}
          disabled
          className="form-control"
        />
      </div>

      {/* City Selection Dropdown */}
      <div className="form-group">
        <label>Publication City: <span className="required-field"></span></label>
        <select
          name="city"
          value={formData.city}
          onChange={handleChange}
          required
          className="form-control"
        >
          <option value="indore">Indore</option>
          <option value="ujjain">Ujjain</option>
        </select>
      </div>

      {/* Display selected city information */}
      <div className="city-info">
        <h4>Publication Details ({formData.city === 'indore' ? 'Indore' : 'Ujjain'})</h4>
        <p><strong>Address:</strong> {cityInfo[formData.city].address}</p>
        <p><strong>Phone:</strong> {cityInfo[formData.city].phone}</p>
        <p><strong>Email:</strong> {cityInfo[formData.city].email}</p>
        <p><strong>DPR Code:</strong> {cityInfo[formData.city].dprCode}</p>
      </div>

      {/* Bank Selection Dropdown */}
      <div className="form-group">
        <label>Bank: <span className="required-field"></span></label>
        <select
          name="bankName"
          value={formData.bankName}
          onChange={handleChange}
          required
          className="form-control"
        >
          <option value="boi">Bank of India</option>
          <option value="yes">YES Bank</option>
        </select>
      </div>

      {/* Display selected bank information */}
      <div className="city-info">
        <h4>Bank Details ({bankInfo[formData.bankName].name})</h4>
        <p><strong>Account Number:</strong> {bankInfo[formData.bankName].accountNumber}</p>
        <p><strong>IFSC Code:</strong> {bankInfo[formData.bankName].ifsc}</p>
        <p><strong>Branch:</strong> {bankInfo[formData.bankName].branch}</p>
      </div>

      {/* Bill Number and RO Fields Row */}
      <div className="form-row">
        <div className="form-group">
          <label>Bill Number: <span className="required-field"></span></label>
          <input
            type="text"
            name="billNumber"
            value={formData.billNumber}
            onChange={handleChange}
            required
            className="form-control"
            placeholder="Enter Bill Number"
          />
        </div>

        <div className="form-group">
          <label>RO Number: <span className="required-field"></span></label>
          <input
            type="text"
            name="roNumber"
            value={formData.roNumber}
            onChange={handleChange}
            required
            className="form-control"
            placeholder="Enter Release Order Number"
          />
        </div>
      </div>

      {/* Billing Date Field */}
      <div className="form-group">
        <label>Billing Date: <span className="required-field"></span></label>
        <input
          type="date"
          name="billingDate"
          value={formData.billingDate}
          onChange={handleChange}
          required
          className="form-control"
        />
      </div>

      <div className="form-group">
        <label>RO Date: <span className="required-field"></span></label>
        <input
          type="date"
          name="roDate"
          value={formData.roDate}
          onChange={handleChange}
          required
          className="form-control"
        />
      </div>

      {/* NEW: Publication Date Field */}
      <div className="form-group">
        <label>Publication Date: <span className="required-field"></span></label>
        <input
          type="date"
          name="publicationDate"
          value={formData.publicationDate}
          onChange={handleChange}
          required
          className="form-control"
        />
      </div>

      {/* Dimensions Section */}
      <div className="dimensions-section">
        <div className="form-row">
          <div className="form-group dimension-input">
            <label>Ad Length (cm):</label>
            <input
              type="number"
              name="adLength"
              value={formData.adLength}
              onChange={handleChange}
              required
              min="0.01"
              step="any"
              className="form-control"
            />
          </div>

          {/* Swap button */}
          <button
            type="button"
            onClick={handleSwapDimensions}
            className="btn-swap"
            title="Swap Length and Breadth"
          >
            <ArrowUpDown size={16} />
            <span className="swap-text">Swap</span>
          </button>

          <div className="form-group dimension-input">
            <label>Ad Breadth (cm):</label>
            <input
              type="number"
              name="adBreadth"
              value={formData.adBreadth}
              onChange={handleChange}
              required
              min="0.01"
              step="any"
              className="form-control"
            />
          </div>
        </div>

        {/* Area input field */}
        <div className="form-group area-input">
          <label>Ad Area (sq. cm):</label>
          <input
            type="number"
            name="adArea"
            value={formData.adArea}
            onChange={handleChange}
            required
            min="0.01"
            step="any"
            className="form-control"
          />
        </div>
      </div>

      <div className="form-group">
        <label>Rate per sq. cm (₹):</label>
        <input
          type="number"
          name="ratePerSqCm"
          value={formData.ratePerSqCm}
          onChange={handleChange}
          required
          min="1"
          step="any"
          className="form-control"
        />
      </div>

      <div className="form-group">
        <label>Color Type:</label>
        <div className="radio-group">
          <label>
            <input
              type="radio"
              name="colorType"
              value="bw"
              checked={formData.colorType === 'bw'}
              onChange={handleChange}
            />
            Black & White
          </label>
          <label>
            <input
              type="radio"
              name="colorType"
              value="colored"
              checked={formData.colorType === 'colored'}
              onChange={handleChange}
            />
            Colored (+40% charge)
          </label>
        </div>
      </div>

      {/* Price Preview Section */}
      {calculatedArea > 0 && formData.ratePerSqCm && (
        <div className="price-preview">
          <h3>Price Preview</h3>
          <div className="price-breakdown">
            <div className="price-row">
              <span>Base Price:</span>
              <span>₹{pricePreview.basePrice.toFixed(2)}</span>
            </div>

            {pricePreview.colorCharge > 0 && (
              <div className="price-row">
                <span>Color Charge (+40%):</span>
                <span>₹{pricePreview.colorCharge.toFixed(2)}</span>
              </div>
            )}

            {client.type === 'private' && pricePreview.commission > 0 && (
              <div className="price-row">
                <span>Agency Commission (15%):</span>
                <span>-₹{pricePreview.commission.toFixed(2)}</span>
              </div>
            )}

            <div className="price-row">
              <span>
                GST ({client.type === 'central' ? '5% IGST' :
                  client.type === 'state' ? '2.5% CGST + 2.5% SGST' : '5% GST'}):
              </span>
              <span>₹{pricePreview.gstAmount.toFixed(2)}</span>
            </div>

            <div className="price-row total">
              <span>Final Price:</span>
              <span>₹{pricePreview.finalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="form-actions">
        <button type="submit" className="btn-submit">
          Save & Generate Invoice
        </button>
      </div>
      <style jsx>{`
        .form-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .dimension-input {
          flex: 1;
        }
        
        .btn-swap {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #f0f0f0;
          border: 1px solid #ccc;
          border-radius: 4px;
          padding: 8px;
          margin-top: 24px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-swap:hover {
          background: #e0e0e0;
        }
        
        .swap-text {
          font-size: 12px;
          margin-top: 4px;
        }
        
        .input-mode-toggle {
          margin-bottom: 15px;
        }
        
        .btn-toggle-input {
          background: #f8f8f8;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 8px 12px;
          cursor: pointer;
          font-size: 14px;
          color: #444;
        }
        
        .dimensions-display {
          margin: 15px 0;
          padding: 10px;
          background: #f9f9f9;
          border-radius: 4px;
          border-left: 3px solid #4a90e2;
        }
        
        .dimensions-info {
          font-size: 14px;
          color: #555;
          margin-top: 5px;
        }
        
        .area-display {
          font-weight: bold;
          color: #4a90e2;
          font-size: 16px;
        }

        .city-info {
          background: #f9f9f9;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 15px;
          border-left: 3px solid #4a90e2;
        }

        .city-info h4 {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 16px;
        }

        .city-info p {
          margin: 5px 0;
          font-size: 14px;
          color: #555;
        }
      `}</style>
    </form>
  );
};

export default AdForm;