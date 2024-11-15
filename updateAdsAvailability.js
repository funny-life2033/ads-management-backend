const Ads = require("./models/ads");
const Company = require("./models/company");
const { getAuthorizeSubscriptionStatus } = require("./config/authorize");

require("./config/db")()
  .then(() => {
    setInterval(async () => {
      try {
        const ads = await Ads.find({});
        console.log(
          new Date().toLocaleString(),
          `You have ${ads.length} ads totally`
        );
        let availableAds = 0;
        const activeCompanies = [];
        const inactiveCompanies = [];
        for (const ad of ads) {
          ad.isAvailable = false;
          try {
            if (activeCompanies.includes(ad.companyId)) {
              ad.isAvailable = true;
              availableAds++;
            } else if (!inactiveCompanies.includes(ad.companyId)) {
              const company = await Company.findById(ad.companyId);
              if (
                company &&
                company.authorizeSubscriptionId &&
                company.authorizeSubscriptionId !== ""
              ) {
                const { expired, isPending } =
                  await getAuthorizeSubscriptionStatus({
                    subscriptionId: company.authorizeSubscriptionId,
                    includeTransactions: true,
                  });

                if (!expired && !isPending) {
                  ad.isAvailable = true;
                  availableAds++;
                  activeCompanies.push(ad.companyId);
                } else {
                  inactiveCompanies.push(ad.companyId);
                }
              } else if (company) {
                inactiveCompanies.push(ad.companyId);
              }
            }
          } catch (error) {}

          await ad.save();

          console.log(
            new Date().toLocaleString(),
            `You have ${availableAds} available ads.`
          );
        }
      } catch (error) {
        console.log(error);
      }
    }, 10 * 60 * 1000);
  })
  .catch(() => {});
