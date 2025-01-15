const Product = require("../models/product");

const update = async (req, res) => {
  try {
    const id = req.params.productId;
    const { title, price, description } = req.body;

    if (!title || title === "")
      return res.status(400).json({ message: "Title can't be blank" });

    if (!price || price === "" || !parseInt(price))
      return res.status(400).json({ message: "Please input correct price" });

    const product = await Product.findById(id);

    if (!product) res.status(400).json({ message: "There is not such a plan" });

    product.title = title;
    product.price = `${parseInt(price)}.00`;
    product.description = description;

    await product.save();

    return res.json({ message: "Successfully saved!" });
  } catch (error) {
    console.log("Updating product error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const create = async (req, res) => {
  try {
    const { title, price, description } = req.body;

    if (!title || title === "")
      return res.status(400).json({ message: "Title can't be blank" });

    if (!price || price === "" || !parseInt(price))
      return res.status(400).json({ message: "Please input correct price" });

    await Product.create({
      title,
      price: `${parseInt(price)}.00`,
      description,
    });

    return res.json({ message: "Successfully saved!" });
  } catch (error) {
    console.log("Creating product error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { update, create };
