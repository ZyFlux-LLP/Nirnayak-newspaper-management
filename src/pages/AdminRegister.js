import React, { useState } from "react";
import { auth, db } from "../firebase"; 
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import "../css/Login.css";

const RegisterAdmin = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    adminCode: "" // Special code for admin registration
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    // Verify admin registration code - this is a simple example
    // In production, use a more secure method or backend verification
    if (formData.adminCode !== "ADMIN123") {
      setError("Invalid admin registration code");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setError("");
    setLoading(true);

    try {
      // Create user with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      
      // Store additional user data in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: "admin", // Set role as admin
        createdAt: new Date().toISOString()
      });

      // Redirect to admin login page after successful registration
      navigate("/admin/login");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("Email is already in use");
      } else {
        setError("Registration failed. Please try again.");
      }
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card admin-login">
        <div className="login-header">
          <h2>Newspaper Management</h2>
          <h3>Admin Registration</h3>
        </div>
        
        <div className="login-form">
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>First Name</label>
              <input 
                type="text" 
                name="firstName" 
                placeholder="Enter your first name" 
                value={formData.firstName} 
                onChange={handleChange} 
                required 
              />
            </div>

            <div className="form-group">
              <label>Last Name</label>
              <input 
                type="text" 
                name="lastName" 
                placeholder="Enter your last name" 
                value={formData.lastName} 
                onChange={handleChange} 
                required 
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input 
                type="email" 
                name="email" 
                placeholder="Enter your email" 
                value={formData.email} 
                onChange={handleChange} 
                required 
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                name="password" 
                placeholder="Create a password" 
                value={formData.password} 
                onChange={handleChange} 
                required 
              />
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <input 
                type="password" 
                name="confirmPassword" 
                placeholder="Confirm your password" 
                value={formData.confirmPassword} 
                onChange={handleChange} 
                required 
              />
            </div>

            <div className="form-group">
              <label>Admin Registration Code</label>
              <input 
                type="password" 
                name="adminCode" 
                placeholder="Enter admin code" 
                value={formData.adminCode} 
                onChange={handleChange} 
                required 
              />
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Registering..." : "Register"}
            </button>
          </form>
        </div>

        <div className="login-footer">
          <p>Already have an account? <Link to="/admin" className="operator-link">Login here</Link></p>
          <p>Are you an operator? <Link to="/register" className="admin-link">Register as operator</Link></p>
        </div>
      </div>
    </div>
  );
};

export default RegisterAdmin;