
// models/userModel.js
import { usersDb } from './_db.js';

export const UserModel = {
  async create(user) {
    return usersDb.insert(user);
  },
  async findByEmail(email) {
    return usersDb.findOne({ email });
  },
  async findById(id) {
    return usersDb.findOne({ _id: id });
  },
  async list() {
    return usersDb.find({}).sort({ role: 1, name: 1 });
  },

  async update(id, patch) {
    await usersDb.update({ _id: id }, { $set: patch });
    return this.findById(id);
  },

  async removeById(id) {
    return usersDb.remove({ _id: id }, {});
  },
};

``
