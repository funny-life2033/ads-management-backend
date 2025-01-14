const Company = require("../models/company");
const Ads = require("../models/ads");
const jwt = require("jsonwebtoken");
const Shopify = require("shopify-api-node");
const { getAuthorizeSubscriptionStatus } = require("../config/authorize");
const AdStatus = require("../models/adStatus");
// const fs = require("fs");
// const path = require("path");
require("dotenv").config();

const shopify = new Shopify({
  shopName: process.env.SHOP_NAME,
  accessToken: process.env.SHOPIFY_API_TOKEN,
  timeout: 600000,
});

const areSameDate = (date1, date2) =>
  date1.getFullYear() === date2.getFullYear() &&
  date1.getMonth() === date2.getMonth() &&
  date1.getDate() === date2.getDate();

const submitAd = async (req, res) => {
  const { link, isVertical, banner, id, isShown } = req.body;
  // fs.writeFileSync(path.join(__dirname, "video"), banner.base64, "utf8");
  if (
    banner &&
    typeof banner === "object" &&
    (!banner.type ||
      !banner.base64 ||
      ((!banner.type.startsWith("image/") ||
        !banner.base64.includes("data:image/")) &&
        (!banner.type.startsWith("video/") ||
          !banner.base64.includes("data:video/"))))
  )
    return res
      .status(400)
      .json({ message: "Please input a valid image / video file" });

  if (isShown === null || isShown === undefined) {
    if (!link || link === "")
      return res.status(400).json({ message: "Link is blank" });

    if (isVertical === null || isVertical === undefined)
      return res.status(400).json({ message: "Banner location is required" });
  }

  try {
    const companyData = await Company.findById(req.company.id);
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
        return res.status(400).json({ message: "Please provide your banner" });
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
              attachment: banner.base64.split(`data:${banner.type};base64,`)[1],
            }
          );
          ad.banner = public_url;
          if (banner.type.startsWith("image/")) ad.bannerType = "image";
          else ad.bannerType = "video";
        } catch (error) {
          console.log("uploading shopify assets:", error);
          return res
            .status(400)
            .json({ message: "Please provide valid image file" });
        }
      }

      if (link) ad.link = link;
      if (isVertical === true || isVertical === false)
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
          shownAds.filter((other) => other._id !== ad._id).length < product.ads
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
        return res.status(400).json({ message: "Please provide your banner" });

      const newAd = new Ads({
        link,
        companyId: companyData._id,
        isVertical,
      });

      console.log("getting authorize subscription status");
      const { product } = await getAuthorizeSubscriptionStatus({
        subscriptionId: companyData.authorizeSubscriptionId,
        includeTransactions: true,
      });
      const shownAds = await Ads.find({
        companyId: companyData._id,
        isShown: true,
      });
      if (product && shownAds.length < product.ads) {
        newAd.isShown = true;
      } else {
        newAd.isShown = false;
      }

      await newAd.save();

      try {
        console.log("uploading banner image to shopify");
        const { public_url } = await shopify.asset.create(
          process.env.SHOPIFY_THEME_ID,
          {
            key: `assets/${newAd._id}`,
            attachment: banner.base64.split(`data:${banner.type};base64,`)[1],
          }
        );
        newAd.banner = public_url;
        if (banner.type.startsWith("image/")) newAd.bannerType = "image";
        else newAd.bannerType = "video";
        await newAd.save();
      } catch (error) {
        console.log("uploading asset err:", error);
        await newAd.deleteOne();
        if (error.response && error.response.status === 413)
          return res.status(413).json({
            message: "too large image / video. Maximum size is 10MB",
          });
        return res
          .status(400)
          .json({ message: "Please provide valid image / video file" });
      }
    }

    res.json({ message: "Successfully submitted!" });
  } catch (error) {
    console.log("err:", error);
    return res.status(500).json({ message: error.messages });
  }
};

