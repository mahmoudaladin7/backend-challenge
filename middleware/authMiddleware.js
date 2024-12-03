const jwt = require("jsonwebtoken");

// Authenticate JWT
exports.authenticateJWT = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error("JWT verification error:", err.message); // Debug
      return res.status(403).json({ message: "Invalid token" });
    }
    req.user = user;
    next();
  });
};

// Authorize Admin
exports.authorizeAdmin = (req, res, next) => {
  if (!req.user.isAdmin)
    return res.status(403).json({ message: "Admin privileges required" });
  next();
};

exports.getAllUsers = async (req, res) => {
  const { page = 1, limit = 10, name, email, verified } = req.query;
  const offset = (page - 1) * limit;

  let query = "SELECT * FROM users WHERE 1=1";
  const params = [];

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

  try {
    const [users] = await db.query(`${query} LIMIT ? OFFSET ?`, [
      ...params,
      parseInt(limit),
      offset,
    ]);
    const [[{ total }]] = await db.query(
      "SELECT COUNT(*) AS total FROM users WHERE 1=1"
    );

    res.json({ total, users });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error retrieving users", error: err.message });
  }
};
