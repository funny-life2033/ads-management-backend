const Company = require("../models/company");
const Ads = require("../models/ads");
const jwt = require("jsonwebtoken");
const Shopify = require("shopify-api-node");
require("dotenv").config();

const shopify = new Shopify({
  shopName: process.env.SHOP_NAME,
  accessToken: process.env.SHOPIFY_API_TOKEN,
});

const submitAds = async (req, res) => {
  const token = req.cookies.token;
  const { title, description, link, banner } = req.body;
  if (
    banner &&
    typeof banner === "object" &&
    (!banner.type ||
      !banner.base64 ||
      !banner.type.startsWith("image/") ||
      !banner.base64.includes("data:image/"))
  )
    return res.status(400).json({ message: "Please input a valid image file" });

  if (!title || title === "")
    return res.status(400).json({ message: "Title is blank" });
  if (!description || description === "")
    return res.status(400).json({ message: "Description is blank" });
  if (!link || link === "")
    return res.status(400).json({ message: "Link is blank" });

  jwt.verify(token, process.env.JWT_SECRET, async (err, company) => {
    if (err) {
      return res.status(403).json({ message: "Token is invalid" });
    }
    try {
      const companyData = await Company.findById(company.id);
      if (!companyData)
        return res.status(403).json({ message: "Token is invalid" });
      const ads = await Ads.findOne({ companyId: companyData._id });
      if (ads) {
        if (!ads.banner && !banner)
          return res
            .status(400)
            .json({ message: "Please provide your banner" });
        if (ads.banner && banner) {
          try {
            await shopify.asset.delete(process.env.SHOPIFY_THEME_ID, {
              asset: { key: `assets/${ads._id}` },
            });
          } catch (error) {
            console.log("deleting shopify assets:", error);
            return res
              .status(400)
              .json({ message: "Please provide image file" });
          }
        }

        if (banner) {
          const { public_url } = await shopify.asset.create(
            process.env.SHOPIFY_THEME_ID,
            {
              key: `assets/${ads._id}`,
              attachment: banner.base64.split(`data:${banner.type};base64,`)[1],
            }
          );
          ads.banner = public_url;
        }

        ads.title = title;
        ads.description = description;
        ads.link = link;
        await ads.save();
      } else {
        if (!banner)
          return res
            .status(400)
            .json({ message: "Please provide your banner" });

        const newAds = new Ads({
          title,
          description,
          link,
          companyId: companyData._id,
        });

        await newAds.save();

        const { public_url } = await shopify.asset.create(
          process.env.SHOPIFY_THEME_ID,
          {
            key: `assets/${newAds._id}`,
            attachment: banner.base64.split(`data:${banner.type};base64,`)[1],
          }
        );
        newAds.banner = public_url;
        await newAds.save();
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

      const ads = await Ads.findOne({ companyId: companyData._id });

      if (ads) {
        return res.json({
          message: "Success",
          banner: ads.banner,
          title: ads.title,
          description: ads.description,
          link: ads.link,
        });
      } else {
        return res.json({ message: "You have not published any ads yet" });
      }
    } catch (error) {
      return res.status(500).json({ message: "Server error!" });
    }
  });
};

const resetAds = async (req, res) => {
  const token = req.cookies.token;

  jwt.verify(token, process.env.JWT_SECRET, async (err, company) => {
    if (err) {
      return res.status(403).json({ message: "Token is invalid" });
    }

    try {
      const companyData = await Company.findById(company.id);
      if (!companyData)
        return res.status(403).json({ message: "Token is invalid" });

      const ad = await Ads.findOne({ companyId: companyData._id });
      if (ad) {
        await shopify.asset.delete(process.env.SHOPIFY_THEME_ID, {
          asset: { key: `assets/${ad._id}` },
        });
        await ad.deleteOne();
      }
      res.json({ message: "Successfully reset!" });
    } catch (err) {
      return res.status(400).json({ message: "resetting failed!" });
    }
  });
};

const getRandomAds = async (req, res) => {
  const count = parseInt(req.body.count);
  if (isNaN(count) || count === 0) {
    return res.json([]);
  }

  try {
    const ads = await Ads.find({});
    if (ads.length) {
      const requiredAds = [];

      if (ads.length <= count) {
        requiredAds.push(...Array.from(ads));
      }
      const randomNos = [];
      while (requiredAds.length < count) {
        const randomNo = Math.floor(Math.random() * ads.length);
        if (!randomNos.includes(randomNo)) {
          randomNos.push(randomNo);
          requiredAds.push(ads[randomNo]);
        }
      }

      res.json(
        requiredAds.map(
          (ad) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smart Ads Section</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      function redirectToParent(url) {
        window.parent.open(url,'_blank');
      }
    </script>
</head>
<body class="p-4">
    <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl" id="adSection">
        <div class="md:flex">
            <div class="md:flex-shrink-0">
                <img class="w-full h-full object-top object-cover md:w-48" src="${ad.banner}" alt="Smart advertisement image" id="adImage">
                <script>
                  document.getElementById("adImage").onload = () => {
                    document.getElementById("adImage").style.height = document.getElementById("adImage").clientHeight + "px";
                  }
                </script>
            </div>
            <div class="p-8">
                <div class="uppercase tracking-wide text-sm text-[#F79518] font-semibold" id="adTitle">${ad.title}</div>
                <p class="mt-2 text-gray-500" id="adDescription">${ad.description}</p>
                <div class="mt-4">
                    <button class="inline-block px-4 py-2 leading-none border rounded text-[#F79518] border-[#F79518] hover:text-white hover:bg-[#F79518] transition-colors duration-300" id="adButton" onclick="redirectToParent('${ad.link}'); return false;">Learn More</button>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`
        )
      );
    } else {
      res.json([]);
    }
  } catch (error) {
    console.log("getting random ads:", error);
    res.json([]);
  }
};

module.exports = { submitAds, getAds, getRandomAds, resetAds };
