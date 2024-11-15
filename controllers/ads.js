const Company = require("../models/company");
const Ads = require("../models/ads");
const jwt = require("jsonwebtoken");
const Shopify = require("shopify-api-node");
const { getAuthorizeSubscriptionStatus } = require("../config/authorize");
require("dotenv").config();

const shopify = new Shopify({
  shopName: process.env.SHOP_NAME,
  accessToken: process.env.SHOPIFY_API_TOKEN,
});

const submitAd = async (req, res) => {
  const token = req.cookies.token;
  const { link, isVertical, banner, id, isShown } = req.body;
  if (
    banner &&
    typeof banner === "object" &&
    (!banner.type ||
      !banner.base64 ||
      !banner.type.startsWith("image/") ||
      !banner.base64.includes("data:image/"))
  )
    return res.status(400).json({ message: "Please input a valid image file" });

  if (isShown === null || isShown === undefined) {
    if (!link || link === "")
      return res.status(400).json({ message: "Link is blank" });

    if (isVertical === null || isVertical === undefined)
      return res.status(400).json({ message: "Banner location is required" });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, company) => {
    if (err) {
      return res.status(403).json({ message: "Token is invalid" });
    }
    try {
      const companyData = await Company.findById(company.id);
      if (!companyData)
        return res.status(403).json({ message: "Token is invalid" });

      const ad = await Ads.findById(id);

      if (ad) {
        if (!companyData._id.equals(ad.companyId)) {
          return res
            .status(400)
            .json({ message: "You don't have access to this ad" });
        }

        if (!ad.banner && !banner) {
          return res
            .status(400)
            .json({ message: "Please provide your banner" });
        }
        if (ad.banner && banner) {
          try {
            await shopify.asset.delete(process.env.SHOPIFY_THEME_ID, {
              asset: { key: `assets/${ad._id}` },
            });
          } catch (error) {
            console.log("deleting shopify assets:", error);
          }
        }

        if (banner) {
          try {
            const { public_url } = await shopify.asset.create(
              process.env.SHOPIFY_THEME_ID,
              {
                key: `assets/${ad._id}`,
                attachment: banner.base64.split(
                  `data:${banner.type};base64,`
                )[1],
              }
            );
            ad.banner = public_url;
          } catch (error) {
            return res
              .status(400)
              .json({ message: "Please provide valid image file" });
          }
        }

        if (link) ad.link = link;
        if (ad.isVertical === true || ad.isVertical === false)
          ad.isVertical = isVertical;

        if (isShown === true) {
          const { product } = await getAuthorizeSubscriptionStatus({
            subscriptionId: companyData.authorizeSubscriptionId,
            includeTransactions: true,
          });
          const shownAds = await Ads.find({
            companyId: companyData._id,
            isShown: true,
          });

          if (
            product &&
            shownAds.filter((other) => other._id !== ad._id).length <
              product.ads
          ) {
            ad.isShown = true;
          } else {
            return res
              .status(400)
              .json({ message: "You have reached maximum number of ads" });
          }
        } else if (isShown === false) {
          ad.isShown = false;
        }
        await ad.save();
      } else {
        if (!banner)
          return res
            .status(400)
            .json({ message: "Please provide your banner" });

        const newAd = new Ads({
          link,
          companyId: companyData._id,
          isVertical,
        });

        const { product } = await getAuthorizeSubscriptionStatus({
          subscriptionId: companyData.authorizeSubscriptionId,
          includeTransactions: true,
        });
        const shownAds = await Ads.find({
          companyId: companyData._id,
          isShown: true,
        });
        if (shownAds.length < product.ads) {
          newAd.isShown = true;
        } else {
          newAd.isShown = false;
        }

        await newAd.save();

        try {
          const { public_url } = await shopify.asset.create(
            process.env.SHOPIFY_THEME_ID,
            {
              key: `assets/${newAd._id}`,
              attachment: banner.base64.split(`data:${banner.type};base64,`)[1],
            }
          );
          newAd.banner = public_url;
          await newAd.save();
        } catch (error) {
          await newAd.deleteOne();
          return res
            .status(400)
            .json({ message: "Please provide valid image file" });
        }
      }

      res.json({ message: "Successfully submitted!" });
    } catch (error) {
      console.log("err:", error);
      return res.status(500).json({ message: error.messages });
    }
  });
};

const getAds = async (req, res) => {
  const token = req.cookies.token;

  jwt.verify(token, process.env.JWT_SECRET, async (err, company) => {
    if (err) {
      return res.status(403).json({ message: "Token is invalid" });
    }

    try {
      const companyData = await Company.findById(company.id);
      if (!companyData)
        return res.status(403).json({ message: "Token is invalid" });

      const ads = await Ads.find({ companyId: companyData._id });

      return res.json({
        message: "Success",
        ads: ads.map((ad) => ({
          id: ad._id,
          banner: ad.banner,
          link: ad.link,
          isShown: ad.isShown,
        })),
      });
    } catch (error) {
      return res.status(500).json({ message: "Server error!" });
    }
  });
};

const getAd = async (req, res) => {
  const token = req.cookies.token;
  const id = req.params.id;

  const ad = await Ads.findById(id);
  if (!ad) {
    return res.status(400).json({ message: "The ad doesn't exist" });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, company) => {
    if (err) {
      return res.status(403).json({ message: "Token is invalid" });
    }

    try {
      const companyData = await Company.findById(company.id);
      if (!companyData)
        return res.status(403).json({ message: "Token is invalid" });

      if (companyData._id.equals(ad.companyId)) {
        return res.json({
          message: "Success",
          banner: ad.banner,
          link: ad.link,
          isVertical: ad.isVertical,
        });
      } else {
        return res
          .status(400)
          .json({ message: "You don't have access to this ad" });
      }
    } catch (error) {
      return res.status(500).json({ message: "Server error!" });
    }
  });
};

const removeAd = async (req, res) => {
  const token = req.cookies.token;
  const id = req.params.id;

  const ad = await Ads.findById(id);
  if (!ad) {
    return res.status(400).json({ message: "The ad doesn't exist" });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, company) => {
    if (err) {
      return res.status(403).json({ message: "Token is invalid" });
    }

    try {
      const companyData = await Company.findById(company.id);
      if (!companyData)
        return res.status(403).json({ message: "Token is invalid" });

      if (companyData._id.equals(ad.companyId)) {
        try {
          await shopify.asset.delete(process.env.SHOPIFY_THEME_ID, {
            asset: { key: `assets/${ad._id}` },
          });
        } catch (error) {}

        await ad.deleteOne();
        res.json({ message: "Successfully removed!" });
      } else {
        return res
          .status(400)
          .json({ message: "You don't have access to this ad" });
      }
    } catch (err) {
      console.log("removing ad err:", err);
      return res.status(400).json({ message: "resetting failed!" });
    }
  });
};

const getRandomAd = async (req, res) => {
  const location = req.query.location;
  const isVertical =
    location === "vertical" ? true : location === "horizontal" ? false : null;

  if (isVertical === null) return res.json({});
  let ads = await Ads.find({ isVertical, isAvailable: true, isShown: true });
  ads = ads.filter((ad) => ad.banner && ad.banner !== "");
  if (ads.length === 0) return res.json({});
  const randomAd = ads[Math.floor(Math.random() * ads.length)];
  if (!randomAd.banner || randomAd.banner === "") return res.json({});
  return res.json({ banner: randomAd.banner, link: randomAd.link });
};

module.exports = {
  submitAd,
  getAds,
  getAd,
  removeAd,
  getRandomAd,
};
