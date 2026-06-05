const mongoose = require('mongoose');
const { attachCommon } = require('./baseSchema');

const accountTypeSchema = new mongoose.Schema({
  type_code: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type_name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: null
  }
}, {
  collection: 'account_types',
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

attachCommon(accountTypeSchema);

module.exports = mongoose.models.AccountType || mongoose.model('AccountType', accountTypeSchema);
