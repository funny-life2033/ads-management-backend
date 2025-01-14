const { cancelAuthorizeSubscription } = require("../config/authorize");
const Ads = require("../models/ads");
const Company = require("../models/company");

const getCompanyList = async (req, res) => {
  const companies = await Company.find({ isAdmin: false });
  let ads = await Ads.find({});
  const companyList = [];

  for (const company of companies) {
    companyList.push({
      id: company._id.toString(),
      name: company.name,
      email: company.email,
      blocked: company.isBlocked,
      adsCount: ads.filter((ad) => company._id.equals(ad.companyId)).length,
    });
  }
  return res.json({ message: "Success", companyList });
};

const block = async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId);
    if (company) {
      if (company.isBlocked) {
        return res.json({ message: "The company is already blocked" });
      } else {
        company.isBlocked = true;
        await company.save();

        if (
          company.authorizeSubscriptionId &&
          company.authorizeSubscriptionId !== ""
        ) {
          await cancelAuthorizeSubscription({
            subscriptionId: company.authorizeSubscriptionId,
          });
        }
        return res.json({ message: "Successfully blocked!" });
      }
    } else {
      return res.status(400).json({ message: "The company doesn't exist!" });
    }
  } catch (error) {
    console.log("Blocking company error:", error);
    return res.status(500).json({ message: "Server error!" });
  }
};

const unblock = async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId);
    if (company) {
      if (!company.isBlocked) {
        return res.json({ message: "The company is already unblocked" });
      } else {
        company.isBlocked = false;
        await company.save();
        return res.json({ message: "Successfully unblocked!" });
      }
    } else {
      return res.status(400).json({ message: "The company doesn't exist!" });
    }
  } catch (error) {
    console.log("Blocking company error:", error);
    return res.status(500).json({ message: "Server error!" });
  }
};

const remove = async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId);

    if (company) {
      if (
        company.authorizeSubscriptionId &&
        company.authorizeSubscriptionId !== ""
      ) {
        await cancelAuthorizeSubscription({
          subscriptionId: company.authorizeSubscriptionId,
        });
      }
      const ads = await Ads.find({ companyId: company._id.toString() });
      for (const ad of ads) {
        await ad.deleteOne();
      }

      await company.deleteOne();

      return res.json({ message: "Successfully removed" });
    } else {
      res.json({ message: "The company is already removed" });
    }
  } catch (error) {
    console.log("Removing company error:", error);
    return res.status(500).json({ message: "Server error!" });
  }
};

module.exports = { getCompanyList, block, unblock, remove };
