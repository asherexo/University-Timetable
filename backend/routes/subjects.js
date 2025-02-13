const express = require("express");
const db = require("../config/db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// to get subjects with their course ids
router.get("/", authMiddleware, (req, res) => {
    const { course_id } = req.query;

    if (!course_id) {
        return res.status(400).json({ error: "Course ID is required" });
    }

    const query = "SELECT id, name, code FROM subjects WHERE course_id = ?";
    db.query(query, [course_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json(results);
    });
});

// to post the subjects
router.post("/", authMiddleware, (req, res) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Access Denied: Admins only" });
    }

    const { name, code, course_id } = req.body;

    if (!name || !code || !course_id) {
        return res.status(400).json({ error: "All fields are required" });
    }

    
    const checkQuery = "SELECT * FROM subjects WHERE code = ?";
    db.query(checkQuery, [code], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        if (results.length > 0) {
            return res.status(400).json({ error: "Subject code must be unique" });
        }

        
        const insertQuery = "INSERT INTO subjects (name, code, course_id) VALUES (?, ?, ?)";
        db.query(insertQuery, [name, code, course_id], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });

            res.status(201).json({ message: "Subject added successfully" });
        });
    });
});

module.exports = router;