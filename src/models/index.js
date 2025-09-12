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

// Define associations
User.belongsTo(AccountType, {
  foreignKey: 'account_type',
  targetKey: 'type_code',
  as: 'accountType'
});

AccountType.hasMany(User, {
  foreignKey: 'account_type',
  sourceKey: 'type_code',
  as: 'users'
});

// User-OTP relationship
User.hasMany(OTP, {
  foreignKey: 'user_id',
  as: 'otps',
  onDelete: 'CASCADE'
});

OTP.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User-Session relationship
User.hasMany(Session, {
  foreignKey: 'user_id',
  as: 'sessions',
  onDelete: 'CASCADE'
});

Session.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User-Role relationship (many-to-many through user_roles)
User.belongsToMany(Role, {
  through: 'user_roles',
  foreignKey: 'user_id',
  otherKey: 'role_id',
  as: 'roles'
});

Role.belongsToMany(User, {
  through: 'user_roles',
  foreignKey: 'role_id',
  otherKey: 'user_id',
  as: 'users'
});

// Role-Permission relationship (many-to-many through role_permissions)
Role.belongsToMany(Permission, {
  through: 'role_permissions',
  foreignKey: 'role_id',
  otherKey: 'permission_id',
  as: 'permissions'
});

Permission.belongsToMany(Role, {
  through: 'role_permissions',
  foreignKey: 'permission_id',
  otherKey: 'role_id',
  as: 'roles'
});

// Self-referencing relationship for parent roles
Role.belongsTo(Role, {
  foreignKey: 'parent_role_id',
  as: 'parentRole'
});

Role.hasMany(Role, {
  foreignKey: 'parent_role_id',
  as: 'childRoles'
});

// Vendor-Branch associations
Vendor.hasMany(Branch, { foreignKey: 'vendor_id', as: 'branches' });
Branch.belongsTo(Vendor, { foreignKey: 'vendor_id', as: 'vendor' });

// Branch-Subcategory associations
Branch.hasMany(Subcategory, { foreignKey: 'branch_id', as: 'subcategories' });
Subcategory.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });

// Branch-Product associations
Branch.hasMany(Product, { foreignKey: 'branch_id', as: 'products' });
Product.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });

// Branch-Review associations
Branch.hasMany(Review, { foreignKey: 'branch_id', as: 'reviews' });
Review.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });

// Category-Subcategory associations
Category.hasMany(Subcategory, { foreignKey: 'category_id', as: 'subcategories' });
Subcategory.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// Product-ProductVariation associations
Product.hasMany(ProductVariation, { foreignKey: 'product_id', as: 'variations' });
ProductVariation.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Product-Subcategory associations
Product.belongsTo(Subcategory, { foreignKey: 'subcategory_id', as: 'subcategory' });
Subcategory.hasMany(Product, { foreignKey: 'subcategory_id', as: 'products' });

// Offer associations (polymorphic)
Offer.belongsTo(Vendor, { foreignKey: 'entity_id', constraints: false, scope: { entity_type: 'vendor' } });
Offer.belongsTo(Branch, { foreignKey: 'entity_id', constraints: false, scope: { entity_type: 'branch' } });
Offer.belongsTo(Subcategory, { foreignKey: 'entity_id', constraints: false, scope: { entity_type: 'subcategory' } });
Offer.belongsTo(Product, { foreignKey: 'entity_id', constraints: false, scope: { entity_type: 'product' } });

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
  Promotion
};
