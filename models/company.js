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
  authorizeSubscriptionId: {
    type: String,
    unique: true,
  },
  authorizeCustomerProfileId: {
    type: String,
    unique: true,
  },
  authorizeCustomerPaymentProfileId: {
    type: String,
    unique: true,
  },
});

const Company = mongoose.model("Company", companySchema);
module.exports = Company;
