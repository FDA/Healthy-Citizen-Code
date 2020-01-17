module.exports = function({ random }) {
  const { scgDateTime } = require('../field/datetime')({ random });

  return {
    scgCreatedAtUpdatedAt() {
      const createdAt = scgDateTime();
      this.row.createdAt = createdAt;
      this.row.updatedAt = scgDateTime({ min: createdAt });
    },
  };
};
