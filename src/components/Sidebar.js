import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../css/AdminSidebar.css';
import { auth } from '../firebase';

const AdminSidebar = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    setCollapsed(true);
    document.body.classList.remove('sidebar-collapsed');
  }, []);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const toggleMobileSidebar = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const handleOverlayClick = () => {
    setIsMobileOpen(false);
  };

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      sessionStorage.clear();
      window.location.href = '/admin';
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const menuItems = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/clients', icon: '👥', label: 'Clients' },
    { path: '/gst-records', icon: '📰', label: 'GST Records' },
    { path: '/adminBilling', icon: '🗂️', label: 'Billing' },
    { path: '/letterhead', icon: '📝', label: 'Letter Head' },
    { path: '/operators', icon: '👨‍💻', label: 'Operators' },
    { path: '/rate-cards', icon: '📰', label: 'Rate Cards' },
    { path: '/archiveAdmin', icon: '📂', label: 'Newspaper Archive' }
  ];

  return (
    <>
      {/* Admin Sidebar Toggle Button - renamed from mobile-menu-button */}
      <button 
        className="admin-sidebar-toggle"
        onClick={toggleMobileSidebar}
        aria-label="Toggle Menu"
      >
        {isMobileOpen ? '✕' : '☰'}
      </button>

      {/* Mobile Overlay */}
      <div 
        className={`mobile-overlay ${isMobileOpen ? 'active' : ''}`}
        onClick={handleOverlayClick}
      />

      <div className={`admin-sidebar ${collapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">
            {!collapsed ? 'Newspaper Admin' : 'NA'}
          </h2>
          <button className="toggle-button" onClick={toggleSidebar}>
            {collapsed ? '❯' : '❮'}
          </button>
        </div>
        
        <div className="admin-profile">
          {!collapsed && (
            <>
              <div className="admin-avatar">A</div>
              <div className="admin-info">
                <p>Administrator</p>
              </div>
            </>
          )}
          {collapsed && <div className="admin-avatar small">A</div>}
        </div>
        
        <nav className="sidebar-nav">
          <ul>
            {menuItems.map((item) => (
              <li key={item.path} className={location.pathname === item.path ? 'active' : ''}>
                <Link to={item.path}>
                  <span className="menu-icon">{item.icon}</span>
                  {!collapsed && <span className="menu-label">{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        
        <div className="sidebar-footer">
          <button 
            onClick={handleLogout} 
            className="logout-button"
            title="Logout"
          >
            <span className="logout-icon">🚪</span>
            {!collapsed && <span className="logout-text">Logout</span>}
          </button>
        </div>
      </div>
    </>
  );
};

export default AdminSidebar;