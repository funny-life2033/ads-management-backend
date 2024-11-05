const {
  getAuthorizeSubscriptionStatus,
  cancelAuthorizeSubscription,
} = require("./config/authorize");

getAuthorizeSubscriptionStatus({ subscriptionId: "9395628" })
  .then((res) => console.log("res:", res))
  .catch((err) => console.log("err:", err));
