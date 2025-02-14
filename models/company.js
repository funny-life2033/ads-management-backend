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
  },
  authorizeCustomerProfileId: {
    type: String,
  },
  authorizeCustomerPaymentProfileId: {
    type: String,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
});

const Company = mongoose.model("Company", companySchema);
module.exports = Company;
