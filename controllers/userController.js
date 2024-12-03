const db = require("../models/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");

// Hash password utility
const hashPassword = async (password) => await bcrypt.hash(password, 10);

// Generate JWT utility
const generateToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, isAdmin: user.isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

// Register User
exports.registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { name, email, password } = req.body;
  try {
    const hashedPassword = await hashPassword(password);
    await db.query(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashedPassword]
    );
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Registration failed", error: err.message });
  }
};

// Login User
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const [user] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (!user.length) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log("User verification status:", user[0].verified); // Debug

    if (!user[0].verified) {
      return res.status(403).json({ message: "User is not verified" });
    }

    const isMatch = await bcrypt.compare(password, user[0].password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user[0].id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.status(200).json({ token });
  } catch (err) {
    console.error("Login User Error:", err.message);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};

// Verify User
exports.verifyUser = async (req, res) => {
  const { email } = req.body;
  try {
    const [user] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (!user) return res.status(404).json({ message: "User not found" });

    await db.query("UPDATE users SET verified = TRUE WHERE email = ?", [email]);
    res.json({ message: "User verified successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Verification failed", error: err.message });
  }
};

// Get User Details
exports.getUserDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const [user] = await db.query(
      "SELECT id, name, email, verified, login_frequency, last_login, registration_date FROM users WHERE id = ?",
      [id]
    );
    if (!user.length) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user[0]);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error retrieving user details", error: err.message });
  }
};

// Update User Details
exports.updateUserDetails = async (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;

  try {
    const [user] = await db.query("SELECT * FROM users WHERE id = ?", [id]);
    if (!user.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const updates = [];
    const values = [];

    if (name) {
      updates.push("name = ?");
      values.push(name);
    }
    if (email) {
      updates.push("email = ?");
      values.push(email);
    }

    if (!updates.length) {
      return res.status(400).json({ message: "No updates provided" });
    }

    values.push(id);
    await db.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      values
    );
    res.json({ message: "User details updated successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating user details", error: err.message });
  }
};

// Delete User
exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query("DELETE FROM users WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting user", error: err.message });
  }
};

// Top 3 Users by Login Frequency
exports.topLoginUsers = async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT id, name, email, login_frequency FROM users ORDER BY login_frequency DESC LIMIT 3"
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({
      message: "Error retrieving top login users",
      error: err.message,
    });
  }
};

// List of Inactive Users
exports.inactiveUsers = async (req, res) => {
  const { period } = req.query; // Accept 'hour' or 'month'

  let condition;
  if (period === "hour") {
    condition = "last_login < DATE_SUB(NOW(), INTERVAL 1 HOUR)";
  } else if (period === "month") {
    condition = "last_login < DATE_SUB(NOW(), INTERVAL 1 MONTH)";
  } else {
    return res
      .status(400)
      .json({ message: 'Invalid period. Use "hour" or "month".' });
  }

  try {
    const [users] = await db.query(
      `SELECT id, name, email, last_login FROM users WHERE ${condition}`
    );
    res.json(users);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error retrieving inactive users", error: err.message });
  }
};

// Get All Users with Filtering and Pagination
exports.getAllUsers = async (req, res) => {
  const {
    page = 1,
    limit = 10,
    name,
    email,
    verified,
    startDate,
    endDate,
  } = req.query;
  const offset = (page - 1) * limit;

  let query =
    "SELECT id, name, email, verified, login_frequency, registration_date FROM users WHERE 1=1";
  const params = [];

  // Optional filters
  if (name) {
    query += " AND name LIKE ?";
    params.push(`%${name}%`);
  }
  if (email) {
    query += " AND email LIKE ?";
    params.push(`%${email}%`);
  }
  if (verified !== undefined) {
    query += " AND verified = ?";
    params.push(verified === "true");
  }
  if (startDate && endDate) {
    query += " AND registration_date BETWEEN ? AND ?";
    params.push(new Date(startDate), new Date(endDate));
  }

  try {
    const [users] = await db.query(`${query} LIMIT ? OFFSET ?`, [
      ...params,
      parseInt(limit),
      offset,
    ]);
    const [[{ total }]] = await db.query("SELECT COUNT(*) AS total FROM users");

    res.json({ total, page: parseInt(page), limit: parseInt(limit), users });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error retrieving users", error: err.message });
  }
};
