const express = require("express");
const { register, login, logout, isAuth } = require("../controllers/auth");

const router = express.Router();

router.post("/login", login);
router.get("/logout", logout);
router.post("/register", register);
router.get("/isAuth", isAuth);

module.exports = router;
