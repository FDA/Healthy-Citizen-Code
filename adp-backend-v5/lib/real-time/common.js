const _ = require('lodash');
const socketIo = require('socket.io');
const addDeviceToSocketRequest = require('express-device').capture();
const socketIoAuth = require('./socketio-auth');
const { InvalidTokenError, ExpiredTokenError } = require('../errors');

function addAuthentication({ appLib, io, log }) {
  socketIoAuth(io, {
    debug: log.debug.bind(log),
    async authenticate(socket, cb) {
      try {
        addDeviceToSocketRequest(socket.request);
        const { user } = await appLib.authenticationCheck(socket.request);
        socket.userId = _.get(user, '_id', '').toString();
        log.trace(`User with id '${socket.userId}' connected via socket '${socket.id}'`);
        return cb(null, true);
      } catch (e) {
        if (e instanceof InvalidTokenError) {
          return cb({ message: 'Invalid user session, please login' });
        }
        if (e instanceof ExpiredTokenError) {
          return cb({ message: 'User session expired, please login again' });
        }
        log.error(e.stack);
        return cb({ message: `Error occurred during authentication process` });
      }
    },
    disconnect(socket) {
      log.trace(`User with id '${socket.userId}' disconnected from socket '${socket.id}'`);
    },
  });
}

function getSocketIoServer(server) {
  return socketIo(server, {
    handlePreflightRequest(req, res) {
      // check whether req.headers.origin is passed cors
      res.writeHead(200, {
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Origin': req.headers.origin,
        'Access-Control-Allow-Credentials': true,
      });
      res.end();
    },
  });
}
module.exports = {
  addAuthentication,
  getSocketIoServer,
};
