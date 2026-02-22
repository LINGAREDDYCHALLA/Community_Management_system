import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    otp: ""
  });
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleChange = (e) => {
    if (e.target.name === "phone") {
      setOtpSent(false);
      setOtpVerified(false);
      setFormData((prev) => ({ ...prev, phone: e.target.value, otp: "" }));
      return;
    }

    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSendOtp = async () => {
    if (!/^\d{10}$/.test(formData.phone)) {
      showToast("Enter a valid 10-digit phone number", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/otp/send", {
        phone: formData.phone
      });
      setOtpSent(true);
      setOtpVerified(false);
      showToast(`${res.data.message}. Demo OTP: ${res.data.otp}`, "success");
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to send OTP", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!formData.otp.trim()) {
      showToast("Enter OTP first", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/otp/verify", {
        phone: formData.phone,
        otp: formData.otp
      });
      setOtpVerified(true);
      showToast(res.data.message, "success");
    } catch (error) {
      setOtpVerified(false);
      showToast(error.response?.data?.message || "OTP verification failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      showToast("Password and Confirm Password do not match", "error");
      return;
    }

    if (!otpVerified) {
      showToast("Please verify OTP before registering", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/register", {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password
      });

      showToast(res.data.message, "success");
      localStorage.setItem("userEmail", res.data.email);
      localStorage.setItem("userRole", res.data.role);
      
      setTimeout(() => navigate("/"), 1500);
    } catch (error) {
      showToast(error.response?.data?.message || "Registration failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {toast && (
        <div style={{
          ...styles.toast,
          borderLeft: `4px solid ${toast.type === 'success' ? '#10b981' : '#ef4444'}`
        }}>
          <span style={{ fontSize: '20px' }}>{toast.type === 'success' ? '✓' : '✕'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      <div style={styles.formCard}>
        <div style={styles.logoSection}>
          <div style={styles.logoIcon}>🏠</div>
          <h2 style={styles.title}>Create Account</h2>
          <p style={styles.subtitle}>Join our community today</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputRow}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Full Name</label>
              <input 
                name="name" 
                placeholder="John Doe" 
                onChange={handleChange} 
                style={styles.input} 
                required 
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address</label>
              <input 
                name="email" 
                type="email" 
                placeholder="john@example.com" 
                onChange={handleChange} 
                style={styles.input} 
                required 
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Phone Number</label>
            <div style={styles.inlineRow}>
              <input
                name="phone"
                type="tel"
                placeholder="10-digit mobile number"
                value={formData.phone}
                onChange={handleChange}
                style={{...styles.input, flex: 1}}
                required
                disabled={otpVerified}
              />
              <button 
                type="button" 
                style={{
                  ...styles.smallButton,
                  opacity: otpVerified ? 0.5 : 1,
                  cursor: otpVerified ? 'not-allowed' : 'pointer'
                }} 
                onClick={handleSendOtp}
                disabled={otpVerified || loading}
              >
                {loading ? '...' : 'Get OTP'}
              </button>
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>OTP Verification</label>
            <div style={styles.inlineRow}>
              <input
                name="otp"
                placeholder="Enter OTP"
                value={formData.otp}
                onChange={handleChange}
                style={{...styles.input, flex: 1}}
                required
                disabled={otpVerified}
              />
              <button 
                type="button" 
                style={{
                  ...styles.smallButton,
                  backgroundColor: otpVerified ? '#10b981' : '#0f172a',
                  opacity: !otpSent ? 0.5 : 1,
                  cursor: !otpSent || otpVerified ? 'not-allowed' : 'pointer'
                }} 
                onClick={handleVerifyOtp}
                disabled={!otpSent || otpVerified || loading}
              >
                {otpVerified ? '✓ Verified' : 'Verify'}
              </button>
            </div>
            {otpVerified && (
              <span style={styles.verifiedText}>
                ✓ OTP Verified successfully
              </span>
            )}
          </div>

          <div style={styles.inputRow}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <input 
                name="password" 
                type="password" 
                placeholder="Create password" 
                onChange={handleChange} 
                style={styles.input} 
                required 
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Confirm Password</label>
              <input 
                name="confirmPassword" 
                type="password" 
                placeholder="Confirm password" 
                onChange={handleChange} 
                style={styles.input} 
                required 
              />
            </div>
          </div>

          <button 
            type="submit" 
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1
            }}
            disabled={loading}
          >
            {loading ? (
              <span style={styles.spinner}></span>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div style={styles.footer}>
          <p>Already have an account? <Link to="/login" style={styles.link}>Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    width: "100%",
    background: `
      radial-gradient(ellipse at 20% 20%, rgba(37, 99, 235, 0.15) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 80%, rgba(245, 158, 11, 0.1) 0%, transparent 50%),
      linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)
    `,
    fontFamily: "'Inter', sans-serif",
    padding: "40px 20px",
    position: "relative"
  },
  toast: {
    position: "fixed",
    top: "20px",
    right: "20px",
    padding: "16px 24px",
    background: "white",
    borderRadius: "12px",
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    zIndex: "1000",
    animation: "slideInRight 0.3s ease-out",
    fontWeight: "600",
    color: "#1e293b"
  },
  formCard: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    backdropFilter: "blur(20px)",
    padding: "48px",
    borderRadius: "32px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
    width: "100%",
    maxWidth: "600px",
    border: "1px solid rgba(255,255,255,0.1)",
    position: "relative"
  },
  logoSection: {
    textAlign: "center",
    marginBottom: "32px"
  },
  logoIcon: {
    width: "72px",
    height: "72px",
    background: "linear-gradient(135deg, #2563eb, #f59e0b)",
    borderRadius: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
    fontSize: "32px",
    boxShadow: "0 8px 30px rgba(37, 99, 235, 0.4)"
  },
  title: {
    textAlign: "center",
    marginBottom: "8px",
    color: "white",
    fontSize: "28px",
    fontWeight: "800",
    letterSpacing: "-0.5px"
  },
  subtitle: {
    textAlign: "center",
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: "14px"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px"
  },
  inputRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px"
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.7)",
    marginLeft: "4px",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  inlineRow: {
    display: "flex",
    gap: "12px"
  },
  input: {
    width: "100%",
    padding: "16px 20px",
    borderRadius: "14px",
    border: "2px solid rgba(255, 255, 255, 0.1)",
    fontSize: "15px",
    outline: "none",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    color: "white",
    transition: "all 0.3s ease",
    fontFamily: "'Inter', sans-serif"
  },
  smallButton: {
    minWidth: "100px",
    border: "none",
    borderRadius: "12px",
    backgroundColor: "#0f172a",
    color: "white",
    fontWeight: "700",
    cursor: "pointer",
    padding: "0 16px",
    fontSize: "14px",
    transition: "all 0.3s ease",
    whiteSpace: "nowrap"
  },
  verifiedText: {
    color: "#10b981",
    fontWeight: "700",
    fontSize: "13px",
    marginTop: "4px"
  },
  button: {
    padding: "18px",
    background: "linear-gradient(135deg, #2563eb, #1e40af)",
    color: "white",
    border: "none",
    borderRadius: "14px",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.3s",
    marginTop: "12px",
    boxShadow: "0 4px 20px rgba(37, 99, 235, 0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  spinner: {
    width: "20px",
    height: "20px",
    border: "2px solid rgba(255, 255, 255, 0.3)",
    borderTopColor: "white",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite"
  },
  footer: {
    textAlign: "center",
    marginTop: "28px",
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: "14px"
  },
  link: {
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: "600"
  }
};

export default Register;
