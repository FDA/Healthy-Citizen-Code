const _ = require('lodash');
// generated here: https://loremipsum.io/generator/?n=20&t=p
const loremIpsum =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Mi proin sed libero enim sed faucibus turpis in. Id neque aliquam vestibulum morbi blandit. Aliquam purus sit amet luctus venenatis lectus magna. Quis ipsum suspendisse ultrices gravida dictum fusce ut placerat orci. Tempor orci dapibus ultrices in iaculis nunc sed augue. Faucibus in ornare quam viverra orci sagittis eu volutpat. Fringilla ut morbi tincidunt augue interdum velit euismod. Lobortis elementum nibh tellus molestie nunc non blandit massa enim. Natoque penatibus et magnis dis parturient montes nascetur ridiculus mus. Quis lectus nulla at volutpat diam ut venenatis tellus. Vulputate dignissim suspendisse in est ante in nibh. In tellus integer feugiat scelerisque varius morbi enim. Posuere morbi leo urna molestie at elementum eu facilisis sed. Non tellus orci ac auctor augue. Id interdum velit laoreet id donec. ' +
  'Elementum eu facilisis sed odio. Sed pulvinar proin gravida hendrerit. Ut lectus arcu bibendum at varius. Gravida quis blandit turpis cursus in hac habitasse platea. Facilisis volutpat est velit egestas. Quis blandit turpis cursus in hac habitasse platea dictumst. Sed risus ultricies tristique nulla aliquet enim tortor at auctor. Nisl rhoncus mattis rhoncus urna neque viverra justo. Parturient montes nascetur ridiculus mus. Risus pretium quam vulputate dignissim. Nunc vel risus commodo viverra maecenas accumsan lacus vel. Donec ac odio tempor orci dapibus ultrices in iaculis. Netus et malesuada fames ac turpis. Ullamcorper sit amet risus nullam eget felis eget nunc lobortis. Maecenas volutpat blandit aliquam etiam erat velit. Non odio euismod lacinia at quis risus sed vulputate odio. Nam aliquam sem et tortor consequat id porta nibh venenatis. ' +
  'Aliquam sem et tortor consequat id porta. Iaculis urna id volutpat lacus. Nunc sed id semper risus. Ullamcorper a lacus vestibulum sed. Pharetra et ultrices neque ornare aenean euismod elementum nisi quis. Turpis massa tincidunt dui ut ornare lectus sit amet. Tellus at urna condimentum mattis pellentesque id nibh tortor id. Et pharetra pharetra massa massa ultricies. Nec ullamcorper sit amet risus nullam. Neque sodales ut etiam sit amet nisl purus in. Sapien pellentesque habitant morbi tristique senectus et netus et malesuada. Pellentesque id nibh tortor id aliquet lectus proin nibh nisl. Fermentum iaculis eu non diam phasellus vestibulum lorem sed risus. ' +
  'Sed odio morbi quis commodo odio aenean sed adipiscing diam. Nisl nisi scelerisque eu ultrices vitae. Amet nisl purus in mollis nunc sed id semper risus. Mauris a diam maecenas sed enim ut. Id leo in vitae turpis massa sed elementum tempus. Turpis cursus in hac habitasse platea. Tellus in metus vulputate eu. Venenatis tellus in metus vulputate eu scelerisque felis imperdiet. Faucibus purus in massa tempor nec. Et egestas quis ipsum suspendisse. Laoreet sit amet cursus sit amet dictum. Faucibus in ornare quam viverra orci sagittis eu volutpat odio. ' +
  'Ut lectus arcu bibendum at varius vel pharetra. Lacus sed turpis tincidunt id aliquet risus. Ultrices in iaculis nunc sed augue lacus viverra vitae. Malesuada proin libero nunc consequat interdum. Cursus in hac habitasse platea dictumst. Fusce ut placerat orci nulla pellentesque dignissim enim. Purus in mollis nunc sed id semper risus in hendrerit. Sed risus ultricies tristique nulla aliquet enim tortor. Sit amet facilisis magna etiam. Massa eget egestas purus viverra. Gravida cum sociis natoque penatibus et. Quam quisque id diam vel quam. Elit ullamcorper dignissim cras tincidunt. ' +
  'Eu mi bibendum neque egestas congue quisque egestas diam. A lacus vestibulum sed arcu non odio. Est placerat in egestas erat imperdiet sed euismod nisi porta. Sed elementum tempus egestas sed sed risus pretium. Massa vitae tortor condimentum lacinia quis vel eros donec ac. Rhoncus aenean vel elit scelerisque. Neque volutpat ac tincidunt vitae semper quis lectus. Pellentesque diam volutpat commodo sed egestas egestas fringilla phasellus. Nec ultrices dui sapien eget mi proin. Nisl suscipit adipiscing bibendum est ultricies integer quis auctor elit. Felis eget velit aliquet sagittis id. Diam quam nulla porttitor massa. Ac tincidunt vitae semper quis lectus nulla at volutpat. Dignissim sodales ut eu sem integer vitae justo. Hac habitasse platea dictumst vestibulum rhoncus est pellentesque elit. Enim nunc faucibus a pellentesque sit amet porttitor eget dolor. ' +
  'Sed risus pretium quam vulputate dignissim. Egestas pretium aenean pharetra magna. Velit aliquet sagittis id consectetur purus ut faucibus. Orci ac auctor augue mauris augue. Egestas maecenas pharetra convallis posuere morbi leo urna molestie. Massa tincidunt nunc pulvinar sapien et ligula. Vestibulum morbi blandit cursus risus at ultrices. Nunc pulvinar sapien et ligula ullamcorper malesuada proin. Blandit massa enim nec dui nunc mattis enim ut tellus. Porttitor massa id neque aliquam vestibulum morbi blandit cursus risus. In hac habitasse platea dictumst quisque sagittis purus. Vulputate sapien nec sagittis aliquam malesuada bibendum. At consectetur lorem donec massa sapien faucibus et. Euismod quis viverra nibh cras pulvinar mattis nunc. ' +
  'Libero nunc consequat interdum varius sit. Amet tellus cras adipiscing enim eu turpis egestas pretium. Cras semper auctor neque vitae tempus quam pellentesque. Tempus egestas sed sed risus pretium quam vulputate. Montes nascetur ridiculus mus mauris vitae ultricies leo integer malesuada. Nunc mi ipsum faucibus vitae aliquet nec ullamcorper sit amet. Ullamcorper eget nulla facilisi etiam. Id ornare arcu odio ut sem nulla. Pellentesque elit ullamcorper dignissim cras tincidunt. Urna condimentum mattis pellentesque id. Neque gravida in fermentum et sollicitudin ac orci phasellus. Et malesuada fames ac turpis egestas integer. Cras sed felis eget velit aliquet sagittis id consectetur purus. Vitae ultricies leo integer malesuada. Aliquet enim tortor at auctor urna nunc. Faucibus vitae aliquet nec ullamcorper sit amet. Laoreet suspendisse interdum consectetur libero. Aliquet nec ullamcorper sit amet risus. Eu augue ut lectus arcu bibendum at varius vel. ' +
  'Nibh ipsum consequat nisl vel pretium lectus. Elit at imperdiet dui accumsan. Sollicitudin ac orci phasellus egestas tellus. Condimentum id venenatis a condimentum vitae sapien pellentesque. Maecenas accumsan lacus vel facilisis volutpat est velit egestas dui. Faucibus pulvinar elementum integer enim neque volutpat. Elit ut aliquam purus sit amet. Urna duis convallis convallis tellus id. Adipiscing vitae proin sagittis nisl rhoncus. Turpis massa sed elementum tempus egestas sed. Egestas diam in arcu cursus euismod quis. Eu scelerisque felis imperdiet proin fermentum leo vel orci. ' +
  'Dignissim sodales ut eu sem integer vitae justo eget magna. Odio facilisis mauris sit amet massa vitae tortor condimentum lacinia. Euismod in pellentesque massa placerat duis ultricies lacus sed. Eleifend donec pretium vulputate sapien nec sagittis. Ornare lectus sit amet est placerat. Condimentum mattis pellentesque id nibh. Turpis massa tincidunt dui ut ornare lectus sit amet est. Duis at consectetur lorem donec massa. Nunc scelerisque viverra mauris in aliquam. Hac habitasse platea dictumst vestibulum rhoncus est pellentesque elit. Metus dictum at tempor commodo ullamcorper a lacus. Feugiat nibh sed pulvinar proin gravida. Sed nisi lacus sed viverra tellus in hac. Lorem ipsum dolor sit amet. ' +
  'Dapibus ultrices in iaculis nunc sed augue. Odio aenean sed adipiscing diam. Mauris ultrices eros in cursus. Amet commodo nulla facilisi nullam vehicula. Iaculis urna id volutpat lacus laoreet non curabitur gravida. Nisi lacus sed viverra tellus in hac habitasse platea. Mattis nunc sed blandit libero volutpat. Nulla pharetra diam sit amet nisl suscipit adipiscing bibendum. Pretium aenean pharetra magna ac. Nisi porta lorem mollis aliquam ut porttitor. Eu lobortis elementum nibh tellus. Sit amet nisl suscipit adipiscing bibendum est ultricies integer quis. Vitae et leo duis ut diam quam nulla porttitor massa. Pulvinar mattis nunc sed blandit. Dictum varius duis at consectetur lorem. ' +
  'Ut lectus arcu bibendum at varius. Odio pellentesque diam volutpat commodo sed egestas egestas fringilla. Diam vulputate ut pharetra sit amet aliquam. Consectetur libero id faucibus nisl. Dui sapien eget mi proin. Nunc scelerisque viverra mauris in. Ultrices eros in cursus turpis massa. Duis ut diam quam nulla porttitor massa id neque. Nunc consequat interdum varius sit amet mattis vulputate. Pellentesque massa placerat duis ultricies lacus sed. Nibh venenatis cras sed felis eget. Arcu ac tortor dignissim convallis aenean et tortor. Ut sem nulla pharetra diam sit amet nisl. Eleifend donec pretium vulputate sapien nec sagittis aliquam malesuada. Quam pellentesque nec nam aliquam sem et tortor. ' +
  'Mattis aliquam faucibus purus in massa tempor nec feugiat. Tincidunt vitae semper quis lectus. Nec sagittis aliquam malesuada bibendum arcu vitae elementum curabitur vitae. Sed odio morbi quis commodo. Quam adipiscing vitae proin sagittis. Viverra nam libero justo laoreet. Vivamus at augue eget arcu dictum varius duis. Sit amet massa vitae tortor condimentum lacinia quis vel. Turpis egestas integer eget aliquet nibh. Vestibulum morbi blandit cursus risus at ultrices mi tempus imperdiet. Velit egestas dui id ornare arcu. Adipiscing bibendum est ultricies integer. Ut faucibus pulvinar elementum integer enim. Pretium nibh ipsum consequat nisl vel pretium lectus quam. Lacus viverra vitae congue eu consequat ac felis. Nunc faucibus a pellentesque sit amet porttitor eget dolor. Ullamcorper velit sed ullamcorper morbi tincidunt ornare. ' +
  'Massa sed elementum tempus egestas sed sed risus. Sollicitudin tempor id eu nisl nunc mi ipsum. Sed blandit libero volutpat sed cras ornare arcu dui. In ante metus dictum at tempor. Tristique senectus et netus et malesuada. Sollicitudin ac orci phasellus egestas tellus rutrum. Auctor augue mauris augue neque gravida in fermentum et. Ullamcorper malesuada proin libero nunc consequat interdum. Sed id semper risus in hendrerit. Imperdiet nulla malesuada pellentesque elit eget gravida cum sociis natoque. Varius duis at consectetur lorem donec massa. Metus aliquam eleifend mi in nulla posuere. Fringilla phasellus faucibus scelerisque eleifend donec. Euismod lacinia at quis risus sed vulputate odio. Sagittis vitae et leo duis. Odio euismod lacinia at quis risus sed vulputate. Arcu risus quis varius quam quisque id diam vel quam. ' +
  'Ut lectus arcu bibendum at varius vel pharetra. Elementum eu facilisis sed odio morbi. Urna neque viverra justo nec ultrices dui. Augue eget arcu dictum varius duis at consectetur. Sed blandit libero volutpat sed cras ornare arcu. Ultrices sagittis orci a scelerisque purus semper eget. In massa tempor nec feugiat. Nunc scelerisque viverra mauris in aliquam sem fringilla. Quis eleifend quam adipiscing vitae. Velit laoreet id donec ultrices. Lorem mollis aliquam ut porttitor leo a diam sollicitudin tempor. Ut etiam sit amet nisl purus in mollis nunc sed. Dui ut ornare lectus sit amet est placerat in. Sapien eget mi proin sed libero enim sed. Montes nascetur ridiculus mus mauris vitae ultricies leo. In est ante in nibh mauris cursus. Tempor id eu nisl nunc mi. Sit amet purus gravida quis blandit. ' +
  'Sit amet facilisis magna etiam tempor orci eu. Integer vitae justo eget magna fermentum iaculis. Et netus et malesuada fames ac turpis egestas maecenas. Posuere ac ut consequat semper viverra nam. Cras ornare arcu dui vivamus arcu felis. Quisque id diam vel quam elementum pulvinar etiam non quam. Quis hendrerit dolor magna eget est. Lacus vel facilisis volutpat est velit egestas dui id ornare. Suscipit adipiscing bibendum est ultricies integer quis. Nisl vel pretium lectus quam id leo. Ut porttitor leo a diam. Magna fermentum iaculis eu non diam phasellus. Potenti nullam ac tortor vitae purus faucibus ornare. Donec enim diam vulputate ut pharetra sit amet aliquam id. Tincidunt arcu non sodales neque sodales. Nibh venenatis cras sed felis. Nibh ipsum consequat nisl vel pretium lectus quam. In nisl nisi scelerisque eu ultrices vitae auctor eu augue. ' +
  'Pellentesque eu tincidunt tortor aliquam nulla facilisi. Morbi tincidunt ornare massa eget egestas purus viverra accumsan. Ac felis donec et odio. Risus quis varius quam quisque id. A lacus vestibulum sed arcu non odio euismod lacinia. Fermentum leo vel orci porta non pulvinar neque. Quam quisque id diam vel quam elementum pulvinar. Vitae tortor condimentum lacinia quis vel eros donec. Vitae tortor condimentum lacinia quis vel eros donec ac. Vitae turpis massa sed elementum tempus egestas sed sed risus. Iaculis at erat pellentesque adipiscing commodo elit at. Quis imperdiet massa tincidunt nunc. Tempus egestas sed sed risus pretium quam. Pulvinar pellentesque habitant morbi tristique senectus. In arcu cursus euismod quis viverra. Lorem ipsum dolor sit amet consectetur adipiscing elit ut aliquam. Sed cras ornare arcu dui vivamus arcu felis bibendum ut. ' +
  'Et malesuada fames ac turpis. Ut venenatis tellus in metus vulputate eu. Faucibus turpis in eu mi. Ultrices sagittis orci a scelerisque purus. Morbi enim nunc faucibus a pellentesque sit amet. Tristique magna sit amet purus gravida. Quam lacus suspendisse faucibus interdum posuere lorem. Vestibulum lorem sed risus ultricies tristique nulla aliquet enim. Sed libero enim sed faucibus turpis in eu mi bibendum. Dolor magna eget est lorem ipsum dolor. ' +
  'Eu ultrices vitae auctor eu augue ut lectus arcu bibendum. Tempor id eu nisl nunc mi ipsum faucibus vitae. Sit amet nulla facilisi morbi tempus iaculis. Integer feugiat scelerisque varius morbi enim. Viverra justo nec ultrices dui sapien eget mi proin sed. Massa enim nec dui nunc mattis enim ut tellus elementum. Fermentum posuere urna nec tincidunt. Tristique et egestas quis ipsum suspendisse ultrices gravida dictum. Morbi tincidunt ornare massa eget egestas purus. Eget lorem dolor sed viverra. Turpis nunc eget lorem dolor sed viverra ipsum. Et pharetra pharetra massa massa ultricies. Ipsum dolor sit amet consectetur.';

