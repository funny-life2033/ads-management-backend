const { APIContracts, APIControllers } = require("authorizenet");
require("dotenv").config();

const merchantAuthenticationType =
  new APIContracts.MerchantAuthenticationType();
merchantAuthenticationType.setName(process.env.SANDBOX_AUTHORIZE_API_LOGIN_ID);
merchantAuthenticationType.setTransactionKey(
  process.env.SANDBOX_AUTHORIZE_TRANSACTION_KEY
);

const getAuthorizeSubscriptionStatus = async ({ subscriptionId }) => {
  return new Promise((res, err) => {
    const getRequest = new APIContracts.ARBGetSubscriptionRequest();
    getRequest.setMerchantAuthentication(merchantAuthenticationType);
    getRequest.setSubscriptionId(subscriptionId);
    getRequest.setIncludeTransactions(true);

    const ctrl = new APIControllers.ARBGetSubscriptionController(
      getRequest.getJSON()
    );

    ctrl.execute(() => {
      const apiResponse = ctrl.getResponse();

      const response = new APIContracts.ARBGetSubscriptionResponse(apiResponse);

      if (response !== null) {
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
              productId: response.getSubscription().getName(),
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
                  productId: response.getSubscription().getName(),
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
    });
  });
};

getAuthorizeSubscriptionStatus({ subscriptionId: "9395629" })
  .then((res) => console.log("res:", JSON.stringify(res, null, 2)))
  .catch((err) => console.log("err:", err));
