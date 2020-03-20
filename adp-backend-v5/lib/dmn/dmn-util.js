const Promise = require('bluebird');
const fs = require('fs-extra');
const { ValidationError } = require('../errors');

// (for JAVA_DMN_UTIL_CLASS_NAME='com.conceptant.dmn.DmnUtil')
// Jar should contain 'DmnUtil' class in package 'com.conceptant.dmn' with 'DmnUtil(String xml, String decisionKey)' constructor
// and (for JAVA_PROCESS_METHOD_NAME='process') a method 'process(String variablesListJson)'
const JAVA_DMN_UTIL_CLASS_NAME = 'com.conceptant.dmn.DmnUtil';
const JAVA_PROCESS_METHOD_NAME = 'process';

// seems like it's only one java instance allowed per node process
// tests drop with creating multiple instances throwing 'Cannot set asyncOptions after calling any other java function.' error
let java;

async function initJavaInstance(dependenciesDir) {
  if (java) {
    return java;
  }

  java = require('java');
  java.asyncOptions = {
    asyncSuffix: undefined, // Don't generate node-style methods taking callbacks
    syncSuffix: '', // Sync methods use the base name(!!)
    promiseSuffix: 'Promise', // Generate methods returning promises, using the suffix Promise.
    promisify: Promise.promisify, // Needs Node.js version 8 or greater, see comment below
    ifReadOnlySuffix: '_alt',
  };

  const depDirFullPath = require('path').resolve(__dirname, dependenciesDir);
  const dependencies = await fs.readdir(depDirFullPath);

  dependencies.forEach(function(dependency) {
    java.classpath.push(`${depDirFullPath}/${dependency}`);
  });

  await java.ensureJvm();
  return java;
}

async function getDmnUtilInstance(dmnXml, decisionId) {
  return java.newInstancePromise(JAVA_DMN_UTIL_CLASS_NAME, dmnXml, decisionId);
}

async function getValidatedDmnUtilInstance(dmnXml, decisionId) {
  const dmnUtilInstance = await getDmnUtilInstance(dmnXml, decisionId);
  const error = await dmnUtilInstance.isValidPromise();
  if (error) {
    throw new ValidationError(error);
  }
  return dmnUtilInstance;
}

async function processDmnVariables(dmnUtilInstance, variables) {
  const stringifiedVariables = JSON.stringify(variables);
  const result = await dmnUtilInstance[`${JAVA_PROCESS_METHOD_NAME}Promise`](stringifiedVariables);
  return JSON.parse(result);
}

module.exports = {
  initJavaInstance,
  processDmnVariables,
  getValidatedDmnUtilInstance,
};
