import * as d3 from 'd3';

const util = {wrap};
export default util;

// from here: https://gist.github.com/guypursey/f47d8cd11a8ff24854305505dbbd8c07
function wrap(text) {
  text.each(function() {
    var text = d3.select(this),
      words = text.text().split(/\s+/).reverse(),
      word,
      line = [],
      lineNumber = 0,
      lineHeight = 1.1, // ems
      tspan = text.attr("y", "-1em").text(null).append("tspan").attr("x", 0).attr("dy", lineHeight + "em"),
      width = this && this.parentNode && this.parentNode.firstChild ? d3.select(this.parentNode.firstChild).attr("r") * 0.9 : 100;

    while (word = words.pop()) {
      line.push(word)
      tspan.text(line.join(" "))
      if (tspan.node().getComputedTextLength() > width) {
        line.pop()
        tspan.text(line.join(" "))
        line = [word]
        tspan = text.append("tspan").attr("x", 0).attr("dy", `${lineHeight}em`).text(word)
      }
    }
  })
};