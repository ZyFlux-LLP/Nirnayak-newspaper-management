import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/clients.css';
import Sidebar from '../components/Sidebar';
import { db } from "../firebase";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";

const ClientsPage = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Fetch clients from Firestore
  useEffect(() => {
    fetchClients();
  }, []);
  
  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const clientsCollection = collection(db, "clients");
      const clientSnapshot = await getDocs(clientsCollection);
      const clientsList = clientSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClients(clientsList);
      setError(null);
    } catch (err) {
      console.error("Error fetching clients:", err);
      setError("Failed to load clients. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter clients based on search term
  const filteredClients = clients.filter(client => 
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.gstNumber && client.gstNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // Navigate to add client page
  const handleAddClient = () => {
    navigate('/clients/add');
  };
  
  // Navigate to edit client page
  const handleEditClient = (client) => {
    navigate(`/clients/edit/${client.id}`);
  };
  
  // Delete client from Firestore
  const deleteClient = async (clientId, clientName) => {
    // Show confirmation dialog
    if (window.confirm(`Do you want to delete the client "${clientName}"?`)) {
      try {
        setError(null);
        const clientRef = doc(db, "clients", clientId);
        
        // Delete Client from Firestore
        await deleteDoc(clientRef);
        
        console.log("Client deleted with ID:", clientId);
        
        // Refresh client list
        fetchClients();
      } catch (error) {
        console.error("Error deleting client:", error);
        setError("Failed to delete client. Please try again.");
      }
    }
  };
  
  return (
    <div className="clients-container">

      <div className="content-wrapper">
        <div className="page-header">
          <h1>Client Management</h1>
        </div>
        
        <div className="clients-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search clients by name or GST..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <button 
            className="btn-add-client"
            onClick={handleAddClient}
          >
            + Add New Client
          </button>
        </div>
        
        {/* Display error message if any */}
        {error && <div className="error-message">{error}</div>}
        
        {/* Loading state */}
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading clients...</p>
          </div>
        ) : (
          /* Client list */
          <div className="client-cards">
            {filteredClients.length > 0 ? (
              filteredClients.map(client => (
                <div key={client.id} className={`client-card client-type-${client.type}`}>
                  <div className="client-header">
                    <h3>{client.name}</h3>
                    <span className={`client-badge ${client.type}`}>
                      {client.type === 'central' ? 'Central Government' :
                       client.type === 'state' ? 'State Government' : 'Private'}
                    </span>
                  </div>
                  
                  <div className="client-details">
                    <p><strong>GST Number:</strong> {client.gstNumber}</p>
                    <p><strong>Contact Person:</strong> {client.contactPerson}</p>
                    <p><strong>Email:</strong> {client.email}</p>
                    <p><strong>Phone:</strong> {client.phone}</p>
                    <p><strong>Address:</strong> {client.address || 'Not provided'}</p>
                  </div>
                  
                  <div className="client-actions">
                    <button className="btn-edit" onClick={() => handleEditClient(client)}>Edit</button>
                    <button className="btn-delete" onClick={() => deleteClient(client.id, client.name)}>Remove</button>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-clients-message">
                {searchTerm ? 
                  "No clients match your search criteria." : 
                  "No clients exist. Add a new client to get started."}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientsPage;