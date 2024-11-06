const mongoose = require("mongoose");

const adsSchema = new mongoose.Schema({
  banner: {
    type: String,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  link: {
    type: String,
    required: true,
  },
  companyId: {
    type: mongoose.Types.ObjectId,
    ref: "company",
    required: true,
    unique: true,
  },
  isAvailable: {
    type: Boolean,
  },
});

const Ads = mongoose.model("Ads", adsSchema);
module.exports = Ads;
