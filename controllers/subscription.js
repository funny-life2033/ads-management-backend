const products = require("../config/products");

const getPlans = (req, res) => {
  res.json({ message: "Success!", plans: products });
};

module.exports = { getPlans };
