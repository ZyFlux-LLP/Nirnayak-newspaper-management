import React, { useState } from "react";
import { auth, db } from "../firebase"; 
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import "../css/Login.css";

const RegisterOperator = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    operatorCode: "" // Added operator code field
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
    // Verify operator registration code
    if (formData.operatorCode !== "OPERATOR123") {
      setError("Invalid operator registration code");
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
        role: "operator", // Set role as operator
        createdAt: new Date().toISOString()
      });

      // Redirect to login page after successful registration
      navigate("/login");
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
      <div className="login-card operator-login">
        <div className="login-header">
          <h2>Add An Operator</h2>
          <h3>Create an account</h3>
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
              <label>Operator Registration Code</label>
              <input 
                type="password" 
                name="operatorCode" 
                placeholder="Enter operator code" 
                value={formData.operatorCode} 
                onChange={handleChange} 
                required 
              />
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Registering..." : "Register"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default RegisterOperator;