import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../css/clients.css';
import Sidebar from '../components/Sidebar';
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const EditClientPage = () => {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editClient, setEditClient] = useState({
    id: '',
    name: '',
    type: 'private',
    gstNumber: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: ''
  });
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Fetch client data
  useEffect(() => {
    const fetchClient = async () => {
      try {
        setIsLoading(true);
        const clientRef = doc(db, "clients", clientId);
        const clientSnap = await getDoc(clientRef);
        
        if (clientSnap.exists()) {
          const clientData = clientSnap.data();
          setEditClient({
            id: clientId,
            name: clientData.name || '',
            type: clientData.type || 'private',
            gstNumber: clientData.gstNumber || '',
            contactPerson: clientData.contactPerson || '',
            email: clientData.email || '',
            phone: clientData.phone || '',
            address: clientData.address || ''
          });
          setError(null);
        } else {
          setError("Client not found!");
          setTimeout(() => navigate('/clients'), 2000);
        }
      } catch (err) {
        console.error("Error fetching client:", err);
        setError("Failed to load client. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    
    if (clientId) {
      fetchClient();
    }
  }, [clientId, navigate]);
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditClient({
      ...editClient,
      [name]: value
    });
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    updateClient();
  };
  
  // Update client in Firestore
  const updateClient = async () => {
    try {
      setIsSaving(true);
      setError(null);
      const clientRef = doc(db, "clients", editClient.id);
      
      // Update Client Data in Firestore
      await updateDoc(clientRef, {
        name: editClient.name,
        type: editClient.type,
        gstNumber: editClient.gstNumber,
        contactPerson: editClient.contactPerson,
        email: editClient.email,
        phone: editClient.phone,
        address: editClient.address,
        updatedAt: new Date().toISOString()
      });
      
      console.log("Client updated with ID:", editClient.id);
      
      // Navigate back to clients page
      navigate('/clients');
    } catch (error) {
      console.error("Error updating client:", error);
      setError("Failed to update client. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="clients-container">
      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <div className="content-wrapper">
        <div className="page-header">
          <h1>Edit Client</h1>
          <button 
            className="back-button"
            onClick={() => navigate('/clients')}
          >
            Back to Clients
          </button>
        </div>
        
        {/* Display error message if any */}
        {error && <div className="error-message">{error}</div>}
        
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading client data...</p>
          </div>
        ) : (
          <div className="form-container">
            <form onSubmit={handleSubmit} className="client-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Client Name<span className="required">*</span></label>
                  <input 
                    type="text" 
                    name="name" 
                    value={editClient.name} 
                    onChange={handleInputChange} 
                    required 
                    placeholder="Enter client name"
                    className="form-control"
                  />
                </div>
                
                <div className="form-group">
                  <label>Client Type<span className="required">*</span></label>
                  <select 
                    name="type" 
                    value={editClient.type} 
                    onChange={handleInputChange} 
                    required
                    className="form-control"
                  >
                    <option value="private">Private Company</option>
                    <option value="central">Central Government</option>
                    <option value="state">State Government</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>GST Number<span className="required">*</span></label>
                  <input 
                    type="text" 
                    name="gstNumber" 
                    value={editClient.gstNumber} 
                    onChange={handleInputChange} 
                    required 
                    placeholder="Enter GST number"
                    className="form-control"
                  />
                </div>
                
                <div className="form-group">
                  <label>Contact Person<span className="required">*</span></label>
                  <input 
                    type="text" 
                    name="contactPerson" 
                    value={editClient.contactPerson} 
                    onChange={handleInputChange} 
                    required 
                    placeholder="Enter contact person name"
                    className="form-control"
                  />
                </div>
                
                <div className="form-group">
                  <label>Email<span className="required">*</span></label>
                  <input 
                    type="email" 
                    name="email" 
                    value={editClient.email} 
                    onChange={handleInputChange} 
                    required 
                    placeholder="Enter email address"
                    className="form-control"
                  />
                </div>
                
                <div className="form-group">
                  <label>Phone<span className="required">*</span></label>
                  <input 
                    type="tel" 
                    name="phone" 
                    value={editClient.phone} 
                    onChange={handleInputChange} 
                    required 
                    placeholder="Enter phone number"
                    className="form-control"
                  />
                </div>
                
                <div className="form-group span-full">
                  <label>Address<span className="required">*</span></label>
                  <textarea 
                    name="address" 
                    value={editClient.address} 
                    onChange={handleInputChange} 
                    required 
                    placeholder="Enter complete address"
                    className="form-control"
                    rows="3"
                  />
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  onClick={() => navigate('/clients')} 
                  className="btn-cancel"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-submit" 
                  disabled={isSaving}
                >
                  {isSaving ? 'Updating...' : 'Update Client'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditClientPage;