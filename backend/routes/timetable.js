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

/**
 * GET /timetable - Fetch all timetable entries
 */
router.get('/', authMiddleware, (req, res) => {
    let query;
    let params = [];

    if (req.user.role === "admin") {
        // Admins see all timetable entries with subject and classroom names, ordered properly
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
        // Ensure course_ids is valid
        if (!req.user.course_ids || req.user.course_ids.length === 0) {
            return res.json([]); // Return empty array if no courses are assigned
        }

        // Students see only their assigned courses, ordered properly
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

/**
 * POST /timetable - Add a new timetable entry (Admin only)
 */
router.post("/", authMiddleware, (req, res) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Access Denied: Admins only" });
    }

    // Include subject_id in the request body
    const { course_id, subject_id, classroom_id, day, time_slot } = req.body;

    // Debugging Log - Check incoming values
    console.log("Received Data for Timetable Entry:", { course_id, subject_id, classroom_id, day, time_slot });

    if (!course_id || !subject_id || !classroom_id || !day || !time_slot) {
        return res.status(400).json({ error: "All fields are required" });
    }

    // Step 1: Check if the room is already booked
    const checkQuery = "SELECT * FROM timetable WHERE classroom_id = ? AND day = ? AND time_slot = ?";
    db.query(checkQuery, [classroom_id, day, time_slot], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        if (results.length > 0) {
            return res.status(400).json({ error: "Room is already booked for this time slot" });
        }

        // Step 2: Insert new timetable entry with subject_id
        const insertQuery = "INSERT INTO timetable (course_id, subject_id, classroom_id, day, time_slot) VALUES (?, ?, ?, ?, ?)";
        console.log("Executing Query:", insertQuery, [course_id, subject_id, classroom_id, day, time_slot]); // Log Query

        db.query(insertQuery, [course_id, subject_id, classroom_id, day, time_slot], (err, result) => {
            if (err) {
                console.error("SQL Error:", err.message); // Log SQL Errors
                return res.status(500).json({ error: err.message });
            }

            res.status(201).json({ message: "Timetable entry added successfully" });
        });
    });
});
/**
 * PUT /timetable/:id - Update a timetable entry (Admin only)
 */
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

/**
 * DELETE /timetable/:id - Delete a timetable entry (Admin only)
 */
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