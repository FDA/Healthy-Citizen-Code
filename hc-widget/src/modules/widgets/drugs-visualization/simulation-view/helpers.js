import * as d3 from 'd3';

// from here: https://gist.github.com/guypursey/f47d8cd11a8ff24854305505dbbd8c07
export function wrapText(textNode) {
  textNode.each(function() {
    const text = d3.select(this);
    const words = text
      .text()
      .split(/\s+/)
      .reverse();

    const lineHeight = 1.1; // ems
    let tspan = text
      .attr('y', '-1em')
      .text(null)
      .append('tspan')
      .attr('x', 0)
      .attr('dy', `${lineHeight}em`);

    const width =
      this && this.parentNode && this.parentNode.firstChild
        ? d3.select(this.parentNode.firstChild).attr('r') * 0.9
        : 100;

    let line = [];
    let word = words.pop();

    while (word) {
      line.push(word);
      tspan.text(line.join(' '));

      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(' '));
        line = [word];

        tspan = text
          .append('tspan')
          .attr('x', 0)
          .attr('dy', `${lineHeight}em`)
          .text(word);

        word = words.pop();
      }
    }
  });
}
