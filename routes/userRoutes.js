const express = require("express");
const { body, query, param } = require("express-validator");
const {
  registerUser,
  loginUser,
  verifyUser,
  getUserDetails,
  updateUserDetails,
  deleteUser,
  getAllUsers,
  topLoginUsers,
  inactiveUsers,
} = require("../controllers/userController");
const {
  authenticateJWT,
  authorizeAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

// User Management Endpoints
router.post(
  "/register",
  [
    body("name").isLength({ min: 3 }).withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ],
  registerUser
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").exists().withMessage("Password is required"),
  ],
  loginUser
);

router.post(
  "/verify",
  [body("email").isEmail().withMessage("Valid email is required")],
  verifyUser
);

router.get("/user/:id", authenticateJWT, getUserDetails);
router.put(
  "/user/:id",
  authenticateJWT,
  [
    body("name").optional().isLength({ min: 3 }),
    body("email").optional().isEmail(),
  ],
  updateUserDetails
);
router.delete("/user/:id", authenticateJWT, deleteUser);

router.get("/users", authenticateJWT, authorizeAdmin, getAllUsers);
router.get("/users/top-logins", authenticateJWT, authorizeAdmin, topLoginUsers);
router.get("/users/inactive", authenticateJWT, authorizeAdmin, inactiveUsers);

module.exports = router;
