import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../css/Navbar.css';
import { auth } from '../firebase';
import { useAuth } from '../App';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, userRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);
  
  // Track window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
    // Clear session storage
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('sessionStart');
    // Redirect will happen automatically due to the router setup
    window.location.href = '/';
  };
  
  // Close mobile menu when clicking a link
  const handleLinkClick = () => {
    if (window.innerWidth <= 768) {
      setMobileMenuOpen(false);
    }
  };
  
  if (!currentUser || userRole !== 'operator') {
    return null;
  }
  
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/upload" className="logo">
          Newspaper Management
        </Link>
        
        {/* Hamburger Menu Button */}
        <button 
          className="mobile-menu-button" 
          onClick={toggleMobileMenu}
          aria-label="Toggle navigation menu"
        >
          <div className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
        
        <div className={`nav-links ${mobileMenuOpen ? 'open' : ''}`}>
          <Link 
            to="/upload" 
            className={`nav-link ${location.pathname === '/upload' ? 'active' : ''}`}
            onClick={handleLinkClick}
          >
            Upload
          </Link>
          <Link 
            to="/archive" 
            className={`nav-link ${location.pathname === '/archive' ? 'active' : ''}`}
            onClick={handleLinkClick}
          >
            Newspaper Archive
          </Link>
          
          <div className="nav-user">
            {currentUser && (
              <button 
                onClick={handleLogout} 
                className="logout-button"
                title="Logout"
              >
                <span className="logout-icon">🚪</span>
                <span className="logout-text">Logout</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;