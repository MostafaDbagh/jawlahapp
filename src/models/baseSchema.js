/**
 * Common Mongoose schema configuration shared by all models.
 *
 * - Strips Mongo internals (`_id`, `__v`) from serialized output so API
 *   responses keep the same shape they had under Sequelize (the app uses
 *   explicit `id` / `*_id` fields, not Mongo's ObjectId).
 * - Adds Sequelize-style `update()` / `destroy()` instance methods so the
 *   controllers can keep calling `instance.update({...})` / `instance.destroy()`.
 */
const applySerialization = (ret) => {
  delete ret._id;
  delete ret.__v;
  return ret;
};

const attachCommon = (schema) => {
  // Disable the automatic `id` getter virtual; models define their own `id` field.
  schema.set('id', false);

  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret) => applySerialization(ret)
  });

  schema.set('toObject', {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret) => applySerialization(ret)
  });

  // Sequelize-compatible instance helpers used across the controllers.
  // Skips `undefined` values so partial updates don't clobber required fields
  // (matches Sequelize's `instance.update()` behaviour).
  schema.methods.update = function update(data = {}) {
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        this[key] = value;
      }
    }
    return this.save();
  };

  schema.methods.destroy = function destroy() {
    return this.deleteOne();
  };

  return schema;
};

module.exports = { attachCommon };
