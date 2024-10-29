const { APIContracts, APIControllers } = require("authorizenet");
const products = require("./products");

const merchantAuthenticationType =
  new APIContracts.MerchantAuthenticationType();
merchantAuthenticationType.setName(process.env.SANDBOX_AUTHORIZE_API_LOGIN_ID);
merchantAuthenticationType.setTransactionKey(
  process.env.SANDBOX_AUTHORIZE_TRANSACTION_KEY
);

const createAuthorizeCustomerProfile = async ({ email }) => {
  return new Promise((res, err) => {
    try {
      const customerProfileType = new APIContracts.CustomerProfileType();
      customerProfileType.setEmail(email);

      const createRequest = new APIContracts.CreateCustomerProfileRequest();
      createRequest.setProfile(customerProfileType);
      createRequest.setMerchantAuthentication(merchantAuthenticationType);
      const ctrl = new APIControllers.CreateCustomerProfileController(
        createRequest.getJSON()
      );
      ctrl.execute(() => {
        try {
          const response = ctrl.getResponse();

          if (response) {
            if (
              response.messages.resultCode === APIContracts.MessageTypeEnum.OK
            ) {
              res(response.customerProfileId);
            } else {
              if (response.messages.message[0].code === "E00039") {
                err("Email is already exists!");
              } else {
                err("Server error!");
              }
            }
          } else {
            err("Server error!");
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

const createAuthorizeSubscription = async ({
  cardNumber,
  expiryDate,
  productId,
  customerProfileId,
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
        new Date().toISOString().substring(0, 10)
      );
      paymentScheduleType.setTotalOccurrences(9999);

      const creditCard = new APIContracts.CreditCardType();
      creditCard.setExpirationDate(expiryDate);
      creditCard.setCardNumber(cardNumber);

      const payment = new APIContracts.PaymentType();
      payment.setCreditCard(creditCard);

      const customerProfileIdType = new APIContracts.CustomerProfileIdType();
      customerProfileIdType.setCustomerProfileId(customerProfileId);

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
      subscription.setProfile(customerProfileIdType);
      subscription.setBillTo(nameAndAddressType);

      const createRequest = new APIContracts.ARBCreateSubscriptionRequest();
      createRequest.setMerchantAuthentication(merchantAuthenticationType);
      createRequest.setSubscription(subscription);

      const ctrl = new APIControllers.ARBCreateSubscriptionController(
        createRequest.getJSON()
      );

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
              return res(response.getSubscriptionId());
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

const getAuthorizeSubscriptionStatus = async ({ subscriptionId }) => {
  return new Promise((res, err) => {
    try {
      const getRequest = new APIContracts.ARBGetSubscriptionRequest();
      getRequest.setMerchantAuthentication(merchantAuthenticationType);
      getRequest.setSubscriptionId(subscriptionId);
      getRequest.setIncludeTransactions(true);

      const ctrl = new APIControllers.ARBGetSubscriptionController(
        getRequest.getJSON()
      );

      ctrl.execute(async () => {
        try {
          const apiResponse = ctrl.getResponse();

          const response = new APIContracts.ARBGetSubscriptionResponse(
            apiResponse
          );

          if (response !== null) {
            const productId = response.getSubscription().getName();
            const product = products.find(
              (product) => product.id === productId
            );

            if (!product) {
              await cancelAuthorizeSubscription({ subscriptionId });
              return res({ expired: true });
            }
            if (
              response.getMessages().getResultCode() ===
              APIContracts.MessageTypeEnum.OK
            ) {
              const startDate = new Date(
                response.getSubscription().getPaymentSchedule().getStartDate()
              );

              const now = new Date(new Date().toUTCString());
              const nextPaymentDate = new Date(
                now.getFullYear(),
                now.getMonth(),
                startDate.getDate()
              );
              if (nextPaymentDate <= now) {
                nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
              }
              if (nextPaymentDate.getDate() !== startDate.getDate()) {
                nextPaymentDate.getDate(0);
              }

              const status = response.getSubscription().getStatus();
              if (status === APIContracts.ARBSubscriptionStatusEnum.ACTIVE) {
                return res({
                  product,
                  nextPaymentDate,
                });
              } else {
                for (let transaction of response
                  .getSubscription()
                  .getArbTransactions()
                  .getArbTransaction()) {
                  const submitDate = new Date(transaction.getSubmitTimeUTC());

                  const diffMonths =
                    (nextPaymentDate.getFullYear() - submitDate.getFullYear()) *
                      12 +
                    nextPaymentDate.getMonth() -
                    submitDate.getMonth();

                  const isActive = diffMonths <= 1;

                  if (isActive) {
                    return res({
                      product,
                      endDate: nextPaymentDate,
                    });
                  }
                }

                return res({ expired: true });
              }
            } else {
              err(response.getMessages().getMessage()[0].getText());
            }
          } else {
            err("Server error!");
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

const updateAuthorizeSubscription = async ({ subscriptionId, productId }) => {
  const product = products.find((product) => product.id === productId);

  return new Promise((res, err) => {
    if (!product) return err("Invalid plan");

    try {
      const subscription = new APIContracts.ARBSubscriptionType();
      subscription.setName = product.title;
      subscription.setAmount = product.price;

      const updateRequest = new APIContracts.ARBUpdateSubscriptionRequest();
      updateRequest.setMerchantAuthentication(merchantAuthenticationType);
      updateRequest.setSubscriptionId(subscriptionId);
      updateRequest.setSubscription(subscription);

      const ctrl = new APIControllers.ARBUpdateSubscriptionController(
        updateRequest.getJSON()
      );

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

const cancelAuthorizeSubscription = async ({ subscriptionId }) => {
  return new Promise((res, err) => {
    try {
      const cancelRequest = new APIContracts.ARBCancelSubscriptionRequest();
      cancelRequest.setMerchantAuthentication(merchantAuthenticationType);
      cancelRequest.setSubscriptionId(subscriptionId);

      ctrl.execute(function () {
        try {
          const apiResponse = ctrl.getResponse();

          const response = new APIContracts.ARBCancelSubscriptionResponse(
            apiResponse
          );

          console.log(JSON.stringify(response, null, 2));

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
  createAuthorizeCustomerProfile,
  createAuthorizeSubscription,
  getAuthorizeSubscriptionStatus,
  updateAuthorizeSubscription,
  cancelAuthorizeSubscription,
};
