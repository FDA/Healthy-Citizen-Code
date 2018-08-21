const _ = require('lodash');

module.exports = {
  nameToGiven (name) {
    if (_.isArray(name) && !_.isEmpty(name)) {
      const givenName = name[0].given;// Could be Array or String
      if (_.isArray(givenName) && !_.isEmpty(givenName)) {
        return givenName[0] || null;
      }
      return givenName || null;
    }
    return name.given || null;
  },
  nameToFamily (name) {
    if (_.isArray(name) && !_.isEmpty(name)) {
      return name[0].family || null;
    }
    return name.family || null;
  },
  nameToDisplayName (name) {
    const firstname = this.nameToGiven(name);
    const lastname = this.nameToFamily(name);
    return `${lastname} ${firstname}`;
  },
  telecomToEmail (telecom) {
    if (!telecom || !_.isArray(telecom)) {
      return null;
    }
    // There could be several emails
    const foundEmails = telecom
      .filter(contact => contact.system === 'email' && contact.value)
      .map(contact => contact.value);
    return foundEmails ? foundEmails.join(',') : null;
  },
};
