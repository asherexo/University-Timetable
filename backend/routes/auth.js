const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

const router = express.Router();

// REGISTER API
router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }

    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)";
    db.query(query, [name, email, hashedPassword, role || 'student'], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: "User registered successfully" });
    });
});

// LOGIN API
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(401).json({ error: "User not found" });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Generate a JWT token
        if (user.role === "student") {
            db.query("SELECT course_id FROM student_courses WHERE student_id = ?", [user.id], (err, courses) => {
                if (err) return res.status(500).json({ error: err.message });
        
                const course_ids = courses.map(course => course.course_id);
                
                const tokenPayload = {
                    id: user.id,
                    role: user.role,
                    course_ids
                };
        
                const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1h' });
        
                res.json({ token, role: user.role, course_ids });
            });
        } else {
            const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.json({ token, role: user.role });
        }
    });
});
module.exports = router;
