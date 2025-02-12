const express = require("express");
const db = require("../config/db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

/**
 * ✅ GET /admin/students - Fetch all registered students
 */
router.get("/students", authMiddleware, (req, res) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Access Denied: Admins only" });
    }

    const query = `
        SELECT u.id, u.name, u.email, c.name AS course_name, c.id AS course_id
        FROM users u
        LEFT JOIN student_courses sc ON u.id = sc.student_id
        LEFT JOIN courses c ON sc.course_id = c.id
        WHERE u.role = 'student'
    `;

    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

/**
 * POST /admin/assign-courses - Assign courses to students
 */
router.post("/assign-course", authMiddleware, (req, res) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Access Denied: Admins only" });
    }

    const { student_id, course_id } = req.body;

    if (!student_id || !course_id) {
        return res.status(400).json({ error: "Student ID and Course ID are required" });
    }

    // Check if the student already has a course assigned
    const checkQuery = "SELECT * FROM student_courses WHERE student_id = ?";
    db.query(checkQuery, [student_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        if (results.length > 0) {
            // Student already has a course assigned, update it
            const updateQuery = "UPDATE student_courses SET course_id = ? WHERE student_id = ?";
            db.query(updateQuery, [course_id, student_id], (updateErr, updateResult) => {
                if (updateErr) return res.status(500).json({ error: updateErr.message });
                res.json({ message: "Course updated successfully" });
            });
        } else {
            // Student does not have a course assigned, insert new assignment
            const insertQuery = "INSERT INTO student_courses (student_id, course_id) VALUES (?, ?)";
            db.query(insertQuery, [student_id, course_id], (insertErr, insertResult) => {
                if (insertErr) return res.status(500).json({ error: insertErr.message });
                res.json({ message: "Course assigned successfully" });
            });
        }
    });
});

/**
 * ✅ PUT /admin/students/:id - Update student details (name, email)
 */
router.put("/students/:id", authMiddleware, (req, res) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Access Denied: Admins only" });
    }

    const { name, email } = req.body;
    const studentId = req.params.id;

    if (!name || !email) {
        return res.status(400).json({ error: "Name and email are required" });
    }

    const query = "UPDATE users SET name = ?, email = ? WHERE id = ? AND role = 'student'";

    db.query(query, [name, email, studentId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Student details updated successfully!" });
    });
});

/**
 * ✅ PUT /admin/students/:id/assign-course - Assign or Update a Student’s Course
 */
router.put("/students/:id/assign-course", authMiddleware, (req, res) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Access Denied: Admins only" });
    }

    const { course_id } = req.body;
    const studentId = req.params.id;

    if (!course_id) {
        return res.status(400).json({ error: "Course ID is required" });
    }

    // Remove existing course assignment first
    const deleteQuery = "DELETE FROM student_courses WHERE student_id = ?";
    db.query(deleteQuery, [studentId], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // Insert new course assignment
        const insertQuery = "INSERT INTO student_courses (student_id, course_id) VALUES (?, ?)";
        db.query(insertQuery, [studentId, course_id], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Course assigned successfully!" });
        });
    });
});

/**
 * ✅ DELETE /admin/students/:id - Delete a Student Account
 */
router.delete("/students/:id", authMiddleware, (req, res) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Access Denied: Admins only" });
    }

    const studentId = req.params.id;

    const query = "DELETE FROM users WHERE id = ? AND role = 'student'";

    db.query(query, [studentId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Student deleted successfully!" });
    });
});

//to fetch the assigned course
router.get('/student-courses', authMiddleware, (req, res) => {
    const { student_id } = req.query;

    if (!student_id) {
        return res.status(400).json({ error: "Student ID is required" });
    }

    const query = `
        SELECT courses.name FROM student_courses
        JOIN courses ON student_courses.course_id = courses.id
        WHERE student_courses.student_id = ?`;

    db.query(query, [student_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// to fetch all courses with its subjects
router.get("/courses-with-subjects", authMiddleware, (req, res) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Access Denied: Admins only" });
    }

    const query = `
        SELECT c.id AS course_id, c.code AS course_code, c.name AS course_name, 
               s.id AS subject_id, s.code AS subject_code, s.name AS subject_name
        FROM courses c
        LEFT JOIN subjects s ON c.id = s.course_id
        ORDER BY c.id, s.id
    `;

    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        const courses = {};
        results.forEach(row => {
            if (!courses[row.course_id]) {
                courses[row.course_id] = {
                    course_id: row.course_id,
                    course_code: row.course_code,
                    course_name: row.course_name,
                    subjects: []
                };
            }
            if (row.subject_id) {
                courses[row.course_id].subjects.push({
                    subject_id: row.subject_id,
                    subject_code: row.subject_code,
                    subject_name: row.subject_name
                });
            }
        });

        res.json(Object.values(courses));
    });
});

// to delete a course's subject
router.delete("/subjects/:subject_id", authMiddleware, (req, res) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Access Denied: Admins only" });
    }

    const { subject_id } = req.params;
    const query = "DELETE FROM subjects WHERE id = ?";
    
    db.query(query, [subject_id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Subject deleted successfully" });
    });
});

// to delete a course and it's subjects
router.delete("/courses/:course_id", authMiddleware, (req, res) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Access Denied: Admins only" });
    }

    const { course_id } = req.params;
    
    // First, delete subjects related to this course
    const deleteSubjectsQuery = "DELETE FROM subjects WHERE course_id = ?";
    db.query(deleteSubjectsQuery, [course_id], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // Then, delete the course
        const deleteCourseQuery = "DELETE FROM courses WHERE id = ?";
        db.query(deleteCourseQuery, [course_id], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            res.json({ message: "Course and its subjects deleted successfully" });
        });
    });
});

module.exports = router;