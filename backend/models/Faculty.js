// backend/models/Faculty.js
const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Hashed password for normal login
    name: { type: String, required: true },
    publicKey: { type: String, required: true }, // DSA Public Key (stored to verify signatures)
    privateKey: { type: String, required: true }, // DSA Private Key (stored for admin backup/recovery)
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Faculty', facultySchema);