const _ = require('lodash');

module.exports = ({ random, addresses }) => {
  const streetAddresses = addresses.filter(addr => addr.streetName);
  const cityAddresses = addresses.filter(addr => addr.city);
  const stateAddresses = addresses.filter(addr => _.get(addr, 'administrativeLevels.level1long'));
  const zipcodeAddresses = addresses.filter(addr => addr.zipcode);

  return {
    scgLocation() {
      const { latitude, longitude, formattedAddress } = random.pick(addresses);
      return {
        type: 'Point',
        coordinates: [longitude, latitude],
        label: formattedAddress,
      };
    },
    scgAddressStreet() {
      return random.pick(streetAddresses).streetName;
    },
    scgAddressCity() {
      return random.pick(cityAddresses).city;
    },
    scgAddressState() {
      return random.pick(stateAddresses).state;
    },
    scgAddressZip() {
      return random.pick(zipcodeAddresses).zipcode;
    },
    scgAddressCountry() {
      return random.pick(addresses).country;
    },
  };
};
