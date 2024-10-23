const { APIContracts, APIControllers } = require("authorizenet");

const merchantAuthenticationType =
  new APIContracts.MerchantAuthenticationType();
merchantAuthenticationType.setName(process.env.SANDBOX_AUTHORIZE_API_LOGIN_ID);
merchantAuthenticationType.setTransactionKey(
  process.env.SANDBOX_AUTHORIZE_TRANSACTION_KEY
);

const createAuthorizeCustomerProfile = async (email) => {
  return new Promise((res, err) => {
    const customerProfileType = new APIContracts.CustomerProfileType();
    customerProfileType.setEmail(email);

    const createRequest = new APIContracts.CreateCustomerProfileRequest();
    createRequest.setProfile(customerProfileType);
    createRequest.setMerchantAuthentication(merchantAuthenticationType);
    const ctrl = new APIControllers.CreateCustomerProfileController(
      createRequest.getJSON()
    );
    ctrl.execute(() => {
      const response = ctrl.getResponse();

      if (response) {
        if (response.messages.resultCode === APIContracts.MessageTypeEnum.OK) {
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
    });
  });
};

const createAuthorizeSubscription = async (cardNumber, expirationDate) => {
  return new Promise((res, err) => {
    const interval = new APIContracts.PaymentScheduleType.Interval();
    interval.setLength(1);
    interval.setUnit(APIContracts.ARBSubscriptionUnitEnum.MONTHS);

    const paymentScheduleType = new APIContracts.PaymentScheduleType();
    paymentScheduleType.setInterval(interval);
    paymentScheduleType.setStartDate(new Date().toISOString().substring(0, 10));
    paymentScheduleType.setTotalOccurrences(5);
    paymentScheduleType.setTrialOccurrences(0);

    const creditCard = new APIContracts.CreditCardType();
    creditCard.setExpirationDate(expirationDate);
    creditCard.setCardNumber(cardNumber);

    const payment = new APIContracts.PaymentType();
    payment.setCreditCard(creditCard);
  });
};

module.exports = { createAuthorizeCustomerProfile };