const getAds = async (req, res) => {
  try {
    const companyData = await Company.findById(req.company.id);
    if (!companyData)
      return res.status(403).json({ message: "Token is invalid" });

    const ads = await Ads.find({ companyId: companyData._id });

    const adsStatus = await AdStatus.find({
      adId: { $in: ads.map((ad) => ad._id) },
    });
    const now = new Date(new Date().toUTCString());
    const views = {};

    for (const ad of ads) {
      const status = adsStatus.find((status) => ad._id.equals(status.adId));
      if (status) {
        const totalViews = status.views.reduce(
          (prev, curr) => prev + curr.views,
          0
        );
        const todayViews =
          status.views.find((views) => areSameDate(views.date, now))?.views ||
          0;

        views[ad._id.toString()] = { totalViews, todayViews };
      } else {
        views[ad._id.toString()] = { totalViews: 0, todayViews: 0 };
      }
    }

    return res.json({
      message: "Success",
      ads: ads.map((ad) => ({
        id: ad._id,
        banner: ad.banner,
        bannerType: ad.bannerType,
        link: ad.link,
        isShown: ad.isShown,
        views: views[ad._id.toString()],
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error!" });
  }
};

const getAd = async (req, res) => {
  const id = req.params.id;

  const ad = await Ads.findById(id);
  if (!ad) {
    return res.status(400).json({ message: "The ad doesn't exist" });
  }

  try {
    const companyData = await Company.findById(req.company.id);
    if (!companyData)
      return res.status(403).json({ message: "Token is invalid" });

    if (companyData._id.equals(ad.companyId)) {
      return res.json({
        message: "Success",
        banner: ad.banner,
        link: ad.link,
        isVertical: ad.isVertical,
        bannerType: ad.bannerType,
      });
    } else {
      return res
        .status(400)
        .json({ message: "You don't have access to this ad" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Server error!" });
  }
};

const removeAd = async (req, res) => {
  const id = req.params.id;

  const ad = await Ads.findById(id);
  if (!ad) {
    return res.status(400).json({ message: "The ad doesn't exist" });
  }

  try {
    const companyData = await Company.findById(req.company.id);
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
  return res.json({
    id: randomAd._id,
    banner: randomAd.banner,
    bannerType: randomAd.bannerType,
    link: randomAd.link,
  });
};

const increaseViews = async (req, res) => {
  const id = req.params.id;
  if (!id || id === "")
    return res.status(400).json({ message: "Provide valid id" });
  const adStatus = await AdStatus.findOne({ adId: id });
  const now = new Date(new Date().toUTCString());
  if (adStatus) {
    const views = adStatus.views.find((view) => areSameDate(view.date, now));
    if (views) {
      views.views++;
    } else {
      adStatus.views.push({
        views: 1,
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      });
    }

    await adStatus.save();
  } else {
    const ad = await Ads.findById(id);
    if (!ad) return res.status(400).json({ message: "Provide valid id" });
    await AdStatus.create({
      adId: ad._id,
      views: [
        {
          views: 1,
          date: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        },
      ],
      clicks: [],
    });
  }

  res.json({ message: "Successfully saved!" });
};

const increaseClicks = async (req, res) => {
  const id = req.params.id;
  if (!id || id === "")
    return res.status(400).json({ message: "Provide valid id" });
  const adStatus = await AdStatus.findOne({ adId: id });
  const now = new Date(new Date().toUTCString());
  if (adStatus) {
    const clicks = adStatus.clicks.find((clicks) =>
      areSameDate(clicks.date, now)
    );
    if (clicks) {
      clicks.clicks++;
    } else {
      adStatus.clicks.push({
        clicks: 1,
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      });
    }

    await adStatus.save();
  } else {
    const ad = await Ads.findById(id);
    if (!ad) return res.status(400).json({ message: "Provide valid id" });
    await AdStatus.create({
      adId: ad._id,
      clicks: [
        {
          clicks: 1,
          date: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        },
      ],
      views: [],
    });
  }

  res.json({ message: "Successfully saved!" });
};

module.exports = {
  submitAd,
  getAds,
  getAd,
  removeAd,
  getRandomAd,
  increaseViews,
  increaseClicks,
};
