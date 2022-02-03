const httpStatus = require("http-status");
const { Cart, Product } = require("../models");
const ApiError = require("../utils/ApiError");
const config = require("../config/config");

// TODO: CRIO_TASK_MODULE_CART - Implement the Cart service methods

/**
 * Fetches cart for a user
 * - Fetch user's cart from Mongo
 * - If cart doesn't exist, throw ApiError
 * --- status code  - 404 NOT FOUND
 * --- message - "User does not have a cart"
 *
 * @param {User} user
 * @returns {Promise<Cart>}
 * @throws {ApiError}
 */
const getCartByUser = async (user) => {
  //fetch cart assosiated to this email
  const cart = await Cart.findOne({ email: user.email });
  if (!cart)
    throw new ApiError(httpStatus.NOT_FOUND, "User does not have a cart");
    
  return cart;
};

/**
 * Adds a new product to cart
 * - Get user's cart object using "Cart" model's findOne() method
 * --- If it doesn't exist, create one
 * --- If cart creation fails, throw ApiError with "500 Internal Server Error" status code
 *
 * - If product to add already in user's cart, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product already in cart. Use the cart sidebar to update or remove product from cart"
 *
 * - If product to add not in "products" collection in MongoDB, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product doesn't exist in database"
 *
 * - Otherwise, add product to user's cart
 *
 *
 *
 * @param {User} user
 * @param {string} productId
 * @param {number} quantity
 * @returns {Promise<Cart>}
 * @throws {ApiError}
 */
const addProductToCart = async (user, productId, quantity) => {
  //get cart of this user
  let cart = await Cart.findOne({ email: user.email });

  //cart does not exist for this user
  if (!cart) {
    try {
      cart = await Cart.create({
        email: user.email,
        cartItems: [],
      });
    } catch (error) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Cart creation failed"
      );
    }
  }

  //product already exists in cartItems
  const productExists = cart.cartItems.some(
    (item) => item.product._id.toString() === productId
  );
  if (productExists)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Product already in cart. Use the cart sidebar to update or remove product from cart"
    );

  //fetch the product to be added
  const product = await Product.findById(productId);
  if (!product)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Product doesn't exist in database"
    );

  //add product to cart's cartItems list, and save in db
  cart.cartItems.push({
    product,
    quantity,
  });
  await cart.save();

  //return response
  return cart;
};

/**
 * Updates the quantity of an already existing product in cart
 * - Get user's cart object using "Cart" model's findOne() method
 * - If cart doesn't exist, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "User does not have a cart. Use POST to create cart and add a product"
 *
 * - If product to add not in "products" collection in MongoDB, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product doesn't exist in database"
 *
 * - If product to update not in user's cart, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product not in cart"
 *
 * - Otherwise, update the product's quantity in user's cart to the new quantity provided and return the cart object
 *
 *
 * @param {User} user
 * @param {string} productId
 * @param {number} quantity
 * @returns {Promise<Cart>
 * @throws {ApiError}
 */
const updateProductInCart = async (user, productId, quantity) => {
  //get cart of this user
  let cart = await Cart.findOne({ email: user.email });

  //cart does not exist for this user
  if (!cart)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "User does not have a cart. Use POST to create cart and add a product"
    );
  //fetch the product to be added
  const product = await Product.findById(productId);
  if (!product)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Product doesn't exist in database"
    );

  //find index of this product in user's cart
  const productIndex = cart.cartItems.findIndex(
    (item) => item.product._id.toString() === productId
  );
  if (productIndex === -1)
    throw new ApiError(httpStatus.BAD_REQUEST, "Product not in cart");

  //update qty of this product, and save in db
  cart.cartItems[productIndex].quantity = quantity;
  await cart.save();

  //return response
  return cart;
};

/**
 * Deletes an already existing product in cart
 * - If cart doesn't exist for user, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "User does not have a cart"
 *
 * - If product to update not in user's cart, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product not in cart"
 *
 * Otherwise, remove the product from user's cart
 *
 *
 * @param {User} user
 * @param {string} productId
 * @throws {ApiError}
 */
const deleteProductFromCart = async (user, productId) => {
  //get cart of this user
  let cart = await Cart.findOne({ email: user.email });

  //cart does not exist for this user
  if (!cart)
    throw new ApiError(httpStatus.BAD_REQUEST, "User does not have a cart.");

  //find index of this product in user's cart
  const productIndex = cart.cartItems.findIndex(
    (item) => item.product._id.toString() === productId
  );
  if (productIndex === -1)
    throw new ApiError(httpStatus.BAD_REQUEST, "Product not in cart");

  //remove this product from card
  cart.cartItems.splice(productIndex, 1);
  await cart.save();
};

// TODO: CRIO_TASK_MODULE_TEST - Implement checkout function
/**
 * Checkout a users cart.
 * On success, users cart must have no products.
 *
 * @param {User} user
 * @returns {Promise}
 * @throws {ApiError} when cart is invalid
 */
const checkout = async (user) => {
  //find cart of this user
  let cart = await Cart.findOne({ email: user.email });
  if (!cart) throw new ApiError(httpStatus.NOT_FOUND, "User does not have a cart");

  
  //check for non empty cart
  if (cart.cartItems.length === 0) throw new ApiError(httpStatus.BAD_REQUEST, "Cart is empty");

  //check if address is set
  let hasAddress = await user.hasSetNonDefaultAddress();
  if (!hasAddress) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Address not set");
  }


  //check for insufficient balance 
  let totalCost = cart.cartItems.reduce((acc, item)=> acc + item.product.cost * item.quantity, 0);

  if (totalCost > user.walletMoney) throw new ApiError(
    httpStatus.BAD_REQUEST,
    "User has insufficient money to process"
  );

  //deduct money from wallet
  user.walletMoney -= totalCost;
  await user.save();

  //empty cart
  cart.cartItems = [];
  await cart.save();
};

module.exports = {
  getCartByUser,
  addProductToCart,
  updateProductInCart,
  deleteProductFromCart,
  checkout,
};
