const { APIContracts, APIControllers, Constants } = require("authorizenet");
const products = require("./products");

require("dotenv").config();

const mode = "test";

const merchantAuthenticationType =
  new APIContracts.MerchantAuthenticationType();
merchantAuthenticationType.setName(
  mode === "test"
    ? process.env.SANDBOX_AUTHORIZE_API_LOGIN_ID
    : process.env.AUTHORIZE_API_LOGIN_ID
);
merchantAuthenticationType.setTransactionKey(
  mode === "test"
    ? process.env.SANDBOX_AUTHORIZE_TRANSACTION_KEY
    : process.env.AUTHORIZE_TRANSACTION_KEY
);

// merchantAuthenticationType.setName(process.env.AUTHORIZE_API_LOGIN_ID);
// merchantAuthenticationType.setTransactionKey(
//   process.env.AUTHORIZE_TRANSACTION_KEY
// );

const createAuthorizeSubscription = async ({
  cardNumber,
  cardCode,
  expiryDate,
  productId,
  email,
  firstName,
  lastName,
  address,
  city,
  state,
  zipCode,
  country,
}) => {
  const product = products.find((product) => product.id === productId);
  return new Promise((res, err) => {
    if (!product) return err("Invalid plan");

    try {
      const interval = new APIContracts.PaymentScheduleType.Interval();
      interval.setLength(1);
      interval.setUnit(APIContracts.ARBSubscriptionUnitEnum.MONTHS);

      const paymentScheduleType = new APIContracts.PaymentScheduleType();
      paymentScheduleType.setInterval(interval);
      paymentScheduleType.setStartDate(
        new Date(new Date().toUTCString()).toISOString().substring(0, 10)
      );
      paymentScheduleType.setTotalOccurrences(9999);

      const creditCard = new APIContracts.CreditCardType();
      creditCard.setExpirationDate(expiryDate);
      creditCard.setCardNumber(cardNumber);
      creditCard.setCardCode(cardCode);

      const payment = new APIContracts.PaymentType();
      payment.setCreditCard(creditCard);

      const customer = new APIContracts.CustomerType();
      customer.setType(APIContracts.CustomerTypeEnum.BUSINESS);
      customer.setEmail(email);

      const nameAndAddressType = new APIContracts.NameAndAddressType();
      nameAndAddressType.setFirstName(firstName);
      nameAndAddressType.setLastName(lastName);
      nameAndAddressType.setAddress(address);
      nameAndAddressType.setCity(city);
      nameAndAddressType.setState(state);
      nameAndAddressType.setZip(zipCode);
      nameAndAddressType.setCountry(country);

      const subscription = new APIContracts.ARBSubscriptionType();
      subscription.setName(product.id);
      subscription.setPaymentSchedule(paymentScheduleType);
      subscription.setAmount(product.price);
      subscription.setPayment(payment);
      subscription.setCustomer(customer);
      subscription.setBillTo(nameAndAddressType);

      const createRequest = new APIContracts.ARBCreateSubscriptionRequest();
      createRequest.setMerchantAuthentication(merchantAuthenticationType);
      createRequest.setSubscription(subscription);

      const ctrl = new APIControllers.ARBCreateSubscriptionController(
        createRequest.getJSON()
      );

      if (mode !== "test") ctrl.setEnvironment(Constants.endpoint.production);

      ctrl.execute(() => {
        try {
          const apiResponse = ctrl.getResponse();

          const response = new APIContracts.ARBCreateSubscriptionResponse(
            apiResponse
          );

          if (response !== null) {
            if (
              response.getMessages().getResultCode() ===
              APIContracts.MessageTypeEnum.OK
            ) {
              return res({
                subscriptionId: response.getSubscriptionId(),
                customerProfileId: response.getProfile().getCustomerProfileId(),
                customerPaymentProfileId: response
                  .getProfile()
                  .getCustomerPaymentProfileId(),
              });
            } else {
              return err(response.getMessages().getMessage()[0].getText());
            }
          } else {
            return err("Server error!");
          }
        } catch (error) {
          err("Server error!");
        }
      });
    } catch (error) {
      err("Server error!");
    }
  });
};

