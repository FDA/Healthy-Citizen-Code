const sec = 1000;
const week = 7 * 24 * 60 * 60 * sec;

module.exports = {
  reconnectTries: 60,
  reconnectInterval: sec,
  connectTimeoutMS: week,
  socketTimeoutMS: week,
};
