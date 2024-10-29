const {
  createAuthorizeSubscription,
  updateAuthorizeSubscription,
  cancelAuthorizeSubscription,
  getAuthorizeSubscriptionStatus,
} = require("../config/authorize");
const products = require("../config/products");
const Company = require("../models/company");
const jwt = require("jsonwebtoken");
const Subscription = require("../models/subscription");

const getPlans = (req, res) => {
  res.json({ message: "Success!", plans: products });
};

const createSubscription = (req, res) => {
  const token = req.cookies.token;
  jwt.verify(token, process.env.JWT_SECRET, async (err, company) => {
    if (err) {
      return res.status(403).json({ message: "Token is invalid" });
    }
    const companyData = await Company.findById(company.id);
    if (!companyData)
      return res.status(403).json({ message: "Token is invalid" });
    try {
      const subscriptionId = await createAuthorizeSubscription({
        customerProfileId: companyData.authorizeCustomerProfileId,
        productId: req.body.productId,
        ...req.body.paymentInfo,
      });

      const subscription = await Subscription.findOne({
        companyId: companyData._id,
      });
      if (subscription) {
        await cancelAuthorizeSubscription({
          subscriptionId: subscription.subscriptionId,
        });
        subscription.plan = req.body.productId;
        subscription.subscriptionId = subscriptionId;
      } else {
        await Subscription.create({
          companyId: companyData._id,
          plan: req.body.productId,
          subscriptionId,
        });
      }

      return res.json({ message: "Success!" });
    } catch (error) {
      return res.status(409).json({ message: error });
    }
  });
};

const updateSubscription = (req, res) => {
  const token = req.cookies.token;
  const productId = req.body.productId;
  jwt.verify(token, process.env.JWT_SECRET, async (err, company) => {
    if (err) {
      return res.status(403).json({ message: "Token is invalid" });
    }
    const companyData = await Company.findById(company.id);
    if (!companyData)
      return res.status(403).json({ message: "Token is invalid" });

    const subscription = await Subscription.findOne({
      companyId: companyData._id,
    });

    if (subscription.plan === productId)
      return res.json({ message: "You are already in the plan" });

    try {
      await updateAuthorizeSubscription({
        subscriptionId: companyData.authorizeCustomerProfileId,
        productId,
      });
      return res.json({ message: "Successfully updated!" });
    } catch (error) {
      return res.status(409).json({ message: error });
    }
  });
};

const cancelSubscription = (req, res) => {
  const token = req.cookies.token;

  jwt.verify(token, process.env.JWT_SECRET, async (err, company) => {
    if (err) {
      return res.status(403).json({ message: "Token is invalid" });
    }
    const companyData = await Company.findById(company.id);
    if (!companyData)
      return res.status(403).json({ message: "Token is invalid" });

    const subscription = await Subscription.findOne({
      companyId: companyData._id,
    });

    if (!subscription || !subscription.subscriptionId) {
      return res.json({ message: "Successfully cancelled" });
    }

    try {
      await cancelAuthorizeSubscription({
        subscriptionId: subscription.subscriptionId,
      });
      await subscription.deleteOne();

      res.json({ message: "Successfully cancelled" });
    } catch (error) {
      res.status(409).json({ message: error });
    }
  });
};

const checkSubcription = (req, res) => {
  const token = req.cookies.token;
  jwt.verify(token, process.env.JWT_SECRET, async (err, company) => {
    if (err) {
      return res.status(403).json({ message: "Token is invalid" });
    }
    const companyData = await Company.findById(company.id);
    if (!companyData)
      return res.status(403).json({ message: "Token is invalid" });

    const subscription = await Subscription.findOne({
      companyId: companyData._id,
    });

    if (
      !subscription ||
      !subscription.subscriptionId ||
      subscription.subscriptionId === ""
    ) {
      await subscription.deleteOne();
      return res.status(400).json({ message: "You are not in any plan" });
    }

    try {
      const { expired, product, endDate, nextPaymentDate } =
        await getAuthorizeSubscriptionStatus({
          subscriptionId: subscription.subscriptionId,
        });
      if (!expired) {
        return res.json({
          message: `You are in ${product.title}`,
          product,
          endDate,
          nextPaymentDate,
        });
      } else {
        return res.status(400).json({ message: "Your plan expired" });
      }
    } catch (error) {
      return res.status(400).json({ message: error });
    }
  });
};

module.exports = {
  getPlans,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  checkSubcription,
};
