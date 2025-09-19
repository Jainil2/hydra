const db = require('./db');
const bcrypt = require('bcrypt');

module.exports = {
  create: async (username, password, profile = {}) => {
    const hash = await bcrypt.hash(password, 10);
    const [id] = await db('users').insert({ username, password: hash, profile: JSON.stringify(profile) }).returning('id');
    return id;
  },
  findByUsername: async (username) => {
    return db('users').where({ username }).first();
  },
  verify: async (username, password) => {
    const user = await module.exports.findByUsername(username);
    if (!user) return false;
    return bcrypt.compare(password, user.password);
  }
};
