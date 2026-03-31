const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpire } = require('../config/auth');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, jwtSecret, {
    expiresIn: jwtExpire
  });
};

module.exports = generateToken;