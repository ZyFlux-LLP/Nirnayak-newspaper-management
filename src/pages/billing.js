import React, { useState } from 'react';
import ClientList from '../components/billing/ClientList';
import AdForm from '../components/billing/AdForm';
import InvoiceGenerator from '../components/billing/InvoiceGenerator';
import '../css/Billing.css';

const BillingPage = () => {
  const [selectedClient, setSelectedClient] = useState(null);
  const [adDetails, setAdDetails] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);

  // Handle client selection
  const handleClientSelect = (client) => {
    setSelectedClient(client);
    setShowInvoice(false);
  };

  // Handle form submission
  const handleAdSubmit = (details) => {
    setAdDetails(details);
    setShowInvoice(true);
  };

  return (
    <div className="billing-container">
      <h1>Advertisement Billing System</h1>
      
      <div className="billing-workflow">
        {/* Step 1: Client Selection */}
        <section className="billing-section">
          <h2>1. Select Client</h2>
          <ClientList onClientSelect={handleClientSelect} />
        </section>

        {/* Step 2: Ad Details Form */}
        {selectedClient && (
          <section className="billing-section">
            <h2>2. Advertisement Details</h2>
            <AdForm 
              client={selectedClient} 
              onSubmit={handleAdSubmit} 
            />
          </section>
        )}

        {/* Step 3: Invoice Generation */}
        {showInvoice && adDetails && (
          <section className="billing-section">
            <h2>3. Invoice Preview</h2>
            <InvoiceGenerator 
              client={selectedClient} 
              adDetails={adDetails} 
            />
          </section>
        )}
      </div>
    </div>
  );
};

export default BillingPage;