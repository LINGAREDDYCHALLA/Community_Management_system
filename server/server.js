const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const app = express();

app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/communitymanagementsystem")
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Error:", err));

// User Model
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  password: String,
  role: { type: String, enum: ["user", "admin"], default: "user" },
  roomNumber: String,
  roomType: { type: String, enum: ["Single", "Double", "Deluxe", "Suite"], default: "Single" },
  paymentStatus: { type: String, enum: ["Paid", "Pending"], default: "Pending" },
  paymentMethod: { type: String, default: "" },
  bookingDate: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);

// Community Model
const communitySchema = new mongoose.Schema({
  name: String,
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
});

const Community = mongoose.model("Community", communitySchema);
const otpStore = new Map();

const normalizePhone = (phone = "") => phone.replace(/\D/g, "");

// Complement Model
const complementSchema = new mongoose.Schema({
  name: String,
  email: String,
  roomNumber: String,
  message: String,
  status: { type: String, enum: ["Pending", "Resolved"], default: "Pending" },
  adminResponse: { type: String, default: "" },
  assignedWorker: String,
  workerId: String,
  createdAt: { type: Date, default: Date.now },
  resolvedAt: Date
});

const Complement = mongoose.model("Complement", complementSchema);

// Room Ranges
const ROOM_RANGES = {
  Single: { start: 1, end: 100 },
  Double: { start: 101, end: 200 },
  Deluxe: { start: 301, end: 400 },
  Suite: { start: 401, end: 500 }
};

// OTP Send
app.post("/otp/send", async (req, res) => {
  try {
    const normalizedPhone = normalizePhone(req.body.phone);
    if (!/^\d{10}$/.test(normalizedPhone)) {
      return res.status(400).json({ message: "Enter a valid 10-digit phone number" });
    }
    const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
    const expiresAt = Date.now() + 5 * 60 * 1000;
    otpStore.set(normalizedPhone, { otp, expiresAt, verified: false });
    console.log(`OTP for ${normalizedPhone}: ${otp}`);
    res.json({ message: "OTP sent successfully", otp });
  } catch (error) {
    console.log("Send OTP Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// OTP Verify
app.post("/otp/verify", async (req, res) => {
  try {
    const normalizedPhone = normalizePhone(req.body.phone);
    const otp = (req.body.otp || "").trim();
    const record = otpStore.get(normalizedPhone);
    if (!record) return res.status(400).json({ message: "OTP not found" });
    if (Date.now() > record.expiresAt) {
      otpStore.delete(normalizedPhone);
      return res.status(400).json({ message: "OTP expired" });
    }
    if (record.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });
    otpStore.set(normalizedPhone, { ...record, verified: true });
    res.json({ message: "OTP verified successfully" });
  } catch (error) {
    console.log("Verify OTP Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Register
app.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password, role, roomNumber, roomType, paymentStatus } = req.body;
    const normalizedPhone = normalizePhone(phone);
    if (!/^\d{10}$/.test(normalizedPhone)) {
      return res.status(400).json({ message: "Phone number must be 10 digits" });
    }
    const otpRecord = otpStore.get(normalizedPhone);
    if (!otpRecord || !otpRecord.verified || Date.now() > otpRecord.expiresAt) {
      return res.status(400).json({ message: "Please verify OTP before registering" });
    }
    const existingUser = await User.findOne({ $or: [{ email }, { phone: normalizedPhone }] });
    if (existingUser) return res.status(400).json({ message: "Email or phone already exists" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name, email, phone: normalizedPhone, password: hashedPassword,
      role: role === "admin" ? "admin" : "user", roomNumber, roomType, paymentStatus: paymentStatus || "Pending"
    });
    await newUser.save();
    otpStore.delete(normalizedPhone);
    res.status(201).json({ message: "User Registered Successfully", role: newUser.role, email: newUser.email });
  } catch (error) {
    console.log("Register Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });
    res.status(200).json({ message: "Login Successful", role: user.role, email: user.email });
  } catch (error) {
    console.log("Login Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Available Rooms
app.get("/rooms/available/:roomType", async (req, res) => {
  try {
    const { roomType } = req.params;
    const range = ROOM_RANGES[roomType];
    if (!range) return res.status(400).json({ message: "Invalid room type" });
    const bookedRooms = await User.find({ roomType }).distinct("roomNumber");
    const availableRooms = [];
    for (let i = range.start; i <= range.end; i++) {
      const roomNum = i.toString();
      if (!bookedRooms.includes(roomNum)) availableRooms.push(roomNum);
    }
    res.json(availableRooms);
  } catch (error) {
    console.log("Available Rooms Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// User Profile
app.get("/user/profile/:email", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

// Book Room
app.post("/user/book-room", async (req, res) => {
  try {
    const { email, roomType, roomNumber, paymentStatus } = req.body;
    if (!roomNumber) return res.status(400).json({ message: "Room number is required" });
    const isBooked = await User.findOne({ roomNumber });
    if (isBooked && isBooked.email !== email) {
      return res.status(400).json({ message: "Room is already booked" });
    }
    const user = await User.findOneAndUpdate(
      { email },
      { roomType, roomNumber, paymentStatus: paymentStatus || "Pending" },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: `Successfully booked Room ${roomNumber} (${roomType})!`, roomNumber: user.roomNumber });
  } catch (error) {
    console.log("Book Room Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// User Settings
app.put("/user/settings", async (req, res) => {
  try {
    const { email, name, password, confirmPassword } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });
    const updates = {};
    if (typeof name === "string" && name.trim()) updates.name = name.trim();
    if (password) {
      if (password !== confirmPassword) return res.status(400).json({ message: "Passwords must match" });
      updates.password = await bcrypt.hash(password, 10);
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ message: "No valid fields provided" });
    const updatedUser = await User.findOneAndUpdate({ email }, { $set: updates }, { new: true }).select("-password");
    if (!updatedUser) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Settings updated successfully", user: updatedUser });
  } catch (error) {
    console.log("User Settings Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// User Complement
app.post("/user/complement", async (req, res) => {
  try {
    const { email, name, message } = req.body;
    if (!email || !message || !message.trim()) {
      return res.status(400).json({ message: "Email and message are required" });
    }
    const user = await User.findOne({ email: email.trim() }).select("roomNumber");
    const complement = await Complement.create({
      email: email.trim(), name: name?.trim() || "", message: message.trim(), roomNumber: user?.roomNumber || ""
    });
    res.status(201).json({ message: "Complement submitted successfully", complement });
  } catch (error) {
    console.log("User Complement Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

app.get("/user/complements/:email", async (req, res) => {
  try {
    const complements = await Complement.find({ email: req.params.email }).sort({ createdAt: -1 });
    res.json(complements);
  } catch (error) {
    console.log("User Complements Fetch Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Admin Complements
app.get("/admin/complements", async (req, res) => {
  try {
    const complements = await Complement.find().sort({ createdAt: -1 });
    res.json(complements);
  } catch (error) {
    console.log("Admin Complements Fetch Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

app.put("/admin/complements/:id/assign", async (req, res) => {
  try {
    const { assignedWorker, workerId } = req.body;
    const updated = await Complement.findByIdAndUpdate(
      req.params.id,
      { $set: { assignedWorker, workerId } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Complement not found" });
    res.json({ message: "Worker assigned successfully", complement: updated });
  } catch (error) {
    console.log("Assign Worker Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

app.put("/admin/complements/:id/resolve", async (req, res) => {
  try {
    const { adminResponse, assignedWorker } = req.body;
    const updated = await Complement.findByIdAndUpdate(
      req.params.id,
      { $set: { status: "Resolved", adminResponse: (adminResponse || "Resolved").trim(), assignedWorker: assignedWorker || undefined, resolvedAt: new Date() } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Complement not found" });
    res.json({ message: "Complement resolved successfully", complement: updated });
  } catch (error) {
    console.log("Resolve Complement Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Admin Stats
app.get("/admin/stats", async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: "user" });
    const totalPaid = await User.countDocuments({ paymentStatus: "Paid", role: "user" });
    const totalPending = await User.countDocuments({ paymentStatus: "Pending", role: "user" });
    const users = await User.find({ role: "user" }).select("-password");
    res.json({ totalUsers, totalPaid, totalPending, users });
  } catch (error) {
    console.log("Admin Stats Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Process Payment (Make My Trip Style)
app.post("/user/process-payment", async (req, res) => {
  try {
    const { email, roomType, roomNumber, paymentMethod, amount } = req.body;
    if (!email || !paymentMethod || !amount) {
      return res.status(400).json({ message: "Email, payment method, and amount are required" });
    }

    // Generate transaction ID
    const transactionId = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const paymentGateways = {
      "credit_card": "Visa/MasterCard Gateway",
      "debit_card": "Rupay Gateway",
      "upi": "UPI Gateway",
      "net_banking": "Net Banking Portal",
      "wallets": "Wallet Provider",
      "pay_later": "Pay at Reception"
    };

    // Simulate payment success (90% success rate for demo)
    const isSuccess = Math.random() > 0.1;
    if (!isSuccess) {
      return res.status(400).json({ message: "Payment failed. Please try again.", success: false });
    }

    // Check if room is already booked
    if (roomNumber) {
      const isBooked = await User.findOne({ roomNumber });
      if (isBooked && isBooked.email !== email) {
        return res.status(400).json({ message: "Room is already booked by another user" });
      }
    }

    // Update user with payment details and book room
    const user = await User.findOneAndUpdate(
      { email },
      { paymentStatus: "Paid", paymentMethod, roomType: roomType || undefined, roomNumber: roomNumber || undefined },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      success: true,
      message: "Payment processed successfully!",
      transactionId: transactionId,
      paymentMethod: paymentMethod,
      gateway: paymentGateways[paymentMethod] || "Payment Gateway",
      amount: amount,
      paymentStatus: "Paid",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.log("Process Payment Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Start Server
app.listen(5000, () => {
  console.log("Server running on port 5000");
});