const createAuthorizeSubscriptionFromCustomerProfile = async ({
  customerProfileId,
  customerPaymentProfileId,
  productId,
}) => {
  const product = products.find((product) => product.id === productId);
  return new Promise((res, err) => {
    if (!product) return err("Invalid plan");

    const interval = new APIContracts.PaymentScheduleType.Interval();
    interval.setLength(1);
    interval.setUnit(APIContracts.ARBSubscriptionUnitEnum.MONTHS);

    const paymentScheduleType = new APIContracts.PaymentScheduleType();
    paymentScheduleType.setInterval(interval);
    paymentScheduleType.setStartDate(
      new Date(new Date().toUTCString()).toISOString().substring(0, 10)
    );
    paymentScheduleType.setTotalOccurrences(9999);

    const customerProfileIdType = new APIContracts.CustomerProfileIdType();
    customerProfileIdType.setCustomerProfileId(customerProfileId);
    customerProfileIdType.setCustomerPaymentProfileId(customerPaymentProfileId);

    const subscription = new APIContracts.ARBSubscriptionType();
    subscription.setName(product.id);
    subscription.setPaymentSchedule(paymentScheduleType);
    subscription.setAmount(product.price);
    subscription.setProfile(customerProfileIdType);

    const createRequest = new APIContracts.ARBCreateSubscriptionRequest();
    createRequest.setMerchantAuthentication(merchantAuthenticationType);
    createRequest.setSubscription(subscription);

    const ctrl = new APIControllers.ARBCreateSubscriptionController(
      createRequest.getJSON()
    );

    if (mode !== "test") ctrl.setEnvironment(Constants.endpoint.production);

    ctrl.execute(() => {
      const apiResponse = ctrl.getResponse();

      const response = new APIContracts.ARBCreateSubscriptionResponse(
        apiResponse
      );

      if (response != null) {
        if (
          response.getMessages().getResultCode() ==
          APIContracts.MessageTypeEnum.OK
        ) {
          res({ subscriptionId: response.getSubscriptionId() });
        } else {
          err(response.getMessages().getMessage()[0].getText());
        }
      } else {
        err("Server error!");
      }
    });
  });
};

const getAuthorizeSubscriptionStatus = async (
  { subscriptionId, includeTransactions } = { includeTransactions: true }
) => {
  return new Promise((res, err) => {
    try {
      const getRequest = new APIContracts.ARBGetSubscriptionRequest();
      getRequest.setMerchantAuthentication(merchantAuthenticationType);
      getRequest.setSubscriptionId(subscriptionId);
      getRequest.setIncludeTransactions(includeTransactions);

      const ctrl = new APIControllers.ARBGetSubscriptionController(
        getRequest.getJSON()
      );
      if (mode !== "test") ctrl.setEnvironment(Constants.endpoint.production);

      ctrl.execute(async () => {
        try {
          const apiResponse = ctrl.getResponse();
          console.log(JSON.stringify(apiResponse, null, 2));
          const response = new APIContracts.ARBGetSubscriptionResponse(
            apiResponse
          );

          if (response !== null) {
            if (
              response.getMessages().getResultCode() ===
              APIContracts.MessageTypeEnum.OK
            ) {
              const productId = response.getSubscription().getName();
              const product = products.find(
                (product) => product.id === productId
              );

              if (!product) {
                try {
                  await cancelAuthorizeSubscription({ subscriptionId });
                } catch (error) {}

                return res({
                  expired: true,
                  message: "You are not in right plan",
                });
              }
              const startDate = new Date(
                response.getSubscription().getPaymentSchedule().getStartDate()
              );

              const now = new Date(new Date().toUTCString());
              const nextPaymentDate = new Date(
                now.getFullYear(),
                now.getMonth(),
                startDate.getDate()
              );
              if (nextPaymentDate - now <= 0) {
                nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
              }
              if (nextPaymentDate.getDate() !== startDate.getDate()) {
                nextPaymentDate.getDate(0);
              }

              const status = response.getSubscription().getStatus();
              if (
                status === APIContracts.ARBSubscriptionStatusEnum.ACTIVE ||
                status === APIContracts.ARBSubscriptionStatusEnum.EXPIRED
              ) {
                const transactions = response
                  .getSubscription()
                  .getArbTransactions();
                if (transactions) {
                  for (let transaction of transactions.getArbTransaction()) {
                    const submitDate = new Date(transaction.getSubmitTimeUTC());

                    const diffMonths =
                      (nextPaymentDate.getFullYear() -
                        submitDate.getFullYear()) *
                        12 +
                      nextPaymentDate.getMonth() -
                      submitDate.getMonth();

                    const isActive = diffMonths <= 1;

                    if (isActive) {
                      return res({
                        product,
                        endDate:
                          status ===
                          APIContracts.ARBSubscriptionStatusEnum.EXPIRED
                            ? nextPaymentDate
                            : null,
                        nextPaymentDate:
                          status ===
                          APIContracts.ARBSubscriptionStatusEnum.EXPIRED
                            ? null
                            : nextPaymentDate,
                        expired: false,
                      });
                    }
                  }
                  const thisMonthPaymentDate = new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    startDate.getDate()
                  );
                  if (thisMonthPaymentDate.getDate() !== startDate.getDate()) {
                    thisMonthPaymentDate.getDate(0);
                  }

                  if (
                    thisMonthPaymentDate.getDate() === now.getDate() &&
                    status === APIContracts.ARBSubscriptionStatusEnum.ACTIVE
                  ) {
                    return res({ isPending: true, product });
                  }
                } else if (
                  status === APIContracts.ARBSubscriptionStatusEnum.ACTIVE
                ) {
                  return res({ isPending: true, product });
                }

                return res({ expired: true });
              } else {
                return res({
                  expired: true,
                  message: `Your plan was ${status}`,
                });
              }
            } else {
              if (
                response
                  .getMessages()
                  .getMessage()[0]
                  .getText()
                  .includes(
                    "has invalid child element 'includeTransactions' in namespace"
                  )
              ) {
                try {
                  const res_ = await getAuthorizeSubscriptionStatus({
                    subscriptionId,
                    includeTransactions: false,
                  });
                  res(res_);
                } catch (err_) {
                  err(err_);
                }
              }
              err(response.getMessages().getMessage()[0].getText());
            }
          } else {
            err("Server error!");
          }
        } catch (error) {
          console.log("1:", error);
          err("Server error!");
        }
      });
    } catch (error) {
      console.log("2:", error);
      err("Server error!");
    }
  });
};

