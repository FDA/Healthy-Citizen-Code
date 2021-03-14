const fs = require('fs-extra');
const path = require('path');
const parseUrl = require('parseurl');
const Promise = require('bluebird');
const mime = require('mime');
const _ = require('lodash');

// the way it's done is similar to serve-static module
function getRelativePath(req) {
  let { pathname } = parseUrl(req);
  // make sure redirect occurs at mount
  if (pathname === '/' && parseUrl.original(req).pathname.substr(-1) !== '/') {
    pathname = '';
  }
  return pathname;
}

function serveDirs(dirs, opts = {}) {
  const { fileMatcher = () => true } = opts;
  const dirFullPaths = dirs.map((dir) => path.resolve(dir));

  return async (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const errMsg = `Method Not Allowed: ${req.method}`;
      res.status(405).json({ error: errMsg });
      return next(errMsg);
    }

    const relativePath = getRelativePath(req);
    const { files, type: accessType } = await mergeNestedFilesWithoutDirs(dirFullPaths, relativePath);
    if (accessType === 'file') {
      const file = files[0];
      const isValidFile = fileMatcher({ file, accessType, relativePath });
      if (!isValidFile) {
        res.status(403).json({ success: false, message: 'Forbidden to access file' });
      }
      return serveFile(file, req, res, next);
    }

    const filteredFiles = files.filter((file) => fileMatcher({ file, accessType, relativePath }));
    if (accessType === 'directory') {
      if (filteredFiles.length) {
        const preparedFiles = filteredFiles.map((file) => _.pick(file, ['type', 'size', 'name', 'mimeType']));
        return res.status(200).json({ success: true, data: preparedFiles });
      }
      return res.status(403).json({ success: false, message: 'Forbidden to access directory' });
    }

    res.status(404).send({ success: false, message: 'File not found' });
  };
}

/**
 * Resolves a type(dir or single file) of specified dirsPaths+relativePath and files to send.
 Suppose we have dirsPaths=['dir1', 'dir2'], relativePath='/p',  options:
 1. If 'dir1/p' is a file then serve this single file no matter 'dir2/p' is a file or a directory. Response - { files: ['dir1/p'], type: 'file' }
 2. If 'dir1/p' is a dir (for example with files ['dir1/p/1', 'dir1/p/2']) then check 'dir2/p'
 2.a If 'dir2/p' is a file then serve 'dir1/p' directory. Response - { files: ['dir1/p/1', 'dir1/p/2'], type: 'directory' }
 2.b If 'dir2/p' is a directory (for example with files ['dir2/p/2', 'dir2/p/3']) then serve entries from both directories 'dir1/p' and 'dir2/p' with giving 'dir1/p' first priority.
 Response - { files: ['dir1/p/1', 'dir1/p/2', 'dir2/p/3'], type: 'directory' }
 3. If 'dir1/p' does not exists remove 'dir1' from consideration, respond like dirsPaths=['dir2'].
 * @param dirsPaths - for example [ "/home/apps/prototype/public", "/home/apps/adp-backend-v5/model/public"]
 * @param relativePath - for example '/js/client-modules/'
 */
async function mergeFiles(dirsPaths, relativePath) {
  const files = new Map();
  let type;

  for (const dirPath of dirsPaths) {
    const filePath = path.join(dirPath, relativePath);
    const stats = await getStats(filePath, relativePath);
    const isFileNotFound = stats === null;
    if (isFileNotFound) {
      continue;
    }

    type = stats.type;
    if (type === 'file') {
      files.set(path.basename(filePath), stats);
      break;
    }

    const fileNamesInDir = await fs.readdir(filePath);
    await Promise.map(fileNamesInDir, async (fileNameInDir) => {
      if (!files.has(fileNameInDir)) {
        // consider current file only if it does not exist in previous directories
        const dirFilePath = path.join(filePath, fileNameInDir);
        const dirFileSubPath = path.relative(dirPath, dirFilePath);
        files.set(fileNameInDir, await getStats(dirFilePath, dirFileSubPath));
      }
    });
  }

  return {
    files: [...files.values()],
    type,
  };
}

/**
 * Quite similar to mergeFiles except it sends nested files recursively traversing directories and not includes directory files.
 * @param dirsPaths - for example [ "/home/apps/prototype/public", "/home/apps/adp-backend-v5/model/public"]
 * @param relativePath - for example '/js/client-modules/'
 * @param relativePathToResolveName - necessary to create nested file names. For nested dirs relativePath param changes and relativePathToResolveName stays the same.
 * @param files
 */
async function mergeNestedFilesWithoutDirs(
  dirsPaths,
  relativePath,
  relativePathToResolveName = relativePath,
  files = new Map()
) {
  let type;

  for (const dirPath of dirsPaths) {
    const filePath = path.join(dirPath, relativePath);
    const stats = await getStats(filePath, relativePath);
    const isFileNotFound = stats === null;
    if (isFileNotFound) {
      continue;
    }

    type = stats.type;
    if (type === 'file') {
      const fullPathToResolveName = path.join(dirPath, relativePathToResolveName);
      const name = path.relative(fullPathToResolveName, filePath);
      if (!files.has(name)) {
        files.set(name, { ...stats, name });
      }
      break;
    }

    const fileNamesInDir = await fs.readdir(filePath);
    await Promise.map(fileNamesInDir, async (fileNameInDir) => {
      const nestedRelativePath = path.join(relativePath, fileNameInDir);
      return mergeNestedFilesWithoutDirs(dirsPaths, nestedRelativePath, relativePathToResolveName, files);
    });
  }

  return {
    files: [...files.values()],
    type,
  };
}

async function getStats(filePath, relativePath) {
  const stats = await fs.stat(filePath).catch(() => null);
  if (stats === null) {
    return null;
  }

  const isDir = stats.isDirectory();
  if (isDir) {
    return {
      filePath,
      relativePath,
      name: path.basename(filePath),
      type: 'directory',
    };
  }

  return {
    filePath,
    relativePath,
    name: path.basename(filePath),
    type: isDir ? 'directory' : 'file',
    size: stats.size,
    lastModified: stats.mtime,
    mimeType: mime.getType(filePath),
  };
}

function serveFile(opts, req, res, next) {
  const { maxAge = 3600, filePath, mimeType, size, lastModified } = opts;
  const fstream = fs.createReadStream(filePath);
  fstream.once('open', () => {
    res.set('Cache-Control', `public, max-age=${maxAge}`);
    res.set('Content-Length', size);
    res.set('Content-Type', mimeType);
    res.set('Last-Modified', lastModified);

    res.writeHead(200);
    fstream.pipe(res);
    fstream.once('close', () => {
      next(false);
    });
  });

  res.once('close', () => {
    fstream.close();
  });
}

module.exports = {
  mergeFiles,
  serveDirs,
  serveFile,
};
