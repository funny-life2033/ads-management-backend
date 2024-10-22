const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
  },
});

const Company = mongoose.model("Company", companySchema);
module.exports = Company;
