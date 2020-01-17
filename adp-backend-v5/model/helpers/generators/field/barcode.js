const defaultCharset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 !?:;.,';
const digitCharset = '0123456789';
const code39Charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-.$/ %* ';
const code128Charset =
  ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';

module.exports = ({ random }) => {
  function genEan13() {
    return random.string(13, digitCharset);
  }

  function genEan8() {
    return random.string(8, digitCharset);
  }

  function genUpcA() {
    return random.string(12, digitCharset);
  }

  function genItf() {
    return random.string(14, digitCharset);
  }

  function genQrCode() {
    return random.string(random.integer(5, 30), defaultCharset);
  }

  function genCode39() {
    return random.string(random.integer(5, 30), code39Charset);
  }

  function genCode128() {
    return random.string(random.integer(5, 30), code128Charset);
  }

  const barcodeGenerators = [genEan13, genEan8, genUpcA, genItf, genQrCode, genCode39, genCode128];

  return {
    scgBarcode() {
      return random.pick(barcodeGenerators)();
    },
  };
};
