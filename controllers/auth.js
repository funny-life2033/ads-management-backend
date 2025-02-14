const Company = require("../models/company");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const register = async (req, res) => {
  const { email, name, password } = req.body;
  if (!email || email === "" || !password || password === "")
    return res.status(400).json({ message: "Email or password is empty!" });
  const company = await Company.findOne({ email: email.toLocaleLowerCase() });
  if (company)
    return res.status(409).json({ message: "Email already exists!" });
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const newCompany = new Company({
      name,
      email,
      password: hashedPassword,
    });
    await newCompany.save();

    const token = jwt.sign({ id: newCompany._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });
    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "Strict",
    });
    res.cookie("isAdmin", false, {
      sameSite: "Strict",
    });
    res.json({ message: "You have successfully registered!" });
  } catch (error) {
    console.log("error in new company registration:", error);
    res.status(400).json({ message: "Duplicated email address!" });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || email === "" || !password || password === "")
    return res.status(400).json({ message: "Email or password is empty!" });

  const company = await Company.findOne({ email });
  if (!company) return res.status(400).json({ message: "Email not found" });

  const isMatch = await bcrypt.compare(password, company.password);
  if (!isMatch) return res.status(400).json({ message: "Wrong password!" });
  const token = jwt.sign({ id: company._id }, process.env.JWT_SECRET, {
    expiresIn: "24h",
  });
  res.cookie("token", token, { sameSite: "Strict" });
  res.cookie("isAdmin", company.isAdmin, {
    sameSite: "Strict",
  });
  res.json({ message: "You have successfully logged in!" });
};

const logout = async (req, res) => {
  res.clearCookie("token");
  res.clearCookie("isAdmin");
  res.json({ message: "Logged out!" });
};

const isAuth = async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Not authenticated" });

  jwt.verify(token, process.env.JWT_SECRET, async (err, company) => {
    if (err) return res.status(403).json({ message: "Token is invalid!" });
    const companyData = await Company.findById(company.id);
    if (companyData)
      return res.json({
        message: "Authenticated",
        company: { name: companyData.name, email: companyData.email },
      });
    else return res.status(400).json({ message: "Invalid Token" });
  });
};

module.exports = { register, login, logout, isAuth };
