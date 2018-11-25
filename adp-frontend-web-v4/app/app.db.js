var appDb = (function () {
  var db = {};

  function getStore() {
    var storeName = 'ADP-APP-DB';
    return new idbKeyval.Store(storeName);
  }

  db.login = {
    name: 'login',
    get: function () {
      return idbKeyval.get(this.name, getStore())
        .then(function (result) {
          return result || {};
        });
    },

    set: function (data) {
      return idbKeyval.set(this.name, data, getStore());
    }
  };

  db.schema = {
    get: function (name) {
      return idbKeyval.get(name, getStore())
        .then(function (result) {
          return result || {};
        });
    },

    set: function (name, data) {
      return idbKeyval.set(name, data, getStore());
    }
  };

  return db;
})();