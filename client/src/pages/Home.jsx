import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import "./Home.css";

function Home() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookingData, setBookingData] = useState({
    roomType: "Single Room"
  });
  const [activeFaq, setActiveFaq] = useState(null);
  const [showAvailableRooms, setShowAvailableRooms] = useState(false);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState("");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: "" });
  const [reviews, setReviews] = useState([
    { name: "Sarah Johnson", rating: 5, comment: "Absolutely wonderful experience!", date: "2024-01-15" },
    { name: "Michael Chen", rating: 5, comment: "We had an amazing stay. The kids loved the amenities!", date: "2024-01-10" },
    { name: "Emily Davis", rating: 5, comment: "Great value for money, clean rooms, and excellent service.", date: "2024-01-05" }
  ]);

  useEffect(() => {
    const email = localStorage.getItem("userEmail");
    if (email) {
      setIsLoggedIn(true);
      setUserEmail(email);
    }

    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    setIsLoggedIn(false);
    navigate("/login");
  };

  const handleBookNow = async (roomType) => {
    if (!isLoggedIn) {
      alert("Please login to book a room.");
      navigate("/login");
      return;
    }
    
    const userRole = localStorage.getItem("userRole");
    if (userRole === "admin") {
      alert("Admin users cannot book rooms. Please use the admin dashboard.");
      navigate("/admin");
      return;
    }
    
    // Navigate directly to payment with room type
    navigate("/payment", { state: { roomType: roomType, isChangeBooking: true } });
  };

  const fetchAvailableRooms = async () => {
    setLoadingRooms(true);
    try {
      const roomTypeKey = bookingData.roomType.replace(" Room", "");
      const res = await axios.get(`http://localhost:5000/rooms/available/${roomTypeKey}`);
      setAvailableRooms(res.data);
      setShowAvailableRooms(true);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      setAvailableRooms([]);
      setShowAvailableRooms(true);
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleCheckAvailability = async (e) => {
    e.preventDefault();
    fetchAvailableRooms();
  };

  const handleSelectRoomAndPay = () => {
    if (!selectedRoom) {
      alert("Please select a room first!");
      return;
    }
    if (!isLoggedIn) {
      alert("Please login to book a room.");
      navigate("/login");
      return;
    }
    
    const userRole = localStorage.getItem("userRole");
    if (userRole === "admin") {
      alert("Admin users cannot book rooms. Please use the admin dashboard.");
      navigate("/admin");
      return;
    }
    
    navigate("/payment", { state: { 
      roomType: bookingData.roomType, 
      roomNumber: selectedRoom,
      isChangeBooking: true 
    }});
  };

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const getRoomPrice = (roomType) => {
    const prices = {
      "Single Room": 500,
      "Double Room": 800,
      "Deluxe Room": 1200,
      "Suite Room": 2500
    };
    return prices[roomType] || 500;
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!reviewData.comment.trim()) {
      alert("Please write a review comment");
      return;
    }
    const newReview = {
      name: userEmail ? userEmail.split('@')[0] : "Guest",
      rating: reviewData.rating,
      comment: reviewData.comment,
      date: new Date().toISOString().split('T')[0]
    };
    setReviews([newReview, ...reviews]);
    setShowReviewModal(false);
    setReviewData({ rating: 5, comment: "" });
    alert("Thank you for your review!");
  };

  const faqs = [
    {
      question: "What are the check-in and check-out times?",
      answer: "Check-in time is 2:00 PM and check-out time is 12:00 PM. Early check-in and late check-out can be arranged upon request, subject to availability."
    },
    {
      question: "Is parking available at the property?",
      answer: "Yes, we provide free parking for all guests. Our parking area is secure and monitored 24/7 for your safety."
    },
    {
      question: "What amenities are included in the room?",
      answer: "All rooms include high-speed WiFi, air conditioning, flat-screen TV, minibar, and en-suite bathroom. Deluxe rooms and suites include additional amenities like kitchenette and balcony."
    },
    {
      question: "Can I cancel or modify my booking?",
      answer: "Yes, you can cancel or modify your booking up to 48 hours before check-in. Cancellation policies may vary based on room type and season."
    },
    {
      question: "Is breakfast included in the room rate?",
      answer: "Breakfast is included in Deluxe Room and Suite bookings. For Single and Double rooms, breakfast can be added at an additional cost."
    }
  ];

  const amenities = [
    { icon: "📶", title: "High-Speed WiFi", desc: "Free internet access" },
    { icon: "❄️", title: "Air Conditioning", desc: "Climate controlled rooms" },
    { icon: "🅿️", title: "Free Parking", desc: "Secure parking area" },
    { icon: "🍳", title: "Breakfast", desc: "Delicious morning meal" },
    { icon: "🏊", title: "Swimming Pool", desc: "Relax and unwind" },
    { icon: "💪", title: "Gym", desc: "24/7 fitness center" },
    { icon: "🍽️", title: "Restaurant", desc: "Fine dining experience" },
    { icon: "🧺", title: "Laundry", desc: "Self-service laundry" }
  ];

  return (
    <div className="home-container">
      {/* Make My Trip Style Navbar */}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="navbar-container">
          {/* Logo Section */}
          <div className="navbar-logo">
            <div className="logo-icon">🏠</div>
            <span className="logo-text">S.R. Residency</span>
          </div>

          {/* Main Navigation */}
          <div className={`navbar-menu ${mobileMenuOpen ? 'active' : ''}`}>
            <div className="nav-item">
              <a href="#rooms" className="nav-link">Rooms</a>
              <div className="nav-dropdown">
                <a href="#rooms">Single Room</a>
                <a href="#rooms">Double Room</a>
                <a href="#rooms">Deluxe Room</a>
                <a href="#rooms">Suite Room</a>
              </div>
            </div>
            <div className="nav-item">
              <a href="#amenities" className="nav-link">Amenities</a>
              <div className="nav-dropdown">
                <a href="#amenities">WiFi & Internet</a>
                <a href="#amenities">Parking</a>
                <a href="#amenities">Swimming Pool</a>
                <a href="#amenities">Restaurant</a>
                <a href="#amenities">Gym</a>
              </div>
            </div>
            <div className="nav-item">
              <a href="#about" className="nav-link">About</a>
            </div>
            <div className="nav-item">
              <a href="#faq" className="nav-link">FAQ</a>
            </div>
          </div>

          {/* Right Side - CTA & User */}
          <div className="navbar-actions">
            <button className="check-availability-btn" onClick={() => document.getElementById('rooms').scrollIntoView({ behavior: 'smooth' })}>
              <span className="btn-icon">🔍</span>
              <span className="btn-text">Check Availability</span>
            </button>
            
            {isLoggedIn ? (
              <div className="user-dropdown">
                <button className="user-avatar">
                  <span className="avatar-icon">👤</span>
                  <span className="avatar-arrow">▼</span>
                </button>
                <div className="user-menu">
                  <div className="user-info">
                    <span className="user-email">{userEmail}</span>
                  </div>
                  <Link to="/dashboard" className="user-menu-item">📊 Dashboard</Link>
                  <button onClick={handleLogout} className="user-menu-item logout">🚪 Logout</button>
                </div>
              </div>
            ) : (
              <div className="auth-buttons">
                <Link to="/login" className="login-btn">Login</Link>
                <Link to="/register" className="signup-btn">Sign Up</Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className={`hamburger ${mobileMenuOpen ? 'active' : ''}`} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="hero">
        <div className="hero-content">
          <div className="hero-badge">
            ✨ Premium Living Spaces Available
          </div>
          <h1>
            Find Your Perfect <span>Home Away From Home</span>
          </h1>
          <p>
            Experience luxury living with world-class amenities, 
            comfortable rooms, and exceptional service. Book your dream stay today.
          </p>
          <div className="hero-cta">
            <button className="btn-primary" onClick={() => document.getElementById('rooms').scrollIntoView({ behavior: 'smooth' })}>
              Explore Rooms
            </button>
            <button className="btn-secondary" onClick={() => document.getElementById('about').scrollIntoView({ behavior: 'smooth' })}>
              Learn More
            </button>
          </div>
        </div>

        <div className="hero-stats">
          <div className="stat-item">
            <div className="stat-number">500+</div>
            <div className="stat-label">Happy Guests</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">50+</div>
            <div className="stat-label">Premium Rooms</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">4.9</div>
            <div className="stat-label">Rating</div>
          </div>
        </div>
      </div>

      {/* Booking Bar - MakeMyTrip Style */}
      <div className="booking-bar">
        <form className="booking-form" onSubmit={handleCheckAvailability}>
          <div className="booking-field">
            <label>Room Type</label>
            <select 
              value={bookingData.roomType}
              onChange={(e) => {
                setBookingData({...bookingData, roomType: e.target.value});
                setShowAvailableRooms(false);
                setSelectedRoom("");
              }}
            >
              <option value="Single Room">Single Room - $500</option>
              <option value="Double Room">Double Room - $800</option>
              <option value="Deluxe Room">Deluxe Room - $1200</option>
              <option value="Suite Room">Suite Room - $2500</option>
            </select>
          </div>
          <button type="submit" className="booking-btn">
            🔍 Check Availability
          </button>
        </form>
      </div>

      {/* Available Rooms Modal - MakeMyTrip Style */}
      {showAvailableRooms && (
        <div className="available-rooms-modal">
          <div className="available-rooms-content">
            <div className="available-rooms-header">
              <h3>Select Your Room - {bookingData.roomType}</h3>
              <button className="close-btn" onClick={() => setShowAvailableRooms(false)}>✕</button>
            </div>
            
            {loadingRooms ? (
              <div className="loading-rooms">
                <div className="spinner"></div>
                <p>Finding available rooms...</p>
              </div>
            ) : (
              <>
                {availableRooms.length > 0 ? (
                  <div className="rooms-grid">
                    {availableRooms.map(room => (
                      <div 
                        key={room}
                        className={`room-option ${selectedRoom === room ? 'selected' : ''}`}
                        onClick={() => setSelectedRoom(room)}
                      >
                        <span className="room-number">🏢 Room {room}</span>
                        {selectedRoom === room && <span className="check-icon">✓ Selected</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-rooms">No rooms available for this type</p>
                )}
                
                {/* Booking Summary - MakeMyTrip Style */}
                <div className="booking-summary">
                  <div className="summary-header">
                    <h4>Booking Summary</h4>
                  </div>
                  <div className="summary-row">
                    <span>Room Type</span>
                    <span>{bookingData.roomType}</span>
                  </div>
                  <div className="summary-row">
                    <span>Selected Room</span>
                    <span>{selectedRoom ? `Room ${selectedRoom}` : "Select a room"}</span>
                  </div>
                  <div className="summary-row">
                    <span>Price per month</span>
                    <span>${getRoomPrice(bookingData.roomType)}</span>
                  </div>
                  <div className="summary-row total">
                    <span>Total Amount</span>
                    <span>${getRoomPrice(bookingData.roomType)}/month</span>
                  </div>
      
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Available Homes Section */}
      <section className="available-homes" id="rooms">
        <div className="section-header">
          <span className="section-tag">Our Rooms</span>
          <h2 className="section-title">Choose Your Perfect Space</h2>
          <p className="section-subtitle">
            Discover our range of beautifully designed rooms tailored to meet your every need
          </p>
        </div>
        <div className="features">
          {roomOptions.map((room, index) => (
            <div key={index} className="feature-card">
              <div className="card-image">
                <img src={room.image} alt={room.type} />
                {room.popular && <span className="card-badge popular">Most Popular</span>}
                {!room.popular && <span className="card-badge">Available</span>}
              </div>
              <div className="card-content">
                <div className="card-header">
                  <h3 className="card-title">{room.type}</h3>
                  <div className="card-price">
                    {room.price} <span>/month</span>
                  </div>
                </div>
                <div className="card-amenities">
                  {room.amenities.slice(0, 4).map((amenity, i) => (
                    <span key={i} className="amenity-tag">
                      {amenity}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => handleBookNow(room.type.split(' ')[0])}
                  className="book-btn"
                >
                  Book Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Amenities Section */}
      <section className="amenities-section">
        <div className="section-header">
          <span className="section-tag">Why Choose Us</span>
          <h2 className="section-title">Premium Amenities</h2>
          <p className="section-subtitle">
            Enjoy our wide range of facilities designed for your comfort and convenience
          </p>
        </div>
        <div className="amenities-grid">
          {amenities.map((amenity, index) => (
            <div key={index} className="amenity-card">
              <div className="amenity-icon">{amenity.icon}</div>
              <div className="amenity-info">
                <h4>{amenity.title}</h4>
                <p>{amenity.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Reviews Section */}
      <section className="testimonials-section">
        <div className="section-header">
          <span className="section-tag" style={{background: 'rgba(255,255,255,0.1)', color: 'white'}}>Reviews</span>
          <h2 className="section-title">What Our Guests Say</h2>
          <p className="section-subtitle">
            Hear from our satisfied guests about their wonderful experiences
          </p>
        </div>
        
        {/* Rating Summary */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginBottom: '40px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', fontWeight: '800', color: '#fff' }}>4.9</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', marginTop: '8px' }}>Average Rating</div>
            <div style={{ color: '#fbbf24', fontSize: '24px', marginTop: '8px' }}>★★★★★</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', fontWeight: '800', color: '#fff' }}>{reviews.length}+</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', marginTop: '8px' }}>Total Reviews</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <button 
              onClick={() => setShowReviewModal(true)}
              style={{ 
                background: 'linear-gradient(135deg, #10b981, #059669)', 
                color: 'white', 
                border: 'none', 
                padding: '12px 24px', 
                borderRadius: '8px', 
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                marginTop: '10px'
              }}
            >
              Write a Review
            </button>
          </div>
        </div>

        <div className="testimonials-grid">
          {reviews.map((review, index) => (
            <div key={index} className="testimonial-card">
              <div className="testimonial-rating">
                {[...Array(review.rating)].map((_, i) => (
                  <span key={i} className="star">★</span>
                ))}
              </div>
              <p className="testimonial-text">{review.comment}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                <div style={{ fontWeight: '600', color: '#1e293b' }}>{review.name}</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>{review.date}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Review Modal */}
      {showReviewModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowReviewModal(false)}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%'
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, marginBottom: '24px', color: '#1e293b' }}>Write a Review</h2>
            <form onSubmit={handleSubmitReview}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>Rating</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewData({ ...reviewData, rating: star })}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '32px',
                        cursor: 'pointer',
                        color: star <= reviewData.rating ? '#fbbf24' : '#d1d5db',
                        transition: 'transform 0.2s'
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>Your Review</label>
                <textarea
                  value={reviewData.comment}
                  onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                  placeholder="Share your experience with us..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    minHeight: '120px',
                    resize: 'vertical'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#f1f5f9',
                    color: '#64748b',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'linear-gradient(135deg, #2563eb, #1e40af)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FAQ Section */}
      <section className="faq-section">
        <div className="section-header">
          <span className="section-tag">FAQ</span>
          <h2 className="section-title">Frequently Asked Questions</h2>
          <p className="section-subtitle">
            Find answers to common questions about our services and facilities
          </p>
        </div>
        <div className="faq-container">
          {faqs.map((faq, index) => (
            <div key={index} className={`faq-item ${activeFaq === index ? 'active' : ''}`}>
              <button className="faq-question" onClick={() => toggleFaq(index)}>
                <h4>{faq.question}</h4>
                <span className="faq-icon">+</span>
              </button>
              <div className="faq-answer">
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section className="about" id="about">
        <div className="about-content">
          <div className="about-text">
            <h2>Welcome to S.R. Residency</h2>
            <p>
              We provide premium living spaces designed for comfort and convenience. 
              Our mission is to create a welcoming community where residents can enjoy 
              modern amenities, secure living, and excellent service.
            </p>
            <div className="about-features">
              <div className="about-feature">
                <span className="about-feature-icon">✓</span>
                <span>24/7 Security</span>
              </div>
              <div className="about-feature">
                <span className="about-feature-icon">✓</span>
                <span>Maintenance Support</span>
              </div>
              <div className="about-feature">
                <span className="about-feature-icon">✓</span>
                <span>Community Events</span>
              </div>
              <div className="about-feature">
                <span className="about-feature-icon">✓</span>
                <span>Online Payments</span>
              </div>
            </div>
          </div>
          <div className="about-image">
            <div className="about-image-placeholder">
              🏢
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo" style={{color: 'white'}}>
              <div className="logo-icon">🏠</div>
              S.R. Residency
            </div>
            <p>
              Your trusted partner for premium living spaces. 
              We make finding your perfect home easy and comfortable.
            </p>
          </div>
          <div className="footer-column">
            <h4>Quick Links</h4>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/dashboard">Dashboard</Link></li>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/register">Register</Link></li>
            </ul>
          </div>
          <div className="footer-column">
            <h4>Room Types</h4>
            <ul>
              <li><a href="#rooms">Single Room</a></li>
              <li><a href="#rooms">Double Room</a></li>
              <li><a href="#rooms">Deluxe Room</a></li>
              <li><a href="#rooms">Suite Room</a></li>
            </ul>
          </div>
          <div className="footer-column">
            <h4>Contact</h4>
            <ul>
              <li><a href="#">support@srresidency.com</a></li>
              <li><a href="#">+1 234 567 8900</a></li>
              <li><a href="#">123 Main Street</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          © 2026 S.R. Residency. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

const roomOptions = [
  {
    type: "Single Room",
    price: "$500",
    amenities: ["🛏️ Single Bed", "🚿 Attached Washroom", "📶 WiFi", "💡 Electricity Extra"],
    popular: false,
    image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop"
  },
  {
    type: "Double Room",
    price: "$800",
    amenities: ["🛏️ Two Beds", "🛋️ Living Room", "🚿 Attached Washroom", "📶 WiFi Included"],
    popular: true,
    image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400&h=300&fit=crop"
  },
  {
    type: "Deluxe Room",
    price: "$1200",
    amenities: ["👑 King Bed", "🍳 Kitchenette", "🌅 Balcony View", "💡 All Included"],
    popular: false,
    image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400&h=300&fit=crop"
  },
  {
    type: "Suite Room",
    price: "$2500",
    amenities: ["🏠 3 Bedrooms", "🌳 Private Garden", "🚗 2 Car Parking", "✨ Fully Furnished"],
    popular: false,
    image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=300&fit=crop"
  }
];

export default Home;
