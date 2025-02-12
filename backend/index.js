require('dotenv').config();

const express = require('express');
const cors = require('cors');
const db = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());


console.log("JWT_SECRET:", process.env.JWT_SECRET);  // Debugging line



// Import authentication routes
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// Import JWT authentication middleware
const authMiddleware = require('./middleware/auth');

// Import admin routes
const adminRoutes = require('./routes/admin');
app.use('/admin', adminRoutes);

// Import course routes
const courseRoutes = require('./routes/courses');
app.use('/courses', courseRoutes);

// Import timetable routes
const timetableRoutes = require('./routes/timetable');
app.use('/timetable', timetableRoutes);

// protect the '/timetable' route using JWT
app.get('/timetable', authMiddleware, (req, res) => {
    res.json({ message: "You have access to the timetable!" });
});

// 
const subjectsRoutes = require("./routes/subjects");
app.use("/subjects", subjectsRoutes);

//
const classroomsRoutes = require("./routes/classrooms");
app.use("/classrooms", classroomsRoutes);

// Root route
app.get('/', (req, res) => {
    res.send('University Timetable API is running');
});

const PORT = process.env.PORT || 5500;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));