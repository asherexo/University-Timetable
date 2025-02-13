const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// to fetch all courses
router.get('/', authMiddleware, (req, res) => {
    db.query("SELECT id, code, name FROM courses", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// to add a new course for admin only 
router.post('/', authMiddleware, (req, res) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Access Denied: Admins only" });
    }

    const { code, name } = req.body;
    if (!code || !name) {
        return res.status(400).json({ error: "Course code and name are required" });
    }

    db.query("INSERT INTO courses (code, name) VALUES (?, ?)", [code, name], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Course added successfully", course_id: result.insertId });
    });
});

module.exports = router;