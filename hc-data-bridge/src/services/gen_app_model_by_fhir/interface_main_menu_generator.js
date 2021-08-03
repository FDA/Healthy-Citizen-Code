const _ = require('lodash');
const glob = require('glob');
const fs = require('fs');
const helper = require('./helper');

const generateFhirMenuItem = (schemaName) => {
  const fullName = helper.getFullNameByName(schemaName);
  return {
    type: 'MenuItem',
    fullName,
    link: `/${schemaName}`,
    description: fullName,
  };
};

const generateGroup = (groupName) => {
  const fullName = helper.getFullNameByName(groupName);
  return {
    type: 'MenuGroup',
    fullName,
    // link: '/phis',
    description: 'Home',
    comment: 'FHIR group containing FHIR resources',
  };
};

const getBaseMenuInterface = () => ({
  interface: {
    mainMenu: {
      type: 'Menu',
      fullName: 'Main Menu',
      comment: 'This defines the main menu that will go into the sidebar',
      permissions: ['doUserActivities'],
      fields: {
        home: {
          type: 'MenuDashboardLink',
          fullName: 'Home',
          link: 'mainDashboard_v2',
          icon: {
            type: 'font-awesome',
            link: 'home',
          },
          description: 'My demographic data',
        },
      },
    },
  },
});

const getFhirGroup = (schemesPath) => {
  const schemeJsonFiles = glob.sync(`${schemesPath}/5_*.json`);
  const fhirMenuItems = {};
  schemeJsonFiles.forEach((schemeFile) => {
    try {
      const scheme = JSON.parse(fs.readFileSync(schemeFile));
      const schemeName = Object.keys(scheme.models)[0];
      const fhirMenuItem = generateFhirMenuItem(schemeName);
      fhirMenuItems[schemeName] = fhirMenuItem;
    } catch (e) {
      console.log(`Error occurred during reading ${schemeFile}`);
    }
  });
  const fhirGroup = generateGroup('fhir');
  fhirGroup.fields = fhirMenuItems;
  return fhirGroup;
};

const getMenuInterface = (schemesPath) => {
  const menuInterface = getBaseMenuInterface();
  const fhirGroup = getFhirGroup(schemesPath);
  menuInterface.interface.mainMenu.fields.fhir = fhirGroup;
  return menuInterface;
};

const schemesPath = './generated/model';
const menuInterface = getMenuInterface(schemesPath);
const outputPath = './generated/model/0_interface_mainMenu.json';
fs.writeFileSync(outputPath, JSON.stringify(menuInterface, null, 2));

module.exports = {
  getMenuInterface
};
