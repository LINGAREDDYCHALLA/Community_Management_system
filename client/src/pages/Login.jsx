import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:5000/login", formData);

      showToast(res.data.message, "success");

      localStorage.setItem("userEmail", res.data.email);
      localStorage.setItem("userRole", res.data.role);

      setTimeout(() => {
        if (res.data.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/");
        }
      }, 1000);
    } catch (error) {
      showToast(error.response?.data?.message || "Login Failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {toast && (
        <div className={`toast ${toast.type}`}>
          <span>{toast.type === "success" ? "✓" : "✕"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="login-box">
        <div className="login-logo">
          <div className="login-logo-icon">🏠</div>
        </div>
        
        <h2>Welcome Back</h2>
        <p className="login-subtitle">Sign in to access your account</p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? <div className="spinner"></div> : "Sign In"}
          </button>
        </form>

        <div className="login-footer">
          Don't have an account? <Link to="/register">Create one</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
