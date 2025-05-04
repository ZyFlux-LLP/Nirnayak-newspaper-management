import React, { useState, useEffect } from 'react';
import { db } from '../../firebase'; // Import Firestore from Firebase setup
import { collection, getDocs } from 'firebase/firestore';

const ClientList = ({ onClientSelect }) => {
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // 🔹 Fetch Clients from Firestore
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'clients'));
        const clientList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setClients(clientList);
      } catch (error) {
        console.error('❌ Error fetching clients:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  // 🔹 Filter clients based on search term
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="client-list-container">
      <div className="search-container">
        <input
          type="text"
          placeholder="Search clients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {loading ? (
        <p>Loading clients...</p>
      ) : (
        <div className="clients-grid">
          {filteredClients.length > 0 ? (
            filteredClients.map(client => (
              <div 
                key={client.id} 
                className={`client-card client-type-${client.type}`}
                onClick={() => onClientSelect(client)}
              >
                <h3>{client.name}</h3>
                <p className="client-type">
                  {client.type === 'central' ? 'Central Government' : 
                   client.type === 'state' ? 'State Government' : 'Private Company'}
                </p>
                <p className="client-gst">GST: {client.gstNumber}</p>
              </div>
            ))
          ) : (
            <p>No clients found.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ClientList;
