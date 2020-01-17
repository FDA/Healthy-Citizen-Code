var lsService = (function () {
  var PREFIX = 'ls';
  var itemName = function (n) {
    return [PREFIX, n].join('.');
  };

  function _set(n, v) {
    localStorage.setItem(itemName(n), v);
  }

  function _remove(n) {
    localStorage.removeItem(itemName(n));
  }

  function _get(n) {
    return localStorage.getItem(itemName(n));
  }

  function setUserData(data) {
    _set('expTime', data.expiresIn);
    _set('user', JSON.stringify(data.user));
    _set('token', data.token);
  }

  function removeUserData() {
    _remove('expTime');
    _remove('user');
    _remove('token');
  }

  function setGuestUserData() {
    var data = {
      user: {'login': 'Guest', isGuest: true},
      // must be empty
      token: '',
      expTime: ''
    };

    setUserData(data);
  }

  function isGuest() {
    var user = getUser();

    if (_.isNull(user)) {
      return true;
    }

    return Boolean(user.isGuest);
  }

  function getUser() {
    try {
      return JSON.parse(_get('user'));
    } catch (e) {
      setGuestUserData();
      return JSON.parse(_get('user'));
    }
  }

  function getToken() {
    return _get('token');
  }

  return {
    setUserData: setUserData,
    removeUserData: removeUserData,
    setGuestUserData: setGuestUserData,
    getUser: getUser,
    getToken: getToken,
    isGuest: isGuest
  };
})();
