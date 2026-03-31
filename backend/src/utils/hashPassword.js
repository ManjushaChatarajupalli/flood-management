const bcrypt = require('bcryptjs');
const { bcryptSaltRounds } = require('../config/auth');

const hashPassword = async (password) => {
  return await bcrypt.hash(password, bcryptSaltRounds);
};

const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

module.exports = {
  hashPassword,
  comparePassword
};