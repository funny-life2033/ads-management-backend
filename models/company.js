const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
  email: {
    type: String,
    trim: true,
    unique: true,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
  },
  authorizeCustomerProfileId: {
    type: String,
    required: true,
  },
});

const Company = mongoose.model("Company", companySchema);
module.exports = Company;
