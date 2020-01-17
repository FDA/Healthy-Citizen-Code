module.exports = ({ chance }) => {
  return {
    scgFirstName() {
      return chance.name().split(' ')[0];
    },
    scgLastName() {
      return chance.name().split(' ')[1];
    },
    scgZipCode() {
      return chance.zip();
    },
    scgGender() {
      return chance.gender({ extraGenders: ['Other'] });
    },
    scgFullName() {
      return chance.name();
    },
  };
};
