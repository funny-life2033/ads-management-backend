const {
  createAuthorizeSubscription,
  updateAuthorizeSubscription,
  cancelAuthorizeSubscription,
  getAuthorizeSubscriptionStatus,
  updateAuthorizeCustomerPaymentProfile,
  getAuthorizeCustomerPaymentProfile,
  createAuthorizeSubscriptionFromCustomerProfile,
} = require("../config/authorize");
const products = require("../config/products");
const Company = require("../models/company");
const jwt = require("jsonwebtoken");

const getPlans = async (req, res) => {
  const token = req.cookies.token;
  jwt.verify(token, process.env.JWT_SECRET, async (err, company) => {
    if (err) {
      return res.status(403).json({ message: "Token is invalid" });
    }

    const companyData = await Company.findById(company.id);
    if (!companyData)
      return res.status(403).json({ message: "Token is invalid" });

    if (
      !companyData.authorizeSubscriptionId ||
      companyData.authorizeSubscriptionId === ""
    ) {
      return res.json({ message: "Success!", plans: products });
    }
    try {
      const { expired, isPending, product, nextPaymentDate, endDate } =
        await getAuthorizeSubscriptionStatus({
          subscriptionId: companyData.authorizeSubscriptionId,
        });

      return res.json({
        message: "Success!",
        plans: products.map((p) => ({
          ...p,
          isYourPlan: !expired && p.id === product.id,
          isPending: !expired && p.id === product.id && isPending,
          nextPaymentDate: !expired && !isPending && nextPaymentDate,
          endDate: !expired && !isPending && endDate,
        })),
      });
    } catch (_) {
      return res.json({
        message: "Success!",
        plans: products,
      });
    }
  });
};

const createSubscription = (req, res) => {
  const token = req.cookies.token;
  const requiringProduct = products.find(
    (product) => product.id === req.body.productId
  );
  if (!requiringProduct) {
    return res.status(400).json({ message: "Invalid membership ID!" });
  }
  jwt.verify(token, process.env.JWT_SECRET, async (err, company) => {
    if (err) {
      return res.status(403).json({ message: "Token is invalid" });
    }
    const companyData = await Company.findById(company.id);
    if (!companyData)
      return res.status(403).json({ message: "Token is invalid" });

    if (
      companyData.authorizeSubscriptionId &&
      companyData.authorizeSubscriptionId !== ""
    ) {
      try {
        const { product } = await getAuthorizeSubscriptionStatus({
          subscriptionId: companyData.authorizeSubscriptionId,
        });

        if (product) {
          if (requiringProduct.id === product.id) {
            return res
              .status(400)
              .json({ message: "You are already in the plan" });
          } else {
            if (req.body.paymentInfo) {
              await updateAuthorizeCustomerPaymentProfile({
                customerProfileId: companyData.authorizeCustomerProfileId,
                customerPaymentProfileId:
                  companyData.authorizeCustomerPaymentProfileId,
                ...req.body.paymentInfo,
              });
            }

            await cancelAuthorizeSubscription({
              subscriptionId: companyData.authorizeSubscriptionId,
            });

            const { subscriptionId } =
              await createAuthorizeSubscriptionFromCustomerProfile({
                customerProfileId: companyData.authorizeCustomerProfileId,
                customerPaymentProfileId:
                  companyData.authorizeCustomerPaymentProfileId,
                productId: requiringProduct.id,
              });
            companyData.authorizeSubscriptionId = subscriptionId;
            await companyData.save();
            return res.json({ message: "Successfully updated!" });
          }
        }
      } catch (error) {
        console.log(error);
      }
    }

    if (!req.body.paymentInfo)
      return res
        .status(400)
        .json({ message: "Please provide your payment info" });

    try {
      if (
        companyData.authorizeCustomerPaymentProfileId &&
        companyData.authorizeCustomerProfileId
      ) {
        await updateAuthorizeCustomerPaymentProfile({
          customerProfileId: companyData.authorizeCustomerProfileId,
          customerPaymentProfileId:
            companyData.authorizeCustomerPaymentProfileId,
          ...req.body.paymentInfo,
        });

        const { subscriptionId } =
          await createAuthorizeSubscriptionFromCustomerProfile({
            customerProfileId: companyData.authorizeCustomerProfileId,
            customerPaymentProfileId:
              companyData.authorizeCustomerPaymentProfileId,
            productId: requiringProduct.id,
          });

        companyData.authorizeSubscriptionId = subscriptionId;

        await companyData.save();

        return res.json({ message: "Success!" });
      }

      const { subscriptionId, customerProfileId, customerPaymentProfileId } =
        await createAuthorizeSubscription({
          productId: req.body.productId,
          ...req.body.paymentInfo,
          email: companyData.email,
        });

      companyData.authorizeSubscriptionId = subscriptionId;
      companyData.authorizeCustomerProfileId = customerProfileId;
      companyData.authorizeCustomerPaymentProfileId = customerPaymentProfileId;
      await companyData.save();

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

    try {
      await cancelAuthorizeSubscription({
        subscriptionId: companyData.authorizeSubscriptionId,
      });

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
    if (
      !companyData.authorizeSubscriptionId ||
      companyData.authorizeSubscriptionId === ""
    ) {
      return res.status(400).json({ message: "You have not any subscription" });
    }
    try {
      const { expired, isPending, product, endDate, nextPaymentDate } =
        await getAuthorizeSubscriptionStatus({
          subscriptionId: companyData.authorizeSubscriptionId,
        });
      const {
        cardNumber,
        cardCode,
        expiryDate,
        firstName,
        lastName,
        address,
        city,
        state,
        zipCode,
        country,
      } = await getAuthorizeCustomerPaymentProfile({
        customerProfileId: companyData.authorizeCustomerProfileId,
        customerPaymentProfileId: companyData.authorizeCustomerPaymentProfileId,
      });
      if (!expired) {
        return res.json({
          message: `You are in ${product.title}`,
          product,
          endDate,
          nextPaymentDate,
          isPending,
          paymentInfo: {
            cardNumber,
            cardCode,
            expiryDate,
            firstName,
            lastName,
            address,
            city,
            state,
            zipCode,
            country,
          },
        });
      } else {
        return res.status(400).json({
          message: "Your plan expired",
          paymentInfo: {
            cardNumber,
            cardCode,
            expiryDate,
            firstName,
            lastName,
            address,
            city,
            state,
            zipCode,
            country,
          },
        });
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