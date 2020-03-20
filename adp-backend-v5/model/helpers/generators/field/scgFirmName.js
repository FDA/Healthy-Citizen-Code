const _ = require('lodash');

module.exports = ({ random }) => {
  // generated here: https://loremipsum.io/generator/?n=20&t=p
  const words1 = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Mi proin sed libero enim sed faucibus turpis in. Id neque aliquam vestibulum morbi blandit. Aliquam purus sit amet luctus venenatis lectus magna. Quis ipsum suspendisse ultrices gravida dictum fusce ut placerat orci. Tempor orci dapibus ultrices in iaculis nunc sed augue. Faucibus in ornare quam viverra orci sagittis eu volutpat. Fringilla ut morbi tincidunt augue interdum velit euismod. Lobortis elementum nibh tellus molestie nunc non blandit massa enim. Natoque penatibus et magnis dis parturient montes nascetur ridiculus mus. Quis lectus nulla at volutpat diam ut venenatis tellus. Vulputate dignissim suspendisse in est ante in nibh. In tellus integer feugiat scelerisque varius morbi enim. Posuere morbi leo urna molestie at elementum eu facilisis sed. Non tellus orci ac auctor augue. Id interdum velit laoreet id donec. Elementum eu facilisis sed odio. Sed pulvinar proin gravida hendrerit. Ut lectus arcu bibendum at varius. Gravida quis blandit turpis cursus in hac habitasse platea. Facilisis volutpat est velit egestas. Quis blandit turpis cursus in hac habitasse platea dictumst. Sed risus ultricies tristique nulla aliquet enim tortor at auctor. Nisl rhoncus mattis rhoncus urna neque viverra justo. Parturient montes nascetur ridiculus mus. Risus pretium quam vulputate dignissim. Nunc vel risus commodo viverra maecenas accumsan lacus vel. Donec ac odio tempor orci dapibus ultrices in iaculis. Netus et malesuada fames ac turpis. Ullamcorper sit amet risus nullam eget felis eget nunc lobortis. Maecenas volutpat blandit aliquam etiam erat velit. Non odio euismod lacinia at quis risus sed vulputate odio. Nam aliquam sem et tortor consequat id porta nibh venenatis'.split(
    /[ .]/
  );
  const words2 = 'Technologies enterprizes research'.split(' ');
  const suffixes = 'LLC Inc. Corp. PLC GmbH Limited Corporation'.split(' ');
  return {
    scgFirmName() {
      const nameArr = [];
      for (let i = 0; i < random.integer(1, 3); ++i) {
        nameArr.push(words1[random.integer(0, words1.length - 1)]);
      }
      nameArr.push(words2[random.integer(0, words2.length - 1)]);
      return _.startCase(`${_.join(nameArr, ' ')}, ${random.pick(suffixes)}`);
    },
    scgBrandName() {
      const nameArr = [];
      for (let i = 0; i < random.integer(1, 2); ++i) {
        nameArr.push(words1[random.integer(0, words1.length - 1)]);
      }
      return _.startCase(_.join(nameArr, ' '));
    },
  };
};
