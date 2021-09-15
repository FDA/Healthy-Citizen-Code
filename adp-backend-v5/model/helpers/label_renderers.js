const _ = require('lodash');
const {getFeModule} = require('./util');

/**
 * Renderers for labels representing various objects.
 * See metaschema for details
 *
 * Each renderer accepts the object it needs to render the label for as the only argument and needs to return
 * a string representing this object.
 */

module.exports = () => {
  const m = {}

  m.avatarUrl = () => {
    // eslint-disable-next-line no-undef
    const fe = getFeModule(['APP_CONFIG', '$rootScope', 'AdpMediaTypeHelper']);

    return getAvatar(fe.$rootScope.avatar);

    function getAvatar(fileItem) {
      const DEFAULT_AVATAR = fe.APP_CONFIG.appSuffix + '/assets/img/profile.jpg';

      if (_.isEmpty(fileItem)) {
        return Promise.resolve(DEFAULT_AVATAR);
      }

      const fnName = fileItem.cropped ? 'getCroppedImgLink' : 'getThumbImgLink';

      return fe.AdpMediaTypeHelper[fnName](fileItem);
    }
  };

  return m;
};
