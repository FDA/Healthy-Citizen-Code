module.exports = ({ random, handleUpload, fileList }) => {
  return {
    scgFile() {
      const file = random.pick(fileList.files);
      return handleUpload(file);
    },
    scgAudio() {
      const file = random.pick(fileList.audio);
      return handleUpload(file);
    },
    scgVideo() {
      const file = random.pick(fileList.video);
      return handleUpload(file);
    },
    scgImage() {
      const file = random.pick(fileList.images);
      return handleUpload(file);
    },
  };
};
