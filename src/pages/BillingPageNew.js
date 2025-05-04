import React, { useState } from 'react';
import LetterheadNotepad from '../components/LetterheadNotepad';
import '../styles/BillingPage.css';

const BillingPage = () => {
  const [activeTab, setActiveTab] = useState('billingForm');
  const [companyInfo, setCompanyInfo] = useState({
    name: 'Newspaper Management Co.',
    address: '123 Media Street, Publishing District, City - 123456',
    contact: 'Phone: (123) 456-7890 | Email: contact@newspaper-mgmt.com',
    logo: '/images/company-logo.png' // You need to add this logo to your public/images folder
  });

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const updateCompanyInfo = (e) => {
    const { name, value } = e.target;
    setCompanyInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="billing-page">
      <div className="page-header">
        <h1>Billing Management</h1>
        <p>Create invoices, manage payments, and generate official documents</p>
      </div>

      <div className="billing-tabs">
        <button 
          className={`tab-button ${activeTab === 'billingForm' ? 'active' : ''}`}
          onClick={() => handleTabChange('billingForm')}
        >
          Invoice Generator
        </button>
        <button 
          className={`tab-button ${activeTab === 'letterhead' ? 'active' : ''}`}
          onClick={() => handleTabChange('letterhead')}
        >
          Letterhead Notepad
        </button>
        <button 
          className={`tab-button ${activeTab === 'paymentHistory' ? 'active' : ''}`}
          onClick={() => handleTabChange('paymentHistory')}
        >
          Payment History
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'billingForm' && (
          <div className="billing-form-container">
            {/* Your existing billing form content */}
            <p>Invoice generator form content will go here</p>
          </div>
        )}
        
        {activeTab === 'letterhead' && (
          <div className="letterhead-container">
            <div className="company-settings">
              <h3>Company Information for Letterhead</h3>
              <div className="company-form">
                <div className="form-group">
                  <label>Company Name:</label>
                  <input 
                    type="text" 
                    name="name" 
                    value={companyInfo.name} 
                    onChange={updateCompanyInfo} 
                  />
                </div>
                <div className="form-group">
                  <label>Company Address:</label>
                  <input 
                    type="text" 
                    name="address" 
                    value={companyInfo.address} 
                    onChange={updateCompanyInfo} 
                  />
                </div>
                <div className="form-group">
                  <label>Contact Information:</label>
                  <input 
                    type="text" 
                    name="contact" 
                    value={companyInfo.contact} 
                    onChange={updateCompanyInfo} 
                  />
                </div>
                {/* In a real app, you would add logo upload functionality here */}
              </div>
            </div>
            
            <LetterheadNotepad 
              companyLogo={companyInfo.logo}
              companyName={companyInfo.name}
              companyAddress={companyInfo.address}
              companyContact={companyInfo.contact}
            />
          </div>
        )}
        
        {activeTab === 'paymentHistory' && (
          <div className="payment-history-container">
            {/* Payment history content */}
            <p>Payment history content will go here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingPage;