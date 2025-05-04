import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import AdminSidebar from '../components/Sidebar';
import '../css/clients.css'; // Reusing client styles

const EditOperatorPage = () => {
  const { operatorId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const operatorData = location.state?.operatorData;
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    active: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // If operator data was passed via location state, use it
    if (operatorData) {
      setFormData({
        firstName: operatorData.firstName || '',
        lastName: operatorData.lastName || '',
        email: operatorData.email || '',
        active: operatorData.active !== false // Default to true if not specified
      });
      setLoading(false);
      return;
    }
    
    // Otherwise fetch from Firestore
    const fetchOperator = async () => {
      try {
        const operatorRef = doc(db, "users", operatorId);
        const operatorSnap = await getDoc(operatorRef);
        
        if (operatorSnap.exists()) {
          const data = operatorSnap.data();
          setFormData({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.email || '',
            active: data.active !== false // Default to true if not specified
          });
        } else {
          setError("Operator not found.");
          console.error("No such operator!");
        }
      } catch (err) {
        setError("Error fetching operator details.");
        console.error("Error getting operator:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOperator();
  }, [operatorId, operatorData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const operatorRef = doc(db, "users", operatorId);
      
      // Update only the fields that need updating
      await updateDoc(operatorRef, {
        firstName: formData.firstName || '',
        lastName: formData.lastName || '',
        active: formData.active,
        updatedAt: new Date().toISOString()
      });
      
      setSuccess(true);
      
      // Redirect back to operators list after a short delay
      setTimeout(() => {
        navigate('/operators');
      }, 1500);
      
    } catch (err) {
      setError("Failed to update operator. Please try again.");
      console.error("Error updating operator:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/operators');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading operator details...</p>
      </div>
    );
  }

  return (
    <div className="clients-container">
      <AdminSidebar />
      
      <div className="content-wrapper">
        <div className="page-header">
          <h1>Edit Operator</h1>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">Operator updated successfully!</div>}
        
        <form onSubmit={handleSubmit} className="client-form">
          <div className="form-group">
            <label htmlFor="firstName">First Name</label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className="form-control"
              placeholder="Enter first name"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="lastName">Last Name</label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className="form-control"
              placeholder="Enter last name"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email (Cannot be changed)</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              className="form-control"
              disabled
            />
          </div>
          
         
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={handleCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditOperatorPage;