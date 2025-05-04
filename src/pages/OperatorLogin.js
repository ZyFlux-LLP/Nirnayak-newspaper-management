import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase"; // Firebase Authentication
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../App"; // Import auth context
import "../css/Login.css"; // Import the CSS file

const OperatorLogin = () => {
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userRole } = useAuth();
  
  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      if (userRole === "operator") {
        navigate("/upload");
      } else if (userRole === "admin") {
        navigate("/dashboard");
      }
    }
  }, [currentUser, userRole, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Attempt to sign in
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        credentials.email, 
        credentials.password
      );
      
      // Check user role in Firestore
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        if (userData.role === "operator") {
          // Set session persistence based on "Remember Me"
          if (rememberMe) {
            // Session will persist until explicitly signed out
            // Firebase default behavior is already persistent
          } else {
            // Session will only last until browser is closed
            // We'll handle this with our session timeout logic
            localStorage.setItem("sessionType", "temporary");
          }
          
          // Redirect operators to upload page
          const from = location.state?.from?.pathname || "/upload";
          navigate(from);
        } else {
          // Wrong role
          setError("This account is not registered as an operator. Please use the correct login page.");
          await auth.signOut(); // Sign out the user
        }
      } else {
        // User document doesn't exist
        setError("User profile incomplete. Please contact support.");
        await auth.signOut(); // Sign out the user
      }
    } catch (err) {
      // Handle different error codes
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("Invalid email or password.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many failed login attempts. Please try again later.");
      } else {
        setError("Login failed. Please try again.");
        console.error(err);
      }
    }

    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card operator-login">
        <div className="login-header">
          <h2>Operator Login</h2>
          <h3>Access your account</h3>
        </div>
        
        <div className="login-form">
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input 
                type="email" 
                name="email" 
                placeholder="Enter your email" 
                value={credentials.email} 
                onChange={handleChange} 
                required 
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                name="password" 
                placeholder="Enter your password" 
                value={credentials.password} 
                onChange={handleChange} 
                required 
              />
            </div>
{/* 
            <div className="remember-forgot">
              <Link to="/forgot-password" className="forgot-password">Forgot password?</Link>
            </div> */}

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>

        <div className="login-footer">
          <p>Are you an admin? <Link to="/admin" className="admin-link">Login here</Link></p>
        </div>
      </div>
    </div>
  );
};

export default OperatorLogin;