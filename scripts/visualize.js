const { select,
        json,
        geoMercator,
        geoPath
 } = d3;

const { feature } = topojson;

const svg = select(".map");

const svg_style = window.getComputedStyle(svg.node());

const width = parseInt(svg_style.getPropertyValue('width'));
const height= parseInt(svg_style.getPropertyValue('height'));

console.log(width, height);

const g = svg.append('g');

const projection = geoMercator();
const pathGenerator = geoPath(projection);

let states = {};

Promise.all([
    d3.json('static/india.json')
]).then(function([country]) {
    states = topojson.feature(country, country.objects.states);

    projection.scale(1).translate([0, 0]);

    const bounds = pathGenerator.bounds(states);

    const dx = bounds[1][0] - bounds[0][0], // width of box
          dy = bounds[1][1] - bounds[0][1], // height of box
          x = (bounds[1][0] + bounds[0][0])/2, // mid point
          y = (bounds[1][1] + bounds[0][1])/2; // of the bounding box

    // taking 95% of canvas to bbox ratio is maintained
    // to account for margin
    const s = 0.95 / Math.max( dx/width, dy/height );
    // translate from (width/2, height/2) to (x, y)
    const t = [width/2 - s*x, height/2 - s*y];

    projection.scale(s).translate(t);

    g.selectAll('path')
     .data(states.features)
     .enter()
     .append('path')
     .attr('d', pathGenerator)
     .attr('class', 'state')
     .attr('fill', 'transparent')
     .attr('stroke', 'rgb(0, 0, 0)');

     // here comes the observer API
     new ResizeObserver(entries => {
        let width, height;
        for (entry of entries) {
            if (entry.contentBoxSize[0]) {
                width = entry.contentBoxSize[0].inlineSize;
                height = entry.contentBoxSize[0].blockSize;
            } else {
                width = entry.contentBoxSize.inlineSize;
                height = entry.contentBoxSize.blockSize;
            }

            projection.scale(1).translate([0, 0]);

            const dx = bounds[1][0] - bounds[0][0], // width of box
                dy = bounds[1][1] - bounds[0][1], // height of box
                x = (bounds[1][0] + bounds[0][0])/2, // mid point
                y = (bounds[1][1] + bounds[0][1])/2; // of the bounding box

            const s = 0.95 / Math.max( dx/width, dy/height );
            // translate from (width/2, height/2) to (x, y)
            const t = [width/2 - s*x, height/2 - s*y];

            projection.scale(s).translate(t);

            select(entry.target)
                .selectAll('path')
                .data(states.features)
                .attr('d', pathGenerator);
        }
     }).observe(svg.node());
});