module.exports = () => {
  function getString(length) {
    const start = Math.random() * (loremIpsum.length - 1) - length;
    const wordStart = loremIpsum.indexOf(' ', start);
    const wordEnd = loremIpsum.indexOf(' ', start + length);
    return _.upperFirst(
      loremIpsum.substr(wordStart + 1, wordEnd - wordStart - 1).replace(/[,?.]$/, '') +
        (Math.random() > 0.9 ? '?' : '.')
    );
  }

  return {
    scgString() {
      const { length = 40 } = this.params;
      return getString(length);
    },

    scgText() {
      const { length = 160 } = this.params;
      return getString(length);
    },

    scgHtml() {
      const { length = 160 } = this.params;
      return [
        `<!DOCTYPE html>`,
        `<html>`,
        `<head></head>`,
        `<body>`,
        `<div>${getString(length)}</div>`,
        `</body>`,
        `</html>`,
      ].join('\n');
    },
  };
};

/* another version
const defaultCharset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 !?:;.,';

module.exports = ({ random }) => {
  function scgString() {
    try {
      const { charset = defaultCharset, minLength = 0, maxLength = 254 } = this.params;
      return random.string(random.integer(minLength, maxLength), charset);
    } catch (e) {
      console.log(e);
    }
  }

  function scgText() {
    const { charset = defaultCharset, minLength = 0, maxLength = 1000 } = this.params;
    const textLength = random.integer(minLength, maxLength);
    const scgStringContext = { ...this, params: { charset, minLength: 1, maxLength: 9 } };
    let text = '';

    while (text.length !== textLength) {
      const remainLength = textLength - text.length;
      if (remainLength > 10) {
        const newWord = scgString.call(scgStringContext);
        text += `${newWord} `;
      } else {
        const newWord = random.string(remainLength, charset);
        text += newWord;
      }
    }
    return text;
  }

  return { scgString, scgText };
};
*/
