import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import OperatorLogin from './pages/OperatorLogin';
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import RateCardsPage from './pages/RateCardsPage'; 
import UploadPage from './pages/UploadPage';
import BillingPage from './pages/BillingPage';
import ClientsPage from './pages/ClientPage';
import GSTRecordsPage from './pages/GSTRecordsPage';
import ArchivePage from './pages/ArchivePage';
import AddClientPage from './pages/addPage';
import EditClientPage from './pages/editPage';
import PageReview from './pages/PageReview';
import './App.css';
import OperatorRegister from "./pages/OperatorRegister";
import AdminRegister from './pages/AdminRegister';
import LetterheadNotepad from './pages/CustomLetterHead';
import AdminSidebar from './components/Sidebar';
import OperatorsPage from './pages/OperatorsPage';
import EditOperatorPage from './pages/EditOperatorPage';

// Authentication context
export const AuthContext = React.createContext();

export const useAuth = () => {
  return React.useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const sessionTimeoutMinutes = 15; // 15 minutes timeout

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch user role from Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Set up activity tracking
  useEffect(() => {
    const resetTimeout = () => {
      setLastActivity(Date.now());
    };

    // Track user activity
    window.addEventListener('click', resetTimeout);
    window.addEventListener('keypress', resetTimeout);
    window.addEventListener('scroll', resetTimeout);
    window.addEventListener('mousemove', resetTimeout);

    // Check for timeout every minute
    const intervalId = setInterval(() => {
      const now = Date.now();
      const timeElapsed = now - lastActivity;

      if (currentUser && timeElapsed > sessionTimeoutMinutes * 60 * 1000) {
        logout();
        alert('Your session has expired due to inactivity. Please log in again.');
      }
    }, 60000); // Check every minute

    return () => {
      window.removeEventListener('click', resetTimeout);
      window.removeEventListener('keypress', resetTimeout);
      window.removeEventListener('scroll', resetTimeout);
      window.removeEventListener('mousemove', resetTimeout);
      clearInterval(intervalId);
    };
  }, [currentUser, lastActivity]);

  const logout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const value = {
    currentUser,
    userRole,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Protected Route component
const ProtectedRoute = ({ element, requiredRole }) => {
  const { currentUser, userRole } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    // Redirect to appropriate dashboard based on role
    if (userRole === 'admin') {
      return <Navigate to="/dashboard" replace />;
    } else if (userRole === 'operator') {
      return <Navigate to="/upload" replace />;
    } else {
      return <Navigate to="/login" replace />;
    }
  }

  return element;
};

function AppLayout() {
  const location = useLocation();
  const { currentUser, userRole } = useAuth();

  // Define where Navbar should be shown (Operator Pages)
  const operatorRoutes = ['/upload', '/archive'];

  // Define where Sidebar should be shown (Admin Pages)
  const adminRoutes = ['/dashboard', '/gst-records', '/clients', '/adminBilling', '/letterhead', '/archiveAdmin', '/register', '/operators', '/operators/edit', '/rate-cards'];

  const isOperatorPage = operatorRoutes.includes(location.pathname);
  const isAdminPage = adminRoutes.includes(location.pathname);

  // Only show sidebar when user is logged in and on admin pages
  const showSidebar = currentUser && isAdminPage && userRole === 'admin';

  // Only show navbar when user is logged in and on operator pages
  const showNavbar = currentUser && isOperatorPage && userRole === 'operator';

  return (
    <div className="app">
      {/* Only render the sidebar when needed */}
      {showSidebar && <AdminSidebar />}

      <div className={`content ${showSidebar ? 'with-sidebar' : ''}`}>
        {/* Only render the navbar when needed */}
        {showNavbar && <Navbar />}

        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<OperatorLogin />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/register" element={<AdminRegister />} />

          {/* Protected operator routes */}
          <Route path="/upload" element={<ProtectedRoute element={<UploadPage />} requiredRole="operator" />} />
          <Route path="/archive" element={<ProtectedRoute element={<ArchivePage />} requiredRole="operator" />} />

          {/* Protected admin routes */}
          <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} requiredRole="admin" />} />
          <Route path="/gst-records" element={<ProtectedRoute element={<GSTRecordsPage />} requiredRole="admin" />} />
          <Route path="/clients" element={<ProtectedRoute element={<ClientsPage />} requiredRole="admin" />} />
          <Route path="/clients/add" element={<AddClientPage />} />
          <Route path="/clients/edit/:clientId" element={<EditClientPage />} />
          <Route path="/review/:pageId" element={<PageReview />} />
          <Route path="/adminBilling" element={<ProtectedRoute element={<BillingPage />} requiredRole="admin" />} />
          <Route path="/letterhead" element={<ProtectedRoute element={<LetterheadNotepad />} requiredRole="admin" />} />
          <Route path="/archiveAdmin" element={<ProtectedRoute element={<ArchivePage />} requiredRole="admin" />} />
          <Route path="/operators" element={<ProtectedRoute element={<OperatorsPage />} requiredRole="admin" />} />
          <Route path="/operators/edit/:operatorId" element={<ProtectedRoute element={<EditOperatorPage />} requiredRole="admin" />} />
          <Route path="/rate-cards" element={<ProtectedRoute element={<RateCardsPage />} requiredRole="admin" />} />
          
          <Route path="/register" element={<OperatorRegister />} />

          {/* Default route redirects based on role if logged in, otherwise to login */}
          <Route path="/" element={
            currentUser ?
              (userRole === 'admin' ? <Navigate to="/dashboard" /> : <Navigate to="/upload" />)
              : <Navigate to="/login" />
          } />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </Router>
  );
}

export default App;