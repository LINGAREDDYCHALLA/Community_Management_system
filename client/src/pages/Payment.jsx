import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

function Payment() {
    const location = useLocation();
    const navigate = useNavigate();
    const { roomType, roomNumber: preSelectedRoom } = location.state || { roomType: "Single", roomNumber: null };
    const [userEmail, setUserEmail] = useState("");
    const [userProfile, setUserProfile] = useState(null);
    const [availableRooms, setAvailableRooms] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState("");
    const [fetchingRooms, setFetchingRooms] = useState(false);
    const [toast, setToast] = useState(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedPayment, setSelectedPayment] = useState("");
    const [showPaymentOptions, setShowPaymentOptions] = useState(false);
    
    // Payment processing states
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [transactionDetails, setTransactionDetails] = useState(null);
    
    // Card details state
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

    useEffect(() => {
        const email = localStorage.getItem("userEmail");
        if (!email) {
            navigate("/login");
        } else {
            setUserEmail(email);
            fetchUserProfile(email);
        }
    }, [navigate, roomType]);

    const fetchUserProfile = async (email) => {
        try {
            const res = await axios.get(`http://localhost:5000/user/profile/${email}`);
            setUserProfile(res.data);
            fetchAvailableRooms();
        } catch (error) {
            console.error("Error fetching profile:", error);
            fetchAvailableRooms();
        }
    };

    const fetchAvailableRooms = async () => {
        setFetchingRooms(true);
        try {
            const res = await axios.get(`http://localhost:5000/rooms/available/${roomType}`);
            setAvailableRooms(res.data);
            
            if (preSelectedRoom && res.data.includes(preSelectedRoom)) {
                setSelectedRoom(preSelectedRoom);
            } else {
                setSelectedRoom("");
            }
        } catch (error) {
            console.error("Error fetching available rooms:", error);
            showToast("Error fetching rooms", "error");
        } finally {
            setFetchingRooms(false);
        }
    };

    const handleProceedToPayment = () => {
        if (!selectedRoom) {
            showToast("Please select a room number.", "error");
            return;
        }
        setShowPaymentOptions(true);
    };

    const handlePaymentMethod = (paymentMethod) => {
        setSelectedPayment(paymentMethod);
        // Reset payment details when changing payment method
        setCardNumber("");
        setCardExpiry("");
        setCardCVV("");
        setCardName("");
        setUpiId("");
        setSelectedBank("");
        setSelectedWallet("");
    };

    const validatePaymentDetails = () => {
        if (selectedPayment === "credit_card" || selectedPayment === "debit_card") {
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
        } else if (selectedPayment === "upi") {
            if (!upiId || !upiId.includes("@")) {
                showToast("Please enter a valid UPI ID", "error");
                return false;
            }
        } else if (selectedPayment === "net_banking") {
            if (!selectedBank) {
                showToast("Please select a bank", "error");
                return false;
            }
        } else if (selectedPayment === "wallets") {
            if (!selectedWallet) {
                showToast("Please select a wallet", "error");
                return false;
            }
        }
        return true;
    };

    const handleConfirmPayment = async () => {
        if (!selectedPayment) {
            showToast("Please select a payment method.", "error");
            return;
        }

        // For "Pay at Reception", don't show payment modal
        if (selectedPayment === "pay_later") {
            await processPayLater();
            return;
        }

        // Validate payment details
        if (!validatePaymentDetails()) {
            return;
        }

        // Show payment processing modal
        setShowPaymentModal(true);
        setIsProcessing(true);
        setPaymentSuccess(false);

        // Simulate payment processing delay (like real payment gateway)
        setTimeout(async () => {
            try {
                const res = await axios.post("http://localhost:5000/user/process-payment", {
                    email: userEmail,
                    roomType: roomType,
                    roomNumber: selectedRoom,
                    paymentMethod: selectedPayment,
                    amount: price
                });

                if (res.data.success) {
                    setPaymentSuccess(true);
                    setTransactionDetails(res.data);
                    setIsProcessing(false);
                }
            } catch (error) {
                setIsProcessing(false);
                setShowPaymentModal(false);
                showToast(error.response?.data?.message || "Payment failed. Please try again.", "error");
            }
        }, 2500); // Simulate 2.5 seconds processing time
    };

    const processPayLater = async () => {
        const isPayLater = selectedPayment === "pay_later";
        const paymentStatus = isPayLater ? "Pending" : "Paid";

        try {
            setCurrentStep(2);
            await axios.post("http://localhost:5000/user/book-room", {
                email: userEmail,
                roomType: roomType,
                roomNumber: selectedRoom,
                paymentMethod: selectedPayment,
                paymentStatus: paymentStatus
            });
            
            if (isPayLater) {
                showToast("Room booked! Payment pending at reception.", "success");
                localStorage.setItem("showPendingPayment", "true");
            } else {
                showToast("Payment successful! Room booked successfully!", "success");
            }
            
            setTimeout(() => navigate("/dashboard"), 2000);
        } catch (error) {
            showToast("Error processing booking: " + (error.response?.data?.message || error.message), "error");
            setCurrentStep(1);
            setShowPaymentOptions(false);
            setSelectedPayment("");
        }
    };

    const handlePaymentComplete = () => {
        setShowPaymentModal(false);
        setShowPaymentOptions(false);
        setCurrentStep(2);
        
        // Store transaction details for display
        if (transactionDetails) {
            localStorage.setItem("lastTransaction", JSON.stringify(transactionDetails));
        }
        
        showToast("Payment successful! Room booked successfully!", "success");
        setTimeout(() => navigate("/dashboard"), 2000);
    };

    const handlePaymentFailure = () => {
        setShowPaymentModal(false);
        setPaymentSuccess(false);
        setTransactionDetails(null);
        showToast("Payment failed. Please try again or use a different payment method.", "error");
    };

    const handleCancelBooking = () => {
        if (window.confirm("Are you sure you want to cancel?")) {
            navigate("/");
        }
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

    const roomTypeKey = roomType.replace(" Room", "");
    
    const roomPrices = {
        "Single": 500,
        "Double": 800,
        "Deluxe": 1200,
        "Suite": 2500
    };

    const price = roomPrices[roomTypeKey] || 500;

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

    const getPaymentMethodIcon = () => {
        switch(selectedPayment) {
            case "credit_card":
            case "debit_card": return "💳";
            case "upi": return "📱";
            case "net_banking": return "🏦";
            case "wallets": return "🎫";
            case "pay_later": return "🏨";
            default: return "💰";
        }
    };

    const getPaymentMethodName = () => {
        switch(selectedPayment) {
            case "credit_card": return "Credit Card";
            case "debit_card": return "Debit Card";
            case "upi": return "UPI";
            case "net_banking": return "Net Banking";
            case "wallets": return "Mobile Wallet";
            case "pay_later": return "Pay at Reception";
            default: return "Payment";
        }
    };

    return (
        <div style={styles.container}>
            {/* Payment Processing Modal */}
            {showPaymentModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalCard}>
                        {!paymentSuccess ? (
                            <>
                                <div style={styles.processingIcon}>
                                    <div style={styles.processingSpinner}></div>
                                </div>
                                <h3 style={styles.modalTitle}>Processing Payment...</h3>
                                <p style={styles.modalSubtitle}>
                                    Please wait while we process your {getPaymentMethodName()} payment
                                </p>
                                <div style={styles.paymentDetailsBox}>
                                    <div style={styles.detailRow}>
                                        <span>Amount</span>
                                        <span style={styles.amountText}>${price}</span>
                                    </div>
                                    <div style={styles.detailRow}>
                                        <span>Payment Method</span>
                                        <span>{getPaymentMethodIcon()} {getPaymentMethodName()}</span>
                                    </div>
                                </div>
                                <div style={styles.securityNote}>
                                    🔒 Secured by SecurePay Payment Gateway
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={styles.successIcon}>✓</div>
                                <h3 style={styles.modalTitle}>Payment Successful!</h3>
                                <p style={styles.modalSubtitle}>Your payment has been processed successfully</p>
                                <div style={styles.transactionBox}>
                                    <div style={styles.transactionId}>
                                        Transaction ID: {transactionDetails?.transactionId}
                                    </div>
                                    <div style={styles.transactionDetails}>
                                        <div style={styles.txnRow}>
                                            <span>Amount Paid</span>
                                            <span style={styles.txnValue}>${price}</span>
                                        </div>
                                        <div style={styles.txnRow}>
                                            <span>Payment Method</span>
                                            <span style={styles.txnValue}>{getPaymentMethodName()}</span>
                                        </div>
                                        <div style={styles.txnRow}>
                                            <span>Gateway</span>
                                            <span style={styles.txnValue}>{transactionDetails?.gateway}</span>
                                        </div>
                                        <div style={styles.txnRow}>
                                            <span>Status</span>
                                            <span style={{...styles.txnValue, color: '#10b981'}}>✓ Paid</span>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    style={styles.continueButton}
                                    onClick={handlePaymentComplete}
                                >
                                    Continue to Dashboard →
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

            <div style={styles.card}>
                <div style={styles.header}>
                    <h2 style={styles.title}>Book Your Room</h2>
                    <p style={styles.subtitle}>You're booking a <strong>{roomType}</strong></p>
                </div>

                {currentStep === 1 && !showPaymentOptions && (
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>Select Room Number</h3>
                        <p style={styles.instructionText}>Choose an available room from the list below</p>
                        
                        {fetchingRooms ? (
                            <div style={styles.loading}>
                                <div style={styles.spinner}></div>
                                <p>Finding available rooms...</p>
                            </div>
                        ) : (
                            <div style={styles.roomGrid}>
                                {availableRooms.length > 0 ? (
                                    availableRooms.map(room => (
                                        <div 
                                            key={room}
                                            style={{
                                                ...styles.roomOption,
                                                borderColor: selectedRoom === room ? '#2563eb' : '#e2e8f0',
                                                backgroundColor: selectedRoom === room ? '#eff6ff' : 'white'
                                            }}
                                            onClick={() => setSelectedRoom(room)}
                                        >
                                            <span style={styles.roomNumber}>Room {room}</span>
                                            {selectedRoom === room && <span style={styles.checkmark}>✓</span>}
                                        </div>
                                    ))
                                ) : (
                                    <p style={styles.noRooms}>No rooms available for this type</p>
                                )}
                            </div>
                        )}
                        
                        <div style={styles.priceSummary}>
                            <div style={styles.priceRow}>
                                <span>Room Type</span>
                                <span>{roomType}</span>
                            </div>
                            <div style={styles.priceRow}>
                                <span>Selected Room</span>
                                <span>{selectedRoom ? `Room ${selectedRoom}` : "Not selected"}</span>
                            </div>
                            <div style={styles.priceRow}>
                                <span>Monthly Rent</span>
                                <span>${price}</span>
                            </div>
                            <div style={{...styles.priceRow, ...styles.priceTotal}}>
                                <span>Total</span>
                                <span>${price}/month</span>
                            </div>
                        </div>

                        <div style={styles.buttonGroup}>
                            <button
                                style={styles.cancelButton}
                                onClick={handleCancelBooking}
                            >
                                ✕ Cancel
                            </button>
                            <button
                                style={{...styles.continueButton, ...( !selectedRoom ? styles.continueButtonDisabled : {})}}
                                onClick={handleProceedToPayment}
                                disabled={!selectedRoom}
                            >
                                Proceed to Payment →
                            </button>
                        </div>
                    </div>
                )}

                {showPaymentOptions && currentStep === 1 && (
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>Select Payment Method</h3>
                        <p style={styles.instructionText}>Choose your preferred payment option</p>
                        
                        <div style={styles.paymentOptions}>
                            <div 
                                style={{
                                    ...styles.paymentOption,
                                    borderColor: selectedPayment === "credit_card" ? '#2563eb' : '#e2e8f0',
                                    backgroundColor: selectedPayment === "credit_card" ? '#eff6ff' : 'white'
                                }} 
                                onClick={() => handlePaymentMethod("credit_card")}
                            >
                                <span style={styles.paymentIcon}>💳</span>
                                <div style={styles.paymentInfo}>
                                    <span style={styles.paymentTitle}>Credit Card</span>
                                    <span style={styles.paymentDesc}>Visa, Mastercard, RuPay</span>
                                </div>
                                {selectedPayment === "credit_card" && <span style={styles.checkmark}>✓</span>}
                            </div>
                            
                            <div 
                                style={{
                                    ...styles.paymentOption,
                                    borderColor: selectedPayment === "debit_card" ? '#2563eb' : '#e2e8f0',
                                    backgroundColor: selectedPayment === "debit_card" ? '#eff6ff' : 'white'
                                }} 
                                onClick={() => handlePaymentMethod("debit_card")}
                            >
                                <span style={styles.paymentIcon}>💳</span>
                                <div style={styles.paymentInfo}>
                                    <span style={styles.paymentTitle}>Debit Card</span>
                                    <span style={styles.paymentDesc}>Pay with your bank debit card</span>
                                </div>
                                {selectedPayment === "debit_card" && <span style={styles.checkmark}>✓</span>}
                            </div>
                            
                            <div 
                                style={{
                                    ...styles.paymentOption,
                                    borderColor: selectedPayment === "upi" ? '#2563eb' : '#e2e8f0',
                                    backgroundColor: selectedPayment === "upi" ? '#eff6ff' : 'white'
                                }} 
                                onClick={() => handlePaymentMethod("upi")}
                            >
                                <span style={styles.paymentIcon}>📱</span>
                                <div style={styles.paymentInfo}>
                                    <span style={styles.paymentTitle}>UPI / Paytm</span>
                                    <span style={styles.paymentDesc}>Google Pay, PhonePe, Paytm</span>
                                </div>
                                {selectedPayment === "upi" && <span style={styles.checkmark}>✓</span>}
                            </div>
                            
                            <div 
                                style={{
                                    ...styles.paymentOption,
                                    borderColor: selectedPayment === "net_banking" ? '#2563eb' : '#e2e8f0',
                                    backgroundColor: selectedPayment === "net_banking" ? '#eff6ff' : 'white'
                                }} 
                                onClick={() => handlePaymentMethod("net_banking")}
                            >
                                <span style={styles.paymentIcon}>🏦</span>
                                <div style={styles.paymentInfo}>
                                    <span style={styles.paymentTitle}>Net Banking</span>
                                    <span style={styles.paymentDesc}>All major Indian banks</span>
                                </div>
                                {selectedPayment === "net_banking" && <span style={styles.checkmark}>✓</span>}
                            </div>
                            
                            <div 
                                style={{
                                    ...styles.paymentOption,
                                    borderColor: selectedPayment === "wallets" ? '#2563eb' : '#e2e8f0',
                                    backgroundColor: selectedPayment === "wallets" ? '#eff6ff' : 'white'
                                }} 
                                onClick={() => handlePaymentMethod("wallets")}
                            >
                                <span style={styles.paymentIcon}>🎫</span>
                                <div style={styles.paymentInfo}>
                                    <span style={styles.paymentTitle}>Mobile Wallets</span>
                                    <span style={styles.paymentDesc}>Amazon Pay, Mobikwik</span>
                                </div>
                                {selectedPayment === "wallets" && <span style={styles.checkmark}>✓</span>}
                            </div>
                            
                            <div 
                                style={{
                                    ...styles.paymentOption,
                                    borderColor: selectedPayment === "pay_later" ? '#2563eb' : '#e2e8f0',
                                    backgroundColor: selectedPayment === "pay_later" ? '#eff6ff' : 'white'
                                }} 
                                onClick={() => handlePaymentMethod("pay_later")}
                            >
                                <span style={styles.paymentIcon}>🏨</span>
                                <div style={styles.paymentInfo}>
                                    <span style={styles.paymentTitle}>Pay at Reception</span>
                                    <span style={styles.paymentDesc}>Book now, pay later</span>
                                </div>
                                {selectedPayment === "pay_later" && <span style={styles.checkmark}>✓</span>}
                            </div>
                        </div>

                        {/* Payment Details Form */}
                        {(selectedPayment === "credit_card" || selectedPayment === "debit_card") && (
                            <div style={styles.cardForm}>
                                <h4 style={styles.formTitle}>{selectedPayment === "credit_card" ? "Credit" : "Debit"} Card Details</h4>
                                <div style={styles.formGroup}>
                                    <input
                                        type="text"
                                        placeholder="Card Number"
                                        value={cardNumber}
                                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                        maxLength="19"
                                        style={styles.input}
                                    />
                                </div>
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
                                <div style={styles.formGroup}>
                                    <input
                                        type="text"
                                        placeholder="Cardholder Name"
                                        value={cardName}
                                        onChange={(e) => setCardName(e.target.value)}
                                        style={styles.input}
                                    />
                                </div>
                            </div>
                        )}

                        {selectedPayment === "upi" && (
                            <div style={styles.cardForm}>
                                <h4 style={styles.formTitle}>UPI Payment</h4>
                                <div style={styles.formGroup}>
                                    <input
                                        type="text"
                                        placeholder="Enter UPI ID (e.g., mobile@upi)"
                                        value={upiId}
                                        onChange={(e) => setUpiId(e.target.value)}
                                        style={styles.input}
                                    />
                                </div>
                                <p style={styles.upiNote}>You will receive a payment request on your UPI app</p>
                            </div>
                        )}

                        {selectedPayment === "net_banking" && (
                            <div style={styles.cardForm}>
                                <h4 style={styles.formTitle}>Select Your Bank</h4>
                                <div style={styles.bankGrid}>
                                    {banks.map(bank => (
                                        <div
                                            key={bank.id}
                                            style={{
                                                ...styles.bankOption,
                                                borderColor: selectedBank === bank.id ? '#2563eb' : '#e2e8f0',
                                                backgroundColor: selectedBank === bank.id ? '#eff6ff' : 'white'
                                            }}
                                            onClick={() => setSelectedBank(bank.id)}
                                        >
                                            {bank.name}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedPayment === "wallets" && (
                            <div style={styles.cardForm}>
                                <h4 style={styles.formTitle}>Select Your Wallet</h4>
                                <div style={styles.walletGrid}>
                                    {wallets.map(wallet => (
                                        <div
                                            key={wallet.id}
                                            style={{
                                                ...styles.walletOption,
                                                borderColor: selectedWallet === wallet.id ? '#2563eb' : '#e2e8f0',
                                                backgroundColor: selectedWallet === wallet.id ? '#eff6ff' : 'white'
                                            }}
                                            onClick={() => setSelectedWallet(wallet.id)}
                                        >
                                            {wallet.name}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={styles.priceSummary}>
                            <div style={styles.priceRow}>
                                <span>Room</span>
                                <span>{roomType} - Room {selectedRoom}</span>
                            </div>
                            <div style={{...styles.priceRow, ...styles.priceTotal}}>
                                <span>Amount to Pay</span>
                                <span>${price}</span>
                            </div>
                        </div>

                        <div style={styles.buttonGroup}>
                            <button
                                style={styles.cancelButton}
                                onClick={() => setShowPaymentOptions(false)}
                            >
                                ← Back
                            </button>
                            <button
                                style={{...styles.continueButton, ...( !selectedPayment ? styles.continueButtonDisabled : {})}}
                                onClick={handleConfirmPayment}
                                disabled={!selectedPayment}
                            >
                                {selectedPayment === "pay_later" ? `Book Now (Pay Later)` : `Pay $${price} ✓`}
                            </button>
                        </div>
                    </div>
                )}

                {currentStep === 2 && (
                    <div style={styles.processingSection}>
                        <div style={styles.processingIconSmall}>✓</div>
                        <h3 style={styles.processingTitle}>Booking Confirmed!</h3>
                        <p style={styles.processingText}>
                            Your {roomType} (Room {selectedRoom}) has been booked successfully.
                        </p>
                        <p style={styles.redirectText}>Redirecting to dashboard...</p>
                    </div>
                )}
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
        background: `
            radial-gradient(ellipse at 20% 20%, rgba(37, 99, 235, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(245, 158, 11, 0.1) 0%, transparent 50%),
            #f8fafc
        `,
        padding: "20px"
    },
    modalOverlay: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 3000,
        animation: "fadeIn 0.3s ease-out"
    },
    modalCard: {
        background: "white",
        borderRadius: "24px",
        padding: "40px",
        maxWidth: "450px",
        width: "90%",
        textAlign: "center",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.3)",
        animation: "slideUp 0.3s ease-out"
    },
    modalTitle: {
        fontSize: "1.5rem",
        fontWeight: "800",
        color: "#1e293b",
        marginBottom: "8px",
        marginTop: "20px"
    },
    modalSubtitle: {
        color: "#64748b",
        fontSize: "0.95rem",
        marginBottom: "24px"
    },
    processingIcon: {
        width: "80px",
        height: "80px",
        background: "linear-gradient(135deg, #2563eb, #1e40af)",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto"
    },
    processingSpinner: {
        width: "40px",
        height: "40px",
        border: "3px solid rgba(255, 255, 255, 0.3)",
        borderTopColor: "white",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite"
    },
    successIcon: {
        width: "80px",
        height: "80px",
        background: "linear-gradient(135deg, #10b981, #059669)",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto",
        fontSize: "40px",
        color: "white",
        fontWeight: "800"
    },
    paymentDetailsBox: {
        background: "#f8fafc",
        borderRadius: "16px",
        padding: "20px",
        marginBottom: "20px",
        textAlign: "left"
    },
    detailRow: {
        display: "flex",
        justifyContent: "space-between",
        padding: "8px 0",
        color: "#64748b",
        fontSize: "14px"
    },
    amountText: {
        fontWeight: "700",
        color: "#1e293b",
        fontSize: "18px"
    },
    securityNote: {
        fontSize: "12px",
        color: "#10b981",
        marginTop: "16px"
    },
    transactionBox: {
        background: "#f8fafc",
        borderRadius: "16px",
        padding: "20px",
        marginBottom: "24px",
        textAlign: "left"
    },
    transactionId: {
        fontSize: "12px",
        color: "#64748b",
        fontFamily: "monospace",
        marginBottom: "16px",
        paddingBottom: "12px",
        borderBottom: "1px solid #e2e8f0"
    },
    transactionDetails: {
        display: "flex",
        flexDirection: "column",
        gap: "8px"
    },
    txnRow: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: "14px",
        color: "#64748b"
    },
    txnValue: {
        fontWeight: "600",
        color: "#1e293b"
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
        fontWeight: "600",
        color: "#1e293b"
    },
    card: {
        backgroundColor: "white",
        padding: "40px",
        borderRadius: "24px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
        maxWidth: "600px",
        width: "100%"
    },
    header: {
        textAlign: "center",
        marginBottom: "32px"
    },
    title: {
        fontSize: "1.75rem",
        fontWeight: "800",
        color: "#1e293b",
        marginBottom: "8px"
    },
    subtitle: {
        color: "#64748b",
        fontSize: "1rem"
    },
    section: {
        animation: "fadeIn 0.3s ease-out"
    },
    sectionTitle: {
        fontSize: "1.1rem",
        fontWeight: "700",
        color: "#1e293b",
        marginBottom: "8px"
    },
    instructionText: {
        color: "#64748b",
        fontSize: "14px",
        marginBottom: "20px"
    },
    loading: {
        textAlign: "center",
        padding: "40px"
    },
    spinner: {
        width: "40px",
        height: "40px",
        border: "3px solid #e2e8f0",
        borderTopColor: "#2563eb",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
        margin: "0 auto 16px"
    },
    roomGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
        gap: "12px",
        marginBottom: "24px",
        maxHeight: "300px",
        overflowY: "auto"
    },
    roomOption: {
        padding: "16px",
        borderRadius: "12px",
        border: "2px solid",
        cursor: "pointer",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        transition: "all 0.2s ease"
    },
    roomNumber: {
        fontWeight: "700",
        color: "#1e293b"
    },
    checkmark: {
        color: "#2563eb",
        fontWeight: "700"
    },
    noRooms: {
        gridColumn: "1 / -1",
        textAlign: "center",
        color: "#64748b",
        padding: "20px"
    },
    priceSummary: {
        background: "#f8fafc",
        borderRadius: "16px",
        padding: "20px",
        marginBottom: "24px"
    },
    priceRow: {
        display: "flex",
        justifyContent: "space-between",
        padding: "12px 0",
        color: "#64748b",
        fontSize: "14px"
    },
    priceTotal: {
        borderTop: "1px solid #e2e8f0",
        marginTop: "12px",
        paddingTop: "12px",
        color: "#1e293b",
        fontWeight: "700",
        fontSize: "18px"
    },
    paymentOptions: {
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        marginBottom: "24px"
    },
    paymentOption: {
        display: "flex",
        alignItems: "center",
        padding: "16px 20px",
        border: "2px solid",
        borderRadius: "14px",
        cursor: "pointer",
        transition: "all 0.2s ease"
    },
    paymentIcon: {
        fontSize: "28px",
        marginRight: "16px"
    },
    paymentInfo: {
        flex: 1,
        display: "flex",
        flexDirection: "column"
    },
    paymentTitle: {
        fontWeight: "700",
        color: "#1e293b",
        fontSize: "15px"
    },
    paymentDesc: {
        fontSize: "12px",
        color: "#64748b",
        marginTop: "2px"
    },
    cardForm: {
        background: "#f8fafc",
        borderRadius: "16px",
        padding: "20px",
        marginBottom: "24px"
    },
    formTitle: {
        fontSize: "1rem",
        fontWeight: "700",
        color: "#1e293b",
        marginBottom: "16px",
        marginTop: 0
    },
    formGroup: {
        marginBottom: "12px"
    },
    formRow: {
        display: "flex",
        gap: "12px",
        marginBottom: "12px"
    },
    input: {
        width: "100%",
        padding: "14px 16px",
        borderRadius: "12px",
        border: "2px solid #e2e8f0",
        fontSize: "14px",
        outline: "none",
        transition: "all 0.2s ease",
        boxSizing: "border-box"
    },
    upiNote: {
        fontSize: "12px",
        color: "#64748b",
        marginTop: "8px"
    },
    bankGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "10px"
    },
    bankOption: {
        padding: "12px",
        borderRadius: "10px",
        border: "2px solid",
        cursor: "pointer",
        textAlign: "center",
        fontSize: "13px",
        fontWeight: "600",
        color: "#1e293b"
    },
    walletGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "10px"
    },
    walletOption: {
        padding: "12px",
        borderRadius: "10px",
        border: "2px solid",
        cursor: "pointer",
        textAlign: "center",
        fontSize: "13px",
        fontWeight: "600",
        color: "#1e293b"
    },
    buttonGroup: {
        display: "flex",
        gap: "12px"
    },
    cancelButton: {
        flex: 1,
        padding: "16px",
        background: "#ef4444",
        color: "white",
        border: "none",
        borderRadius: "14px",
        fontSize: "16px",
        fontWeight: "700",
        cursor: "pointer",
        transition: "all 0.3s ease"
    },
    continueButton: {
        flex: 2,
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
    continueButtonDisabled: {
        opacity: 0.5,
        cursor: "not-allowed"
    },
    processingSection: {
        textAlign: "center",
        padding: "40px 20px"
    },
    processingIconSmall: {
        width: "80px",
        height: "80px",
        background: "linear-gradient(135deg, #10b981, #059669)",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 24px",
        fontSize: "40px",
        color: "white"
    },
    processingTitle: {
        fontSize: "1.75rem",
        fontWeight: "800",
        color: "#1e293b",
        marginBottom: "12px"
    },
    processingText: {
        color: "#64748b",
        fontSize: "1rem",
        marginBottom: "16px"
    },
    redirectText: {
        color: "#94a3b8",
        fontSize: "14px"
    }
};

export default Payment;
