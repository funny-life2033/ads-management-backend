const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, company) => {
    if (err) {
      return res.status(403).json({ message: "Token is not valid" });
    }
    req.company = company;
    next();
  });
};

module.exports = authMiddleware;
