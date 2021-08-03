const fs = require('fs');

const AppModelGenerator = require('./app_model_generator');
const {getMainMenu} = require('./interface_main_menu_generator_v2');

const appModelGenerator = new AppModelGenerator();
appModelGenerator.traverseSchemes();

const schemePathToWrite = './generated/model';
// remove old schemes and write the new ones
appModelGenerator.deleteSchemes(schemePathToWrite);
appModelGenerator.writeSchemes(schemePathToWrite);

const refsGraphPathToWrite = './generated/refs_graph.json';
appModelGenerator.writeRefsGraph(refsGraphPathToWrite);

const mainMenu = getMainMenu('./settings/generator_settings.json');
const mainMenuOutputPath = './generated/model/0_interface_mainMenu.json';
fs.writeFileSync(mainMenuOutputPath, JSON.stringify(mainMenu, null, 2));
console.log(`Main menu has been generated and written to ${mainMenuOutputPath}.\n`);
