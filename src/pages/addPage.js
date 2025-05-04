import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/clients.css';
import Sidebar from '../components/Sidebar';
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

const AddClientPage = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newClient, setNewClient] = useState({
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

  // Handle form input changes for new client
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewClient({
      ...newClient,
      [name]: value
    });
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    saveClient();
  };
  
  // Save client to Firestore
  const saveClient = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Add Client Data to Firestore
      const docRef = await addDoc(collection(db, "clients"), {
        name: newClient.name,
        type: newClient.type,
        gstNumber: newClient.gstNumber,
        contactPerson: newClient.contactPerson || '',
        email: newClient.email || '',
        phone: newClient.phone || '',
        address: newClient.address || '',
        createdAt: new Date().toISOString()
      });
      
      console.log("Client added with ID:", docRef.id);
      
      // Navigate back to clients page
      navigate('/clients');
    } catch (error) {
      console.error("Error adding client:", error);
      setError("Failed to add client. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="clients-container">
      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <div className="content-wrapper">
        <div className="page-header">
          <h1>Add New Client</h1>
          <button 
            className="back-button"
            onClick={() => navigate('/clients')}
          >
            Back to Clients
          </button>
        </div>
        
        {/* Display error message if any */}
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-container">
          <form onSubmit={handleSubmit} className="client-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Client Name<span className="required">*</span></label>
                <input 
                  type="text" 
                  name="name" 
                  value={newClient.name} 
                  onChange={handleInputChange} 
                  required 
                  placeholder="Enter client name"
                  className="form-control"
                />
              </div>
              
              <div className="form-group">
                <label>Client Type</label>
                <select 
                  name="type" 
                  value={newClient.type} 
                  onChange={handleInputChange}
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
                  value={newClient.gstNumber} 
                  onChange={handleInputChange} 
                  required 
                  placeholder="Enter GST number"
                  className="form-control"
                />
              </div>
              
              <div className="form-group">
                <label>Contact Person</label>
                <input 
                  type="text" 
                  name="contactPerson" 
                  value={newClient.contactPerson} 
                  onChange={handleInputChange}
                  placeholder="Enter contact person name"
                  className="form-control"
                />
              </div>
              
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  name="email" 
                  value={newClient.email} 
                  onChange={handleInputChange}
                  placeholder="Enter email address"
                  className="form-control"
                />
              </div>
              
              <div className="form-group">
                <label>Phone</label>
                <input 
                  type="tel" 
                  name="phone" 
                  value={newClient.phone} 
                  onChange={handleInputChange}
                  placeholder="Enter phone number"
                  className="form-control"
                />
              </div>
              
              <div className="form-group span-full">
                <label>Address</label>
                <textarea 
                  name="address" 
                  value={newClient.address} 
                  onChange={handleInputChange}
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
                disabled={isLoading}
              >
                {isLoading ? 'Adding...' : 'Add Client'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddClientPage;