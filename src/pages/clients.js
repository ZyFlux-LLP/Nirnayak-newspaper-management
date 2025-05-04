import React, { useState, useEffect } from 'react';
import '../css/ClientsPage.css'; // Ensure you have the correct CSS file
import { db } from "../firebase";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    type: 'private',
    gstNumber: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: ''
  });
  const [editClient, setEditClient] = useState({
    id: '',
    name: '',
    type: '',
    gstNumber: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setIsLoading(true);
    const querySnapshot = await getDocs(collection(db, 'clients'));
    const clientData = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));
    setClients(clientData);
    setIsLoading(false);
  };

  const handleInputChange = (e) => {
    setNewClient({ ...newClient, [e.target.name]: e.target.value });
  };

  const handleEditInputChange = (e) => {
    setEditClient({ ...editClient, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const docRef = await addDoc(collection(db, 'clients'), {
      name: newClient.name,
      type: newClient.type,
      gstNumber: newClient.gstNumber,
      contactPerson: newClient.contactPerson,
      email: newClient.email,
      phone: newClient.phone,
      address: newClient.address,
      createdAt: new Date().toISOString()
    });
    console.log("Client added with ID:", docRef.id);
    resetNewClientForm();
    fetchClients();
  };

  const updateClient = async (e) => {
    e.preventDefault();
    const docRef = doc(db, 'clients', editClient.id);
    await updateDoc(docRef, {
      name: editClient.name,
      type: editClient.type,
      gstNumber: editClient.gstNumber,
      contactPerson: editClient.contactPerson,
      email: editClient.email,
      phone: editClient.phone,
      address: editClient.address
    });
    setShowEditForm(false);
    fetchClients();
  };

  const handleEditClient = (client) => {
    setEditClient(client);
    setShowEditForm(true);
  };

  const deleteClient = async (id) => {
    await deleteDoc(doc(db, 'clients', id));
    fetchClients();
  };

  const resetNewClientForm = () => {
    setNewClient({
      name: '',
      type: 'private',
      gstNumber: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: ''
    });
    setShowAddForm(false);
  };

  return (
    <div className="clients-container">
      <h2>Clients</h2>
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search clients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="clients-list">
          {clients.filter((client) =>
            client.name.toLowerCase().includes(searchTerm.toLowerCase())
          ).map((client) => (
            <div key={client.id} className="client-item">
              <div className="client-info">
                <h3>{client.name}</h3>
                <p>{client.type}</p>
                <p>{client.gstNumber}</p>
                <p>{client.contactPerson}</p>
                <p>{client.email}</p>
                <p>{client.phone}</p>
                <p>{client.address}</p>
              </div>
              <div className="client-actions">
                <button onClick={() => handleEditClient(client)}>Edit</button>
                <button onClick={() => deleteClient(client.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <button onClick={() => setShowAddForm(true)}>Add Client</button>

      {/* Add client form modal */}
      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Add New Client</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Client Name:</label>
                <input
                  type="text"
                  name="name"
                  value={newClient.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Client Type:</label>
                <select
                  name="type"
                  value={newClient.type}
                  onChange={handleInputChange}
                >
                  <option value="private">Private</option>
                  <option value="corporate">Corporate</option>
                </select>
              </div>
              <div className="form-group">
                <label>GST Number:</label>
                <input
                  type="text"
                  name="gstNumber"
                  value={newClient.gstNumber}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Contact Person:</label>
                <input
                  type="text"
                  name="contactPerson"
                  value={newClient.contactPerson}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  name="email"
                  value={newClient.email}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Phone:</label>
                <input
                  type="tel"
                  name="phone"
                  value={newClient.phone}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Address:</label>
                <textarea
                  name="address"
                  value={newClient.address}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={resetNewClientForm} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Add Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit client form modal */}
      {showEditForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Edit Client</h2>
            <form onSubmit={updateClient}>
              <div className="form-group">
                <label>Client Name:</label>
                <input
                  type="text"
                  name="name"
                  value={editClient.name}
                  onChange={handleEditInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Client Type:</label>
                <select
                  name="type"
                  value={editClient.type}
                  onChange={handleEditInputChange}
                >
                  <option value="private">Private</option>
                  <option value="corporate">Corporate</option>
                </select>
              </div>
              <div className="form-group">
                <label>GST Number:</label>
                <input
                  type="text"
                  name="gstNumber"
                  value={editClient.gstNumber}
                  onChange={handleEditInputChange}
                />
              </div>
              <div className="form-group">
                <label>Contact Person:</label>
                <input
                  type="text"
                  name="contactPerson"
                  value={editClient.contactPerson}
                  onChange={handleEditInputChange}
                />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  name="email"
                  value={editClient.email}
                  onChange={handleEditInputChange}
                />
              </div>
              <div className="form-group">
                <label>Phone:</label>
                <input
                  type="tel"
                  name="phone"
                  value={editClient.phone}
                  onChange={handleEditInputChange}
                />
              </div>
              <div className="form-group">
                <label>Address:</label>
                <textarea
                  name="address"
                  value={editClient.address}
                  onChange={handleEditInputChange}
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowEditForm(false)} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Update Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
