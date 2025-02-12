const express = require("express");
const db = require("../config/db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

//Route to get available classrooms based on day and time slot
router.get("/available-classrooms", authMiddleware, (req, res) => {
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
        if (err) {
            console.error("Error fetching available classrooms:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

module.exports = router;