const getAuthorizeCustomerPaymentProfile = async ({
  customerProfileId,
  customerPaymentProfileId,
}) => {
  return new Promise((res, err) => {
    try {
      const getRequest = new APIContracts.GetCustomerPaymentProfileRequest();
      getRequest.setMerchantAuthentication(merchantAuthenticationType);
      getRequest.setCustomerProfileId(customerProfileId);
      getRequest.setCustomerPaymentProfileId(customerPaymentProfileId);
      getRequest.setUnmaskExpirationDate(true);

      const ctrl = new APIControllers.GetCustomerProfileController(
        getRequest.getJSON()
      );

      if (mode !== "test") ctrl.setEnvironment(Constants.endpoint.production);

      ctrl.execute(() => {
        try {
          const apiResponse = ctrl.getResponse();

          const response = new APIContracts.GetCustomerPaymentProfileResponse(
            apiResponse
          );

          if (response !== null) {
            if (
              response.getMessages().getResultCode() ==
              APIContracts.MessageTypeEnum.OK
            ) {
              const payment = response
                .getPaymentProfile()
                .getPayment()
                .getCreditCard();
              const cardNumber = "";
              const expiryDate = payment.getExpirationDate();

              const billTo = response.getPaymentProfile().getBillTo();
              const firstName = billTo.getFirstName();
              const lastName = billTo.getLastName();
              const address = billTo.getAddress();
              const city = billTo.getCity();
              const state = billTo.getState();
              const zipCode = billTo.getZip();
              const country = billTo.getCountry();

              return res({
                cardNumber,
                cardCode: "",
                expiryDate,
                firstName,
                lastName,
                address,
                city,
                state,
                zipCode,
                country,
              });
            } else {
              err(response.getMessages().getMessage()[0].getText());
            }
          } else {
            err("Server error!");
          }
        } catch (error) {
          console.log("error1:", error);
          err("Server error!");
        }
      });
    } catch (error) {
      console.log("error:", error);
      err("Server error!");
    }
  });
};

const updateAuthorizeSubscription = async ({ subscriptionId, productId }) => {
  const product = products.find((product) => product.id === productId);

  return new Promise((res, err) => {
    if (!product) return err("Invalid plan");

    try {
      const subscription = new APIContracts.ARBSubscriptionType();
      subscription.setName(product.title);
      subscription.setAmount(product.price);

      const updateRequest = new APIContracts.ARBUpdateSubscriptionRequest();
      updateRequest.setMerchantAuthentication(merchantAuthenticationType);
      updateRequest.setSubscriptionId(subscriptionId);
      updateRequest.setSubscription(subscription);

      const ctrl = new APIControllers.ARBUpdateSubscriptionController(
        updateRequest.getJSON()
      );

      if (mode !== "test") ctrl.setEnvironment(Constants.endpoint.production);

      ctrl.execute(() => {
        try {
          const apiResponse = ctrl.getResponse();

          const response = new APIContracts.ARBUpdateSubscriptionResponse(
            apiResponse
          );
          if (response != null) {
            if (
              response.getMessages().getResultCode() ==
              APIContracts.MessageTypeEnum.OK
            ) {
              return res();
            } else {
              return err(response.getMessages().getMessage()[0].getText());
            }
          } else {
            return err("Server error!");
          }
        } catch (error) {
          err("Server error!");
        }
      });
    } catch (error) {
      err("Server error!");
    }
  });
};

