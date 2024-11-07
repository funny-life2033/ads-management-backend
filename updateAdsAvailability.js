const Ads = require("./models/ads");
const Company = require("./models/company");
const { getAuthorizeSubscriptionStatus } = require("./config/authorize");

require("./config/db")();

setInterval(async () => {
  try {
    const ads = await Ads.find({});
    console.log(
      new Date().toLocaleString(),
      `You have ${ads.length} ads totally`
    );
    let availableAds = 0;
    for (const ad of ads) {
      ad.isAvailable = false;
      try {
        const company = await Company.findById(ad.companyId);
        if (
          company &&
          company.authorizeSubscriptionId &&
          company.authorizeSubscriptionId !== ""
        ) {
          const { expired, isPending } = await getAuthorizeSubscriptionStatus({
            subscriptionId: company.authorizeSubscriptionId,
          });

          if (!expired && !isPending) {
            ad.isAvailable = true;
            availableAds++;
          }
        }
      } catch (error) {}

      await ad.save();

      console.log(
        new Date().toLocaleString(),
        `You have ${availableAds} available ads.`
      );
    }
  } catch (error) {}
}, 10 * 60 * 1000);
