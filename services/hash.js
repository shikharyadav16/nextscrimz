const bcrypt = require("bcryptjs");

async function hashPassword(password) {
    try {
        const saltRounds = 10;;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        return hashedPassword;
    } catch (err) {
        console.log("Error:", err);
    }
}

async function verifyPassword(password, hashedPassword) {
    try {
        const match = await bcrypt.compare(password, hashedPassword);
        return match;
    } catch (err) {
        console.log("Error:", err);
    }
}

module.exports = { hashPassword, verifyPassword };