const updateAuthorizeCustomerPaymentProfile = async ({
  customerProfileId,
  customerPaymentProfileId,
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
}) => {
  return new Promise((res, err) => {
    const creditCard = new APIContracts.CreditCardType();
    creditCard.setCardNumber(cardNumber);
    creditCard.setExpirationDate(expiryDate);
    creditCard.setCardCode(cardCode);

    const paymentType = new APIContracts.PaymentType();
    paymentType.setCreditCard(creditCard);

    const customerAddressType = new APIContracts.CustomerAddressType();
    customerAddressType.setFirstName(firstName);
    customerAddressType.setLastName(lastName);
    customerAddressType.setAddress(address);
    customerAddressType.setCity(city);
    customerAddressType.setState(state);
    customerAddressType.setZip(zipCode);
    customerAddressType.setCountry(country);

    const customerForUpdate = new APIContracts.CustomerPaymentProfileExType();
    customerForUpdate.setPayment(paymentType);

    customerForUpdate.setCustomerPaymentProfileId(customerPaymentProfileId);
    customerForUpdate.setBillTo(customerAddressType);

    const updateRequest =
      new APIContracts.UpdateCustomerPaymentProfileRequest();
    updateRequest.setMerchantAuthentication(merchantAuthenticationType);
    updateRequest.setCustomerProfileId(customerProfileId);
    updateRequest.setPaymentProfile(customerForUpdate);
    updateRequest.setValidationMode(
      mode === "test"
        ? APIContracts.ValidationModeEnum.TESTMODE
        : APIContracts.ValidationModeEnum.LIVEMODE
    );

    const ctrl = new APIControllers.UpdateCustomerPaymentProfileController(
      updateRequest.getJSON()
    );

    if (mode !== "test") ctrl.setEnvironment(Constants.endpoint.production);

    ctrl.execute(() => {
      const apiResponse = ctrl.getResponse();

      const response = new APIContracts.UpdateCustomerPaymentProfileResponse(
        apiResponse
      );

      if (response !== null) {
        if (
          response.getMessages().getResultCode() ==
          APIContracts.MessageTypeEnum.OK
        ) {
          return res({ customerPaymentProfileId });
        } else {
          err(response.getMessages().getMessage()[0].getText());
        }
      } else {
        return err("Server error!");
      }
    });
  });
};

const cancelAuthorizeSubscription = async ({ subscriptionId }) => {
  return new Promise((res, err) => {
    try {
      const cancelRequest = new APIContracts.ARBCancelSubscriptionRequest();
      cancelRequest.setMerchantAuthentication(merchantAuthenticationType);
      cancelRequest.setSubscriptionId(subscriptionId);

      const ctrl = new APIControllers.ARBCancelSubscriptionController(
        cancelRequest.getJSON()
      );

      if (mode !== "test") ctrl.setEnvironment(Constants.endpoint.production);

      ctrl.execute(function () {
        try {
          const apiResponse = ctrl.getResponse();

          const response = new APIContracts.ARBCancelSubscriptionResponse(
            apiResponse
          );

          if (response != null) {
            if (
              response.getMessages().getResultCode() ==
              APIContracts.MessageTypeEnum.OK
            ) {
              return res("Successfully cancelled");
            } else {
              return err(response.getMessages().getMessage()[0].getText());
            }
          } else {
            return err("Server error!");
          }
        } catch (error) {
          err("Server error!");
        }
      });
    } catch (error) {
      err("Server error!");
    }
  });
};

module.exports = {
  createAuthorizeSubscription,
  createAuthorizeSubscriptionFromCustomerProfile,
  getAuthorizeSubscriptionStatus,
  getAuthorizeCustomerPaymentProfile,
  updateAuthorizeSubscription,
  cancelAuthorizeSubscription,
  updateAuthorizeCustomerPaymentProfile,
};
