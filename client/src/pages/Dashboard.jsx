import { useEffect, useState } from "react";
import axios from "axios";

function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [complementForm, setComplementForm] = useState({
    message: ""
  });
  const [complements, setComplements] = useState([]);
  const [toast, setToast] = useState(null);
  const [showPendingPopup, setShowPendingPopup] = useState(false);
  
  // Payment method states for pending payments
  const [showPaymentMethodPopup, setShowPaymentMethodPopup] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState(null);
  
  // Payment details states
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCVV, setCardCVV] = useState("");
  const [cardName, setCardName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [selectedWallet, setSelectedWallet] = useState("");

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchComplements = async (email) => {
    try {
      const res = await axios.get(`http://localhost:5000/user/complements/${email}`);
      setComplements(res.data || []);
    } catch (error) {
      console.error("Complement fetch error:", error);
    }
  };

  useEffect(() => {
    const email = localStorage.getItem("userEmail");
    if (email) {
      axios.get(`http://localhost:5000/user/profile/${email}`)
        .then((res) => {
          setProfile(res.data);
          fetchComplements(email);
          
          // Check if there's a pending payment popup
          const showPending = localStorage.getItem("showPendingPayment");
          if (showPending === "true" && res.data.paymentStatus === "Pending") {
            setShowPendingPopup(true);
            localStorage.removeItem("showPendingPayment");
          }
          
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const handleComplementSubmit = async (e) => {
    e.preventDefault();

    if (!profile?.email || !complementForm.message.trim()) {
      showToast("Please write your complement message.", "error");
      return;
    }

    try {
      const res = await axios.post("http://localhost:5000/user/complement", {
        email: profile.email,
        name: profile.name,
        message: complementForm.message
      });

      showToast(res.data.message, "success");
      setComplementForm({ message: "" });
      fetchComplements(profile.email);
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to submit complement", "error");
    }
  };

  const handlePayNowClick = () => {
    setShowPendingPopup(false);
    setShowPaymentMethodPopup(true);
    setSelectedPaymentMethod("");
    // Reset payment details
    setCardNumber("");
    setCardExpiry("");
    setCardCVV("");
    setCardName("");
    setUpiId("");
    setSelectedBank("");
    setSelectedWallet("");
  };

  const validatePaymentDetails = () => {
    if (selectedPaymentMethod === "credit_card" || selectedPaymentMethod === "debit_card") {
      if (!cardNumber || cardNumber.length < 12) {
        showToast("Please enter a valid card number", "error");
        return false;
      }
      if (!cardExpiry || cardExpiry.length < 4) {
        showToast("Please enter valid expiry date", "error");
        return false;
      }
      if (!cardCVV || cardCVV.length < 3) {
        showToast("Please enter valid CVV", "error");
        return false;
      }
      if (!cardName) {
        showToast("Please enter cardholder name", "error");
        return false;
      }
    } else if (selectedPaymentMethod === "upi") {
      if (!upiId || !upiId.includes("@")) {
        showToast("Please enter a valid UPI ID", "error");
        return false;
      }
    } else if (selectedPaymentMethod === "net_banking") {
      if (!selectedBank) {
        showToast("Please select a bank", "error");
        return false;
      }
    } else if (selectedPaymentMethod === "wallets") {
      if (!selectedWallet) {
        showToast("Please select a wallet", "error");
        return false;
      }
    }
    return true;
  };

  const handlePayNow = async () => {
    if (!selectedPaymentMethod) {
      showToast("Please select a payment method", "error");
      return;
    }

    // Validate payment details
    if (!validatePaymentDetails()) {
      return;
    }

    setIsProcessingPayment(true);
    setPaymentSuccess(false);

    // Simulate payment processing
    setTimeout(async () => {
      try {
        const amount = profile.roomType === "Single" ? 500 : 
                      profile.roomType === "Double" ? 800 : 
                      profile.roomType === "Deluxe" ? 1200 : 2500;

        const res = await axios.post("http://localhost:5000/user/process-payment", {
          email: profile.email,
          roomType: profile.roomType,
          roomNumber: profile.roomNumber,
          paymentMethod: selectedPaymentMethod,
          amount: amount
        });

        if (res.data.success) {
          setPaymentSuccess(true);
          setTransactionDetails(res.data);
          setIsProcessingPayment(false);
        }
      } catch (error) {
        setIsProcessingPayment(false);
        setShowPaymentMethodPopup(false);
        showToast(error.response?.data?.message || "Payment failed. Please try again.", "error");
      }
    }, 2500);
  };

  const handlePaymentComplete = () => {
    setShowPaymentMethodPopup(false);
    setPaymentSuccess(false);
    setTransactionDetails(null);
    showToast("Payment successful!", "success");
    
    // Refresh profile
    axios.get(`http://localhost:5000/user/profile/${profile.email}`)
      .then((res) => setProfile(res.data))
      .catch((err) => console.error(err));
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : value;
  };

  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const getPaymentAmount = () => {
    return profile.roomType === "Single" ? 500 : 
           profile.roomType === "Double" ? 800 : 
           profile.roomType === "Deluxe" ? 1200 : 2500;
  };

  const banks = [
    { id: "sbi", name: "State Bank of India" },
    { id: "hdfc", name: "HDFC Bank" },
    { id: "icici", name: "ICICI Bank" },
    { id: "axis", name: "Axis Bank" },
    { id: "kotak", name: "Kotak Bank" },
    { id: "pnb", name: "Punjab National Bank" }
  ];

  const wallets = [
    { id: "paytm", name: "Paytm" },
    { id: "phonepe", name: "PhonePe" },
    { id: "amazon", name: "Amazon Pay" },
    { id: "mobikwik", name: "MobiKwik" }
  ];

  if (loading) return (
    <div style={styles.loaderContainer}>
      <div style={styles.spinner}></div>
      <p>Loading your profile...</p>
    </div>
  );

  if (!profile) return (
    <div style={styles.notLoggedIn}>
      <div style={styles.lockIcon}>🔒</div>
      <h2>Please log in to view your dashboard.</h2>
      <p>Access your bookings, payments, and more by signing in.</p>
    </div>
  );

  return (
    <div style={styles.container}>
      {/* Pending Payment Popup */}
      {showPendingPopup && (
        <div style={styles.popupOverlay}>
          <div style={styles.popupCard}>
            <div style={styles.popupIcon}>⚠️</div>
            <h2 style={styles.popupTitle}>Payment Pending!</h2>
            <p style={styles.popupText}>
              Your room booking is confirmed but payment is still pending. 
              Please complete your payment at the reception or pay now to finalize your booking.
            </p>
            <div style={styles.popupDetails}>
              <div style={styles.popupDetailRow}>
                <span>Room:</span>
                <span>{profile.roomType} - Room {profile.roomNumber}</span>
              </div>
              <div style={styles.popupDetailRow}>
                <span>Amount:</span>
                <span>
                  {profile.roomType === "Single" ? "$500" : 
                   profile.roomType === "Double" ? "$800" : 
                   profile.roomType === "Deluxe" ? "$1200" : "$2500"}/month
                </span>
              </div>
            </div>
            <div style={styles.popupButtons}>
              <button 
                style={styles.popupPayButton}
                onClick={handlePayNowClick}
              >
                💳 Pay Now
              </button>
              <button 
                style={styles.popupCloseButton}
                onClick={() => setShowPendingPopup(false)}
              >
                Pay at Reception Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Selection Popup */}
      {showPaymentMethodPopup && (
        <div style={styles.popupOverlay}>
          <div style={styles.paymentPopupCard}>
            {!paymentSuccess ? (
              <>
                <h2 style={styles.popupTitle}>Select Payment Method</h2>
                <p style={styles.popupText}>Choose how you want to pay</p>
                
                <div style={styles.paymentMethodsGrid}>
                  <div 
                    style={{
                      ...styles.paymentMethodOption,
                      borderColor: selectedPaymentMethod === "credit_card" ? '#2563eb' : '#e2e8f0',
                      backgroundColor: selectedPaymentMethod === "credit_card" ? '#eff6ff' : 'white'
                    }}
                    onClick={() => setSelectedPaymentMethod("credit_card")}
                  >
                    <span style={styles.paymentMethodIcon}>💳</span>
                    <span style={styles.paymentMethodTitle}>Credit Card</span>
                  </div>
                  
                  <div 
                    style={{
                      ...styles.paymentMethodOption,
                      borderColor: selectedPaymentMethod === "debit_card" ? '#2563eb' : '#e2e8f0',
                      backgroundColor: selectedPaymentMethod === "debit_card" ? '#eff6ff' : 'white'
                    }}
                    onClick={() => setSelectedPaymentMethod("debit_card")}
                  >
                    <span style={styles.paymentMethodIcon}>💳</span>
                    <span style={styles.paymentMethodTitle}>Debit Card</span>
                  </div>
                  
                  <div 
                    style={{
                      ...styles.paymentMethodOption,
                      borderColor: selectedPaymentMethod === "upi" ? '#2563eb' : '#e2e8f0',
                      backgroundColor: selectedPaymentMethod === "upi" ? '#eff6ff' : 'white'
                    }}
                    onClick={() => setSelectedPaymentMethod("upi")}
                  >
                    <span style={styles.paymentMethodIcon}>📱</span>
                    <span style={styles.paymentMethodTitle}>UPI</span>
                  </div>
                  
                  <div 
                    style={{
                      ...styles.paymentMethodOption,
                      borderColor: selectedPaymentMethod === "net_banking" ? '#2563eb' : '#e2e8f0',
                      backgroundColor: selectedPaymentMethod === "net_banking" ? '#eff6ff' : 'white'
                    }}
                    onClick={() => setSelectedPaymentMethod("net_banking")}
                  >
                    <span style={styles.paymentMethodIcon}>🏦</span>
                    <span style={styles.paymentMethodTitle}>Net Banking</span>
                  </div>
                  
                  <div 
                    style={{
                      ...styles.paymentMethodOption,
                      borderColor: selectedPaymentMethod === "wallets" ? '#2563eb' : '#e2e8f0',
                      backgroundColor: selectedPaymentMethod === "wallets" ? '#eff6ff' : 'white'
                    }}
                    onClick={() => setSelectedPaymentMethod("wallets")}
                  >
                    <span style={styles.paymentMethodIcon}>🎫</span>
                    <span style={styles.paymentMethodTitle}>Wallets</span>
                  </div>
                </div>

                {/* Payment Details Form */}
                {(selectedPaymentMethod === "credit_card" || selectedPaymentMethod === "debit_card") && (
                  <div style={styles.cardForm}>
                    <input
                      type="text"
                      placeholder="Card Number"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      maxLength="19"
                      style={styles.input}
                    />
                    <div style={styles.formRow}>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                        maxLength="5"
                        style={styles.input}
                      />
                      <input
                        type="text"
                        placeholder="CVV"
                        value={cardCVV}
                        onChange={(e) => setCardCVV(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        maxLength="4"
                        style={styles.input}
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Cardholder Name"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                )}

                {selectedPaymentMethod === "upi" && (
                  <div style={styles.cardForm}>
                    <input
                      type="text"
                      placeholder="Enter UPI ID (e.g., mobile@upi)"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                )}

                {selectedPaymentMethod === "net_banking" && (
                  <div style={styles.cardForm}>
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      style={styles.input}
                    >
                      <option value="">Select Your Bank</option>
                      {banks.map(bank => (
                        <option key={bank.id} value={bank.id}>{bank.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedPaymentMethod === "wallets" && (
                  <div style={styles.cardForm}>
                    <select
                      value={selectedWallet}
                      onChange={(e) => setSelectedWallet(e.target.value)}
                      style={styles.input}
                    >
                      <option value="">Select Your Wallet</option>
                      {wallets.map(wallet => (
                        <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={styles.amountDisplay}>
                  <span>Amount to Pay:</span>
                  <span style={styles.amountValue}>${getPaymentAmount()}</span>
                </div>

                <div style={styles.popupButtons}>
                  <button 
                    style={styles.popupCloseButton}
                    onClick={() => setShowPaymentMethodPopup(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    style={{
                      ...styles.popupPayButton,
                      opacity: isProcessingPayment ? 0.7 : 1
                    }}
                    onClick={handlePayNow}
                    disabled={isProcessingPayment || !selectedPaymentMethod}
                  >
                    {isProcessingPayment ? "Processing..." : `Pay $${getPaymentAmount()}`}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={styles.successIconLarge}>✓</div>
                <h2 style={styles.popupTitle}>Payment Successful!</h2>
                <p style={styles.popupText}>Your payment has been processed successfully</p>
                <div style={styles.transactionBox}>
                  <div style={styles.transactionId}>
                    Transaction ID: {transactionDetails?.transactionId}
                  </div>
                  <div style={styles.txnDetail}>
                    <span>Amount Paid:</span>
                    <span>${getPaymentAmount()}</span>
                  </div>
                  <div style={styles.txnDetail}>
                    <span>Status:</span>
                    <span style={{color: '#10b981'}}>Paid</span>
                  </div>
                </div>
                <button 
                  style={styles.popupPayButton}
                  onClick={handlePaymentComplete}
                >
                  Continue to Dashboard
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          ...styles.toast,
          borderLeft: `4px solid ${toast.type === 'success' ? '#10b981' : '#ef4444'}`
        }}>
          <span style={{ fontSize: '20px' }}>{toast.type === 'success' ? '✓' : '✕'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.welcomeSection}>
            <div style={styles.avatar}>
              {profile.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={styles.title}>Welcome back, {profile.name}! 👋</h1>
              <p style={styles.subtitle}>Manage your residency and housing preferences</p>
            </div>
          </div>
          <div style={styles.headerStats}>
            <div style={styles.statBadge}>
              <span style={styles.statNumber}>{profile.roomNumber ? '1' : '0'}</span>
              <span style={styles.statLabel}>Active Booking</span>
            </div>
            <div style={styles.statBadge}>
              <span style={styles.statNumber}>{complements.length}</span>
              <span style={styles.statLabel}>Tickets</span>
            </div>
          </div>
        </div>
      </header>

      <div style={styles.grid}>
        {/* Room Details Card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>🏠 Room Details</h3>
            <span style={styles.cardBadge}>{profile.roomNumber ? 'Booked' : 'No Booking'}</span>
          </div>
          <div style={styles.cardContent}>
            <div style={styles.detailRow}>
              <span style={styles.label}>Room Number</span>
              <span style={styles.value}>{profile.roomNumber || "Not assigned"}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.label}>Room Type</span>
              <span style={styles.value}>{profile.roomNumber ? profile.roomType : "None"}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.label}>Check-in Date</span>
              <span style={styles.value}>{profile.roomNumber ? "Available Now" : "-"}</span>
            </div>
          </div>
          {!profile.roomNumber && (
            <a href="/" style={styles.bookButton}>Book a Room</a>
          )}
        </div>

        {/* Payment Status Card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>💳 Payment Status</h3>
          </div>
          <div style={styles.cardContent}>
            <div style={{
              ...styles.paymentStatus,
              backgroundColor: profile.paymentStatus === "Paid" ? "#dcfce7" : "#fee2e2",
              color: profile.paymentStatus === "Paid" ? "#166534" : "#991b1b"
            }}>
              <span style={styles.paymentIcon}>
                {profile.paymentStatus === "Paid" ? "✓" : "⏳"}
              </span>
              {profile.paymentStatus || "No Booking"}
            </div>
            <p style={styles.paymentText}>
              {profile.paymentStatus === "Paid"
                ? "All dues are successfully cleared. You're all set!"
                : profile.roomNumber
                  ? "Please complete your payment to finalize booking."
                  : "No active booking found."}
            </p>
            {profile.paymentStatus === "Pending" && (
              <button 
                style={styles.payNowButton}
                onClick={handlePayNowClick}
              >
                💳 Pay Now
              </button>
            )}
          </div>
        </div>

        {/* Profile Info Card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>👤 Profile Info</h3>
            <button style={styles.editButton}>Edit</button>
          </div>
          <div style={styles.cardContent}>
            <div style={styles.detailRow}>
              <span style={styles.label}>Full Name</span>
              <span style={styles.value}>{profile.name}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.label}>Email Address</span>
              <span style={styles.value}>{profile.email}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.label}>User Role</span>
              <span style={styles.roleBadge}>{profile.role}</span>
            </div>
          </div>
        </div>

        {/* Complement Form Card */}
        <div style={{...styles.card, gridColumn: 'span 2'}}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>📝 Submit Complement / Complaint</h3>
          </div>
          <form onSubmit={handleComplementSubmit} style={styles.form}>
            <textarea
              placeholder="Write your complement, complaint, or feedback here..."
              value={complementForm.message}
              onChange={(e) => setComplementForm({ message: e.target.value })}
              style={styles.textarea}
              rows={4}
              required
            />
            <button type="submit" style={styles.submitButton}>
              Submit Ticket
            </button>
          </form>

          <div style={styles.history}>
            <h4 style={styles.historyTitle}>My Tickets</h4>
            {complements.length === 0 && (
              <p style={styles.emptyText}>No tickets submitted yet.</p>
            )}
            {complements.map((item) => (
              <div key={item._id} style={styles.historyItem}>
                <div style={styles.historyHeader}>
                  <p style={styles.historyMessage}>{item.message}</p>
                  <span
                    style={{
                      ...styles.statusChip,
                      backgroundColor: item.status === "Resolved" ? "#dcfce7" : "#fef3c7",
                      color: item.status === "Resolved" ? "#166534" : "#92400e"
                    }}
                  >
                    {item.status === "Resolved" ? "✓ Resolved" : "⏳ Pending"}
                  </span>
                </div>
                {item.adminResponse && (
                  <div style={styles.responseBox}>
                    <span style={styles.responseLabel}>Admin Response:</span>
                    <p style={styles.responseText}>{item.adminResponse}</p>
                  </div>
                )}
                <span style={styles.timestamp}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "0",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    backgroundColor: "#f8fafc",
    minHeight: "100vh"
  },
  popupOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
    animation: "fadeIn 0.3s ease-out"
  },
  popupCard: {
    background: "white",
    borderRadius: "24px",
    padding: "40px",
    maxWidth: "450px",
    width: "90%",
    textAlign: "center",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    animation: "slideUp 0.3s ease-out"
  },
  paymentPopupCard: {
    background: "white",
    borderRadius: "24px",
    padding: "30px",
    maxWidth: "480px",
    width: "90%",
    textAlign: "center",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    animation: "slideUp 0.3s ease-out",
    maxHeight: "90vh",
    overflowY: "auto"
  },
  popupIcon: {
    fontSize: "60px",
    marginBottom: "16px"
  },
  popupTitle: {
    fontSize: "1.75rem",
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: "12px",
    marginTop: 0
  },
  popupText: {
    color: "#64748b",
    fontSize: "1rem",
    marginBottom: "24px",
    lineHeight: "1.6"
  },
  popupDetails: {
    background: "#f8fafc",
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "24px",
    textAlign: "left"
  },
  popupDetailRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #e2e8f0",
    color: "#64748b",
    fontSize: "14px"
  },
  popupButtons: {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  popupPayButton: {
    padding: "16px",
    background: "linear-gradient(135deg, #10b981, #059669)",
    color: "white",
    border: "none",
    borderRadius: "14px",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)"
  },
  popupCloseButton: {
    padding: "14px",
    background: "#f1f5f9",
    color: "#64748b",
    border: "none",
    borderRadius: "14px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease"
  },
  paymentMethodsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "10px",
    marginBottom: "16px"
  },
  paymentMethodOption: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "12px",
    borderRadius: "12px",
    border: "2px solid",
    cursor: "pointer",
    transition: "all 0.2s ease"
  },
  paymentMethodIcon: {
    fontSize: "24px",
    marginBottom: "6px"
  },
  paymentMethodTitle: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#1e293b"
  },
  cardForm: {
    background: "#f8fafc",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "16px",
    textAlign: "left"
  },
  formRow: {
    display: "flex",
    gap: "10px",
    marginTop: "10px"
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "2px solid #e2e8f0",
    fontSize: "14px",
    outline: "none",
    transition: "all 0.2s ease",
    boxSizing: "border-box",
    marginTop: "8px"
  },
  amountDisplay: {
    display: "flex",
    justifyContent: "space-between",
    padding: "16px",
    background: "#f8fafc",
    borderRadius: "12px",
    marginBottom: "16px",
    fontWeight: "600",
    color: "#1e293b"
  },
  amountValue: {
    fontSize: "20px",
    color: "#10b981"
  },
  successIconLarge: {
    width: "80px",
    height: "80px",
    background: "linear-gradient(135deg, #10b981, #059669)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
    fontSize: "40px",
    color: "white",
    fontWeight: "800"
  },
  transactionBox: {
    background: "#f8fafc",
    borderRadius: "16px",
    padding: "16px",
    marginBottom: "20px",
    textAlign: "left"
  },
  transactionId: {
    fontSize: "12px",
    color: "#64748b",
    fontFamily: "monospace",
    marginBottom: "12px",
    paddingBottom: "10px",
    borderBottom: "1px solid #e2e8f0"
  },
  txnDetail: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "14px",
    color: "#64748b",
    padding: "4px 0"
  },
  toast: {
    position: "fixed",
    top: "20px",
    right: "20px",
    padding: "16px 24px",
    background: "white",
    borderRadius: "12px",
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    zIndex: "1000",
    animation: "slideInRight 0.3s ease-out",
    fontWeight: "600",
    color: "#1e293b"
  },
  header: {
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    padding: "40px 5%",
    marginBottom: "40px"
  },
  headerContent: {
    maxWidth: "1400px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "20px"
  },
  welcomeSection: {
    display: "flex",
    alignItems: "center",
    gap: "20px"
  },
  avatar: {
    width: "72px",
    height: "72px",
    background: "linear-gradient(135deg, #2563eb, #f59e0b)",
    borderRadius: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontSize: "28px",
    fontWeight: "700",
    boxShadow: "0 8px 30px rgba(37, 99, 235, 0.3)"
  },
  title: {
    fontSize: "2rem",
    fontWeight: "800",
    color: "white",
    marginBottom: "4px"
  },
  subtitle: {
    fontSize: "1rem",
    color: "rgba(255, 255, 255, 0.6)"
  },
  headerStats: {
    display: "flex",
    gap: "16px"
  },
  statBadge: {
    background: "rgba(255, 255, 255, 0.1)",
    padding: "16px 24px",
    borderRadius: "16px",
    textAlign: "center",
    border: "1px solid rgba(255, 255, 255, 0.1)"
  },
  statNumber: {
    display: "block",
    fontSize: "28px",
    fontWeight: "900",
    color: "white"
  },
  statLabel: {
    fontSize: "12px",
    color: "rgba(255, 255, 255, 0.6)",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "24px",
    padding: "0 5% 60px",
    maxWidth: "1400px",
    margin: "0 auto"
  },
  card: {
    backgroundColor: "white",
    borderRadius: "24px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
    border: "1px solid #f1f5f9",
    overflow: "hidden",
    transition: "all 0.3s ease"
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "24px 24px 0"
  },
  cardTitle: {
    fontSize: "1.25rem",
    fontWeight: "800",
    color: "#1e293b",
    margin: 0
  },
  cardBadge: {
    padding: "6px 14px",
    background: "#f1f5f9",
    borderRadius: "50px",
    fontSize: "12px",
    fontWeight: "700",
    color: "#64748b"
  },
  cardContent: {
    padding: "24px"
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 0",
    borderBottom: "1px solid #f1f5f9"
  },
  label: {
    color: "#64748b",
    fontWeight: "600",
    fontSize: "0.9rem"
  },
  value: {
    color: "#1e293b",
    fontWeight: "700",
    fontSize: "1rem"
  },
  roleBadge: {
    padding: "4px 12px",
    background: "linear-gradient(135deg, #2563eb, #1e40af)",
    color: "white",
    borderRadius: "50px",
    fontSize: "12px",
    fontWeight: "700",
    textTransform: "capitalize"
  },
  paymentStatus: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px 20px",
    borderRadius: "16px",
    fontWeight: "800",
    fontSize: "1.1rem",
    marginBottom: "16px"
  },
  paymentIcon: {
    fontSize: "20px"
  },
  paymentText: {
    color: "#64748b",
    margin: 0,
    lineHeight: "1.6"
  },
  payNowButton: {
    width: "100%",
    padding: "14px",
    background: "linear-gradient(135deg, #f59e0b, #d97706)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    marginTop: "12px",
    transition: "all 0.3s ease"
  },
  editButton: {
    padding: "8px 16px",
    background: "#f1f5f9",
    border: "none",
    borderRadius: "8px",
    color: "#64748b",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "13px"
  },
  bookButton: {
    display: "block",
    margin: "0 24px 24px",
    padding: "14px",
    background: "linear-gradient(135deg, #2563eb, #1e40af)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    textAlign: "center",
    textDecoration: "none",
    transition: "all 0.3s ease"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "0 24px"
  },
  textarea: {
    width: "100%",
    borderRadius: "14px",
    border: "2px solid #e2e8f0",
    padding: "16px",
    resize: "vertical",
    fontFamily: "inherit",
    fontSize: "0.95rem",
    outline: "none",
    transition: "all 0.3s ease"
  },
  submitButton: {
    border: "none",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #2563eb, #1e40af)",
    color: "white",
    fontWeight: "700",
    padding: "14px 24px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 15px rgba(37, 99, 235, 0.3)"
  },
  history: {
    marginTop: "24px",
    padding: "24px",
    borderTop: "1px solid #f1f5f9"
  },
  historyTitle: {
    margin: "0 0 16px",
    color: "#334155",
    fontSize: "1rem"
  },
  emptyText: {
    margin: 0,
    color: "#94a3b8",
    fontStyle: "italic"
  },
  historyItem: {
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "16px",
    backgroundColor: "#f8fafc",
    marginBottom: "12px"
  },
  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    marginBottom: "8px"
  },
  historyMessage: {
    margin: 0,
    color: "#0f172a",
    fontWeight: "600",
    flex: 1
  },
  statusChip: {
    display: "inline-block",
    borderRadius: "50px",
    padding: "4px 12px",
    fontSize: "12px",
    fontWeight: "700",
    whiteSpace: "nowrap"
  },
  responseBox: {
    background: "#fff",
    padding: "12px",
    borderRadius: "10px",
    marginTop: "8px",
    border: "1px solid #e2e8f0"
  },
  responseLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#64748b",
    display: "block",
    marginBottom: "4px"
  },
  responseText: {
    margin: 0,
    color: "#334155",
    fontSize: "0.9rem"
  },
  timestamp: {
    fontSize: "12px",
    color: "#94a3b8",
    marginTop: "8px",
    display: "block"
  },
  loaderContainer: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    gap: "16px"
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid #e2e8f0",
    borderTopColor: "#2563eb",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite"
  },
  notLoggedIn: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    textAlign: "center",
    padding: "20px"
  },
  lockIcon: {
    fontSize: "64px",
    marginBottom: "20px"
  }
};

export default Dashboard;
