// Mongoose models. Relationships between models are defined as Mongoose
// populate virtuals inside each schema (see the `virtual(...)` calls in the
// individual model files), replacing the former Sequelize associations.
const User = require('./User');
const OTP = require('./OTP');
const AccountType = require('./AccountType');
const Role = require('./Role');
const Permission = require('./Permission');
const Session = require('./Session');
const Category = require('./Category');
const Vendor = require('./Vendor');
const Branch = require('./Branch');
const Subcategory = require('./Subcategory');
const Product = require('./Product');
const ProductVariation = require('./ProductVariation');
const Review = require('./Review');
const Offer = require('./Offer');
const Promotion = require('./Promotion');
const Notification = require('./Notification');
const Cart = require('./Cart');
const Order = require('./Order');
const Complaint = require('./Complaint');
const ContactRequest = require('./ContactRequest');
const PlatformSetting = require('./PlatformSetting');

module.exports = {
  User,
  OTP,
  AccountType,
  Role,
  Permission,
  Session,
  Category,
  Vendor,
  Branch,
  Subcategory,
  Product,
  ProductVariation,
  Review,
  Offer,
  Promotion,
  Notification,
  Cart,
  Order,
  Complaint,
  ContactRequest,
  PlatformSetting
};
