const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();


// to fetch available classrooms based on day and time slot.
router.get('/available-classrooms', authMiddleware, (req, res) => {
    const { day, time_slot } = req.query;

    if (!day || !time_slot) {
        return res.status(400).json({ error: "Day and time slot are required" });
    }

    const query = `
        SELECT c.id, c.room_name, c.capacity
        FROM classrooms c
        WHERE c.id NOT IN (
            SELECT classroom_id FROM timetable WHERE day = ? AND time_slot = ?
        )`;

    db.query(query, [day, time_slot], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

//to Fetch all timetable entries
router.get('/', authMiddleware, (req, res) => {
    let query;
    let params = [];

    if (req.user.role === "admin") {
        query = `
            SELECT t.id, c.name AS course_name, s.name AS subject_name, 
                   cl.room_name, t.day, t.time_slot
            FROM timetable t
            JOIN courses c ON t.course_id = c.id
            JOIN subjects s ON t.subject_id = s.id
            JOIN classrooms cl ON t.classroom_id = cl.id
            ORDER BY c.name, s.name, t.day, t.time_slot;
        `;
    } else {
        
        if (!req.user.course_ids || req.user.course_ids.length === 0) {
            return res.json([]);
        }

        
        query = `
            SELECT t.id, c.name AS course_name, s.name AS subject_name, 
                   cl.room_name, t.day, t.time_slot
            FROM timetable t
            JOIN courses c ON t.course_id = c.id
            JOIN subjects s ON t.subject_id = s.id
            JOIN classrooms cl ON t.classroom_id = cl.id
            WHERE t.course_id IN (?)
            ORDER BY c.name, s.name, t.day, t.time_slot;
        `;
        params = [req.user.course_ids];
    }

    db.query(query, params, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// to Add a new timetable entry for admin only
router.post("/", authMiddleware, (req, res) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Access Denied: Admins only" });
    }

    const { course_id, subject_id, classroom_id, day, time_slot } = req.body;

    console.log("Received Data for Timetable Entry:", { course_id, subject_id, classroom_id, day, time_slot });

    if (!course_id || !subject_id || !classroom_id || !day || !time_slot) {
        return res.status(400).json({ error: "All fields are required" });
    }

    const checkQuery = "SELECT * FROM timetable WHERE classroom_id = ? AND day = ? AND time_slot = ?";
    db.query(checkQuery, [classroom_id, day, time_slot], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        if (results.length > 0) {
            return res.status(400).json({ error: "Room is already booked for this time slot" });
        }

        const insertQuery = "INSERT INTO timetable (course_id, subject_id, classroom_id, day, time_slot) VALUES (?, ?, ?, ?, ?)";
        console.log("Executing Query:", insertQuery, [course_id, subject_id, classroom_id, day, time_slot]);

        db.query(insertQuery, [course_id, subject_id, classroom_id, day, time_slot], (err, result) => {
            if (err) {
                console.error("SQL Error:", err.message); 
                return res.status(500).json({ error: err.message });
            }

            res.status(201).json({ message: "Timetable entry added successfully" });
        });
    });
});

//Update a timetable entry for admin only
router.put('/:id', authMiddleware, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Access Denied: Admins only" });
    }

    const { course_id, classroom_id, day, time_slot } = req.body;
    const { id } = req.params;

    if (!course_id || !classroom_id || !day || !time_slot) {
        return res.status(400).json({ error: "All fields are required" });
    }

    const query = "UPDATE timetable SET course_id = ?, classroom_id = ?, day = ?, time_slot = ? WHERE id = ?";
    db.query(query, [course_id, classroom_id, day, time_slot, id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Timetable entry updated successfully" });
    });
});

//Delete a timetable entry for admin only
router.delete('/:id', authMiddleware, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Access Denied: Admins only" });
    }

    const { id } = req.params;
    const query = "DELETE FROM timetable WHERE id = ?";
    db.query(query, [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Timetable entry deleted successfully" });
    });
});

module.exports = router;