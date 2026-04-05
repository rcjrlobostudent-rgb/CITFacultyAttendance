// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const dsaService = require('./dsaService');
const Faculty = require('./models/Faculty');
const Attendance = require('./models/Attendance');

const app = express();
app.use(express.json());
app.use(cors({
    origin: ['https://cit-faculty-attendance-gf54.vercel.app', 'http://localhost:3000']
}));

// Connect to Local MongoDB
const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cit-attendance';
mongoose.connect(mongoURI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

// --- 1. ADMIN ROUTES ---

// Admin Login (Hardcoded for prototype simplicity)
app.post('/api/auth/admin-login', (req, res) => {
    const { username, password } = req.body;
    // In production, store admin credentials securely in DB.
    if (username === 'admin' && password === 'admin123') {
        res.json({ message: "Admin Login Successful", role: "admin" });
    } else {
        res.status(401).json({ message: "Invalid Admin Credentials" });
    }
});

// Admin Create Faculty Account
app.post('/api/admin/create-faculty', async (req, res) => {
    try {
        const { username, password, name } = req.body;
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Generate DSA Keys
        const { publicKey, privateKey } = dsaService.generateDSAKeys();

        const newFaculty = new Faculty({
            username,
            password: hashedPassword,
            name,
            publicKey,
            privateKey // Store private key for admin backup/recovery
        });
        await newFaculty.save();

        res.json({ 
            message: "Account created successfully.", 
            privateKeyToGiveToFaculty: privateKey // Sending to React Admin Dashboard
        });
    } catch (error) {
        res.status(500).json({ error: "Username might already exist or server error." });
    }
});

// --- 2. FACULTY ROUTES ---

// Faculty Login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const faculty = await Faculty.findOne({ username });

    if (!faculty || !(await bcrypt.compare(password, faculty.password))) {
        return res.status(401).json({ message: "Invalid username or password" });
    }
    
    res.json({ message: "Login successful", username: faculty.username, name: faculty.name, role: "faculty" });
});

// Faculty DSA Check-In/Out
app.post('/api/attendance', async (req, res) => {
    try {
        const { username, action, privateKey } = req.body; 
        
        const faculty = await Faculty.findOne({ username });
        if (!faculty) return res.status(404).json({ message: "Faculty not found" });

        const timestamp = new Date().toISOString();
        const dataToSign = `${faculty.name}-${action}-${timestamp}`;

        // FIX FOR POSTMAN/JSON COPY-PASTE ISSUE:
        // If the user pastes literal "\n", we convert them back to actual line breaks.
        let formattedKey = privateKey;
        if (formattedKey.includes('\\n')) {
            formattedKey = formattedKey.replace(/\\n/g, '\n');
        }

        // Create DSA Signature using the provided Private Key
        let signature;
        try {
            signature = dsaService.signData(formattedKey, dataToSign);
        } catch (err) {
            return res.status(400).json({ message: "Invalid DSA Private Key provided! Make sure you copied the entire key including BEGIN and END tags." });
        }

        // Verify the signature using the stored Public Key
        const isAuthentic = dsaService.verifyData(faculty.publicKey, dataToSign, signature);

        if (!isAuthentic) {
            return res.status(403).json({ message: "Authentication failed. Fake Key." });
        }

        // Save to Database
        const record = new Attendance({
            facultyName: faculty.name,
            action,
            timestamp,
            signature,
            isAuthentic
        });
        await record.save();

        res.json({ message: `${action} Successful!`, record });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Attendance Records
app.get('/api/attendance', async (req, res) => {
    const records = await Attendance.find().sort({ _id: -1 });
    res.json(records);
});

// Delete all records (Utility to clear the "Invalid Date" records)
app.delete('/api/attendance/clear', async (req, res) => {
    await Attendance.deleteMany({});
    res.json({ message: "All logs cleared." });
});

// --- 3. ADMIN KEY MANAGEMENT ROUTES ---

// Admin View All Faculty with Keys
app.get('/api/admin/faculty-list', async (req, res) => {
    try {
        const facultyList = await Faculty.find({}, { username: 1, name: 1, privateKey: 1, createdAt: 1 });
        res.json(facultyList);
    } catch (error) {
        res.status(500).json({ error: "Error fetching faculty list" });
    }
});

// Faculty Retrieve Their Own Private Key (requires password verification)
app.post('/api/faculty/retrieve-key', async (req, res) => {
    try {
        const { username, password } = req.body;
        const faculty = await Faculty.findOne({ username });

        if (!faculty || !(await bcrypt.compare(password, faculty.password))) {
            return res.status(401).json({ message: "Invalid username or password" });
        }

        res.json({ 
            message: "Private Key retrieved successfully",
            privateKey: faculty.privateKey,
            name: faculty.name
        });
    } catch (error) {
        res.status(500).json({ error: "Error retrieving private key" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));