import React from 'react';
import { Link } from 'react-router-dom';
import '../css/Home.css';

const Home = () => {
  return (
    <div className="home-container">
      <div className="home-content">
        <h1>Welcome to Newspaper Management System</h1>
        <p>
          Efficiently manage and upload newspaper pages for Ujjain and Indore editions.
          Our system helps operators handle unique and common pages seamlessly.
        </p>
        <div className="home-actions">
          <Link to="/dashboard" className="primary-button">Go to Dashboard</Link>
          <Link to="/upload" className="secondary-button">Upload Pages</Link>
        </div>
      </div>
    </div>
  );
};

export default Home;