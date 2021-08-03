const _ = require('lodash');

/**
 * Subscription manager adds ability to add subscriptions on the fly.
 * Socket message must be of { type: subscriptionType, data } format.
 */
function getSubscriptionManager() {
  const subscriptions = {};

  return { subscriptions, addSubscription };

  function addSubscription(subscriptionType, subscriptionHandler) {
    if (subscriptions[subscriptionType]) {
      throw new Error(`Subscription with type '${subscriptionType}' already exists`);
    }
    if (!_.isFunction(subscriptionHandler)) {
      throw new Error(`Subscription handler must be a function`);
    }
    subscriptions[subscriptionType] = subscriptionHandler;
  }
}

module.exports = {
  getSubscriptionManager,
};
