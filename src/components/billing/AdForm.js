import React, { useState, useEffect } from 'react';
import { calculateAdPrice } from '../../utils/calculators';
import { db } from '../../firebase'; // Assuming you have Firebase config
import { collection, addDoc, getDocs, query, orderBy, limit, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

const AdForm = ({ client, onSubmit }) => {
  const [formData, setFormData] = useState({
    adCategory: client.type, // Pre-filled based on client type
    adLength: '',
    adBreadth: '',
    ratePerSqCm: '',
    colorType: 'bw', // Default to B/W
    additionalInfo: '',
    roNumber: '', // Added RO number field
    roDate: new Date().toISOString().split('T')[0], // Added RO date with today's date as default
    city: 'indore' // Default city selection
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

  // Calculate area whenever length or breadth changes
  useEffect(() => {
    if (formData.adLength && formData.adBreadth) {
      const length = parseFloat(formData.adLength);
      const breadth = parseFloat(formData.adBreadth);
      const area = length * breadth;
      setCalculatedArea(area);

      // Update price preview if we have all the needed data
      if (formData.ratePerSqCm) {
        const price = calculateAdPrice({
          adType: client.type,
          adSize: area,
          ratePerSqCm: parseFloat(formData.ratePerSqCm),
          isColored: formData.colorType === 'colored'
        });
        
        setPricePreview(price);
      }
    } else {
      setCalculatedArea(0);
    }
  }, [formData.adLength, formData.adBreadth, formData.ratePerSqCm, formData.colorType, client.type]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  // Function to get the next invoice number
  const getNextInvoiceNumber = async () => {
    try {
      // Reference to the counter document
      const counterDocRef = doc(db, "counters", "invoiceCounter");
      const counterDoc = await getDoc(counterDocRef);
      
      let nextInvoiceNumber = 1; // Default start at 1
      
      if (counterDoc.exists()) {
        // If counter exists, get the current value and increment
        nextInvoiceNumber = counterDoc.data().currentValue + 1;
      }
      
      // Update the counter with the new value
      await setDoc(counterDocRef, { currentValue: nextInvoiceNumber });
      
      return nextInvoiceNumber;
    } catch (error) {
      console.error("Error getting next invoice number:", error);
      throw error;
    }
  };

  // Save invoice data to Firebase
  const saveInvoiceToFirebase = async (invoiceData) => {
    try {
      // Get the next sequential invoice number
      const invoiceNumber = await getNextInvoiceNumber();
      
      // Calculate the new overall GST total
      const newTotalGstOverall = totalGstOverall + invoiceData.gstAmount;
      
      // Calculate the new client-specific GST total
      const newClientGstTotal = clientOverallGst + invoiceData.gstAmount;
      
      // Get selected city information
      const selectedCityInfo = cityInfo[formData.city];
      
      // Create the data object to save
      const dataToSave = {
        invoiceId: invoiceNumber, // Use the sequential number
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
        roNumber: formData.roNumber, // Add RO number to the saved data
        roDate: formData.roDate, // Add RO date to the saved data
        city: formData.city, // Add selected city
        cityInfo: selectedCityInfo // Add city information
      };
      
      // Use the invoice number as the document ID
      const invoiceDocRef = doc(db, "invoices_beforeInvoice", invoiceNumber.toString());
      await setDoc(invoiceDocRef, dataToSave);
      
      console.log("Invoice saved with ID: ", invoiceNumber);
      
      // Update the client's overall GST in the clients collection
      await updateDoc(doc(db, "clients", client.id), {
        overallGst: newClientGstTotal
      });
      
      // Update local state
      setTotalGstOverall(newTotalGstOverall);
      setClientOverallGst(newClientGstTotal);
      
      return invoiceNumber.toString();
    } catch (error) {
      console.error("Error saving invoice:", error);
      throw error;
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Calculate final price using the calculated area
    const finalCalculation = calculateAdPrice({
      adType: client.type,
      adSize: calculatedArea,
      ratePerSqCm: parseFloat(formData.ratePerSqCm),
      isColored: formData.colorType === 'colored'
    });
    
    // Get selected city information
    const selectedCityInfo = cityInfo[formData.city];
    
    // Combine form data with price calculations and city info
    const adDetails = {
      ...formData,
      adSize: calculatedArea, // Include the calculated area
      ...finalCalculation,
      client: client,
      date: new Date().toISOString(),
      roNumber: formData.roNumber, // Include RO number
      roDate: formData.roDate, // Include RO date
      cityInfo: selectedCityInfo // Include city information
    };
    
    try {
      // Save to Firebase and get sequential invoice ID
      const invoiceId = await saveInvoiceToFirebase(finalCalculation);
      
      // Add the invoice ID to adDetails
      adDetails.invoiceId = invoiceId;
      
      // Call the parent component's onSubmit with the complete data
      onSubmit(adDetails);
      
      // Optional: Show success message or clear form
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
      
      {/* RO Number and Date Fields */}
      <div className="form-row">
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
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>Ad Length (cm):</label>
          <input 
            type="number" 
            name="adLength" 
            value={formData.adLength} 
            onChange={handleChange} 
            required 
            min="0.1"
            step="0.1"
            className="form-control"
          />
        </div>
        
        <div className="form-group">
          <label>Ad Breadth (cm):</label>
          <input 
            type="number" 
            name="adBreadth" 
            value={formData.adBreadth} 
            onChange={handleChange} 
            required 
            min="0.1"
            step="0.1"
            className="form-control"
          />
        </div>
      </div>
      
      {calculatedArea > 0 && (
        <div className="form-group calculated-area">
          <label>Calculated Area:</label>
          <div className="area-display">
            {calculatedArea.toFixed(2)} sq. cm
          </div>
        </div>
      )}
      
      <div className="form-group">
        <label>Rate per sq. cm (₹):</label>
        <input 
          type="number" 
          name="ratePerSqCm" 
          value={formData.ratePerSqCm} 
          onChange={handleChange} 
          required 
          min="1"
          step="0.01"
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
    </form>
  );
};

export default AdForm;