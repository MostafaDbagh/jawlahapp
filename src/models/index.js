const User = require('./User');
const OTP = require('./OTP');
const AccountType = require('./AccountType');
const Role = require('./Role');
const Permission = require('./Permission');
const Session = require('./Session');
const Category = require('./Category');
const Vendor = require('./Vendor');

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

// User-Permission direct relationship (many-to-many through user_permissions)
User.belongsToMany(Permission, {
  through: 'user_permissions',
  foreignKey: 'user_id',
  otherKey: 'permission_id',
  as: 'directPermissions'
});

Permission.belongsToMany(User, {
  through: 'user_permissions',
  foreignKey: 'permission_id',
  otherKey: 'user_id',
  as: 'usersWithDirectPermissions'
});

module.exports = {
  User,
  OTP,
  AccountType,
  Role,
  Permission,
  Session,
  Category,
  Vendor
};
