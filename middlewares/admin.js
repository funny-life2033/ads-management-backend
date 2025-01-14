const jwt = require("jsonwebtoken");
const Company = require("../models/company");

const adminMiddleware = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(403).json({ message: "Not authenticated" });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, company) => {
    if (err) {
      return res.status(403).json({ message: "Token is not valid" });
    }
    const companyData = await Company.findById(company.id);
    if (!companyData || !companyData.isAdmin)
      return res.status(403).json({ message: "You don't have permission" });
    req.company = company;
    next();
  });
};

module.exports = adminMiddleware;
