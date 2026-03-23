// backend/models/Attendance.js
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    facultyName: { type: String, required: true },
    action: { type: String, enum: ['Check-In', 'Check-Out'], required: true },
    timestamp: { type: String, required: true },
    signature: { type: String, required: true }, // The DSA Signature generated during check-in
    isAuthentic: { type: Boolean, required: true }
});

module.exports = mongoose.model('Attendance', attendanceSchema);