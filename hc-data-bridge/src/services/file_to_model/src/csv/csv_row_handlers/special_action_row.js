const fs = require('fs-extra');
const path = require('path');
const { downloadFile } = require('../../../../util/download');

class CsvToModelError extends Error {}

function handleSpecialAction(csvRowData, metaInfo, state, options) {
  state.actionPromisesFuncs.push(getActionPromiseFunc(csvRowData, options.outputModelPath));
}

function getActionPromiseFunc(csvRowData, outputModelPath) {
  return () => {
    try {
      return performAction(csvRowData, outputModelPath);
    } catch (e) {
      console.error(e);
    }
  };
}

async function performAction(csvRowData, outputModelPath) {
  const destination = getSpecialActionDestination(csvRowData.Destination, outputModelPath);
  const type = csvRowData.Type;

  const source = csvRowData.Source || csvRowData['"Source"'].toString();

  try {
    if (type === 'Inline') {
      await fs.outputFile(destination, source);
      return console.log(`∟ Inline file action: written data to '${destination}'`);
    }
    if (type === 'URL') {
      await downloadFile(source, destination);
      return console.log(`∟ URL file action: written data from URL '${source}' to '${destination}'`);
    }
    if (type === 'Local') {
      const sourcePath = getSpecialActionLocalSource(source, outputModelPath);
      // const sourcePath = source.startsWith('/') ? path.resolve(source) : path.resolve(appRoot, source);
      await fs.ensureDir(path.dirname(sourcePath));
      await fs.copy(sourcePath, destination);
      return console.log(`∟ Local file action: copied local file '${sourcePath}' to '${destination}'`);
    }
    console.error(`Skipping action due to invalid special action Type: ${type}`);
  } catch (e) {
    console.error(
      `Error occurred during special action execution with row:\n` +
        `source: ${source}\ndestination: ${destination}\ntype: ${type}\nError description: ${e.stack}` +
        `\n------------------------`
    );
  }

  function getSpecialActionDestination(_destination = '', _outputModelPath) {
    if (_destination.startsWith('/')) {
      throw new CsvToModelError(
        `Error occurred while resolving destination path for '${_destination}'. ` +
          `Destination should be relative to outputModelDir (not starting with '/').`
      );
      // return path.resolve(projectsRoot + destination);
    }
    if (_destination.includes('..')) {
      throw new CsvToModelError(
        `The file path must be contained to the app model directory and may not refer to directories outside of it (for instance should not contain ".."`
      );
    }
    const outputModelDir = path.resolve(_outputModelPath, '../../');
    const resolvedPath = path.resolve(outputModelDir, _destination);
    // const isValidDestination = isChildDirOrSameLevel(projectsRoot, resolvedPath);
    // if (!isValidDestination) {
    //   throw new CsvToModelError(`Resolved path ${resolvedPath} is out of projectsDirectory ${projectsRoot}.\nPlease change specified path.`);
    // }
    return resolvedPath;
  }

  function getSpecialActionLocalSource(_source, _outputModelPath) {
    // absolute path
    if (_source.startsWith(path.sep)) {
      return _source;
    }
    // relative path
    const outputModelDir = path.dirname(_outputModelPath);
    return path.resolve(outputModelDir, _source);
  }
}

/*
function isChildDirOrSameLevel (parent, child) {
  const relative = path.relative(parent, child);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}
*/

module.exports = handleSpecialAction;
