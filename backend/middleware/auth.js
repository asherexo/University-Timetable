const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.header("Authorization");

    if (!token) {
        console.log("No token received");  // Debugging
        return res.status(401).json({ error: "Access Denied" });
    }

    try {
        console.log("Received Token:", token);  // Debugging
        const tokenValue = token.startsWith("Bearer ") ? token.slice(7) : token;
        console.log("Token after stripping 'Bearer':", tokenValue);  // Debugging

        const verified = jwt.verify(tokenValue, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        console.error("JWT Verification Error:", err.message);
        res.status(400).json({ error: "Invalid Token" });
    }
};