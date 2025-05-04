import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/clients.css'; // We can reuse the client styles or create new ones
import AdminSidebar from '../components/Sidebar';
import { db } from "../firebase";
import { collection, getDocs, doc, deleteDoc, query, where } from "firebase/firestore";

const OperatorsPage = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [operators, setOperators] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Fetch operators from Firestore (users collection with role = operator)
  useEffect(() => {
    fetchOperators();
  }, []);
  
  const fetchOperators = async () => {
    try {
      setIsLoading(true);
      const usersCollection = collection(db, "users");
      const operatorQuery = query(usersCollection, where("role", "==", "operator"));
      const operatorSnapshot = await getDocs(operatorQuery);
      const operatorsList = operatorSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOperators(operatorsList);
      setError(null);
    } catch (err) {
      console.error("Error fetching operators:", err);
      setError("Failed to load operators. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter operators based on search term
  const filteredOperators = operators.filter(operator => {
    const fullName = `${operator.firstName || ''} ${operator.lastName || ''}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) || 
           operator.email?.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  // Navigate to add operator page
  const handleAddOperator = () => {
    navigate('/register'); // Using the existing operator registration page
  };
  
  // Navigate to edit operator page
  const handleEditOperator = (operator) => {
    navigate(`/operators/edit/${operator.id}`, { state: { operatorData: operator } });
  };
  
  // Delete operator from Firestore
  const deleteOperator = async (operatorId, firstName, lastName) => {
    const fullName = `${firstName || ''} ${lastName || ''}`.trim() || operatorId;
    // Show confirmation dialog
    if (window.confirm(`Do you want to delete the operator "${fullName}"?`)) {
      try {
        setError(null);
        const operatorRef = doc(db, "users", operatorId);
        
        // Delete Operator from Firestore
        await deleteDoc(operatorRef);
        
        console.log("Operator deleted with ID:", operatorId);
        
        // Refresh operator list
        fetchOperators();
      } catch (error) {
        console.error("Error deleting operator:", error);
        setError("Failed to delete operator. Please try again.");
      }
    }
  };
  
  // Format the date string
  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return date.toLocaleDateString();
    } catch (error) {
      console.error("Error formatting date:", error);
      return 'Invalid date';
    }
  };
  
  return (
    <div className="clients-container">

      <div className="content-wrapper">
        <div className="page-header">
          <h1>Operator Management</h1>
        </div>
        
        <div className="clients-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search operators by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <button 
            className="btn-add-client"
            onClick={handleAddOperator}
          >
            + Add New Operator
          </button>
        </div>
        
        {/* Display error message if any */}
        {error && <div className="error-message">{error}</div>}
        
        {/* Loading state */}
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading operators...</p>
          </div>
        ) : (
          /* Operator list */
          <div className="client-cards">
            {filteredOperators.length > 0 ? (
              filteredOperators.map(operator => (
                <div key={operator.id} className="client-card">
                  <div className="client-header">
                    <h3>{`${operator.firstName || ''} ${operator.lastName || ''}`.trim() || 'Unnamed Operator'}</h3>
                    <span className="client-badge operator">
                      Operator
                    </span>
                  </div>
                  
                  <div className="client-details">
                    <p><strong>Email:</strong> {operator.email || 'Not provided'}</p>
                    <p><strong>First Name:</strong> {operator.firstName || 'Not provided'}</p>
                    <p><strong>Last Name:</strong> {operator.lastName || 'Not provided'}</p>
                    <p><strong>Created:</strong> {formatDate(operator.createdAt)}</p>
                  </div>
                  
                  <div className="client-actions">
                    <button className="btn-edit" onClick={() => handleEditOperator(operator)}>Edit</button>
                    <button className="btn-delete" onClick={() => deleteOperator(operator.id, operator.firstName, operator.lastName)}>Remove</button>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-clients-message">
                {searchTerm ? 
                  "No operators match your search criteria." : 
                  "No operators exist. Add a new operator to get started."}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OperatorsPage;