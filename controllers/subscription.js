const {
  createAuthorizeSubscription,
  updateAuthorizeSubscription,
  cancelAuthorizeSubscription,
  getAuthorizeSubscriptionStatus,
  updateAuthorizeCustomerPaymentProfile,
  getAuthorizeCustomerPaymentProfile,
  createAuthorizeSubscriptionFromCustomerProfile,
} = require("../config/authorize");
const Product = require("../models/product");
const Company = require("../models/company");
const jwt = require("jsonwebtoken");

const getPlans = async (req, res) => {
  const companyData = await Company.findById(req.company.id);
  if (!companyData)
    return res.status(403).json({ message: "Token is invalid" });

  const productsData = await Product.find({});
  const products = productsData.map((product) => ({
    id: product._id.toString(),
    title: product.title,
    description: product.description,
    price: product.price,
    interval: product.interval,
    color: product.color,
    ads: product.ads,
  }));
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
        includeTransactions: true,
      });

    return res.json({
      message: "Success!",
      plans: products.map((p) => ({
        ...p,
        isYourPlan: !expired && p.id === product.id,
        isPending: !expired && p.id === product.id && isPending,
        nextPaymentDate:
          p.id === product.id
            ? !expired && !isPending && nextPaymentDate
            : null,
        endDate: p.id === product.id ? !expired && !isPending && endDate : null,
      })),
    });
  } catch (_) {
    return res.json({
      message: "Success!",
      plans: products,
    });
  }
};

const createSubscription = async (req, res) => {
  const requiringProductData = await Product.findById(req.body.productId);
  if (!requiringProductData) {
    return res.status(400).json({ message: "Invalid membership ID!" });
  }
  const requiringProduct = {
    id: requiringProductData._id.toString(),
    title: requiringProductData.title,
    description: requiringProductData.description,
    price: requiringProductData.price,
    interval: requiringProductData.interval,
    color: requiringProductData.color,
    ads: requiringProductData.ads,
  };
  const companyData = await Company.findById(req.company.id);
  if (!companyData)
    return res.status(403).json({ message: "Token is invalid" });

  if (
    companyData.authorizeSubscriptionId &&
    companyData.authorizeSubscriptionId !== ""
  ) {
    try {
      const { product } = await getAuthorizeSubscriptionStatus({
        subscriptionId: companyData.authorizeSubscriptionId,
        includeTransactions: true,
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

  if (
    companyData.authorizeCustomerPaymentProfileId &&
    companyData.authorizeCustomerProfileId
  ) {
    try {
      await updateAuthorizeCustomerPaymentProfile({
        customerProfileId: companyData.authorizeCustomerProfileId,
        customerPaymentProfileId: companyData.authorizeCustomerPaymentProfileId,
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
    } catch (error) {}
  }
  try {
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
};

const updateSubscription = async (req, res) => {
  const productId = req.body.productId;
  const companyData = await Company.findById(req.company.id);
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
};

const cancelSubscription = async (req, res) => {
  const companyData = await Company.findById(req.company.id);
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
};

const checkSubcription = async (req, res) => {
  const companyData = await Company.findById(req.company.id);
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
        includeTransactions: true,
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
};

module.exports = {
  getPlans,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  checkSubcription,
};
