import { STATE_NAMES, 
        STATE_CODES } from './constants.js' 
import { fillCircles } from './drawingUtil.js';

const { select,
        json,
        geoMercator,
        geoPath,
        geoCentroid,
        scaleSqrt,
        max
 } = d3;

const { feature } = topojson;

const svg = select(".map");

const svg_style = window.getComputedStyle(svg.node());

const width = parseInt(svg_style.getPropertyValue('width'));
const height= parseInt(svg_style.getPropertyValue('height'));

const g = svg.append('g');

const projection = geoMercator();
const pathGenerator = geoPath(projection);

const sizeScale = scaleSqrt()
                    .range([0, Math.min(width, height)/20]);

let states = {};
let covid_data = {};

Promise.all([
    json('static/india.json'),
    json('static/data.min.json')
]).then(function([country, raw_data]) {

    Object.entries(raw_data).forEach(([st_code, st_data], i) => {
        covid_data[st_code] = st_data.total;
        covid_data[st_code].active = covid_data.confirmed?data.confirmed:0;
        covid_data[st_code].active -= covid_data.recovered?data.recovered:0;
        covid_data[st_code].active -= covid_data.deceased?data.deceased:0;
        covid_data[st_code].active -= covid_data.other?data.other:0;
    });

    states = topojson.feature(country, country.objects.states);

    // the changes must w.r.t. unit scale and origin
    projection.scale(1).translate([0, 0]);

    // get the bounding box for the whole country
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

    states.features.forEach(state => {
        state.properties.centroid = projection(geoCentroid(state));
    });

    g.selectAll('path')
     .data(states.features)
     .enter()
     .append('path')
     .attr('d', pathGenerator)
     .attr('class', 'state')
     .attr('fill', 'transparent')
     .attr('stroke', 'rgb(0, 0, 0)');

    fillCircles({ covid_data: covid_data, 
        category: 'confirmed',
        sizeScale: sizeScale,
        selection: g,
        features: states.features});

     // here comes the observer API
     new ResizeObserver(entries => {
        let width, height;
        for (let entry of entries) {
            if (entry.contentBoxSize[0]) {
                width = entry.contentBoxSize[0].inlineSize;
                height = entry.contentBoxSize[0].blockSize;
            } else {
                width = entry.contentBoxSize.inlineSize;
                height = entry.contentBoxSize.blockSize;
            }

            // the changes must be made w.r.t. unit scale and origin
            projection.scale(1).translate([0, 0]);

            const dx = bounds[1][0] - bounds[0][0], // width of box
                dy = bounds[1][1] - bounds[0][1], // height of box
                x = (bounds[1][0] + bounds[0][0])/2, // mid point
                y = (bounds[1][1] + bounds[0][1])/2; // of the bounding box

            const s = 0.95 / Math.max( dx/width, dy/height );
            // translate from (width/2, height/2) to (x, y)
            const t = [width/2 - s*x, height/2 - s*y];

            projection.scale(s).translate(t);

            (async () => {
                states.features.forEach(state => {
                    state.properties.centroid = projection(geoCentroid(state));
                });
                
                select(entry.target)
                .selectAll('path')
                .data(states.features)
                .attr('d', pathGenerator);

                sizeScale.range([0, Math.min(width, height)/20]);

                // TODO: make the category dynamic based on the 
                // dropdown selection

                select(entry.target)
                    .selectAll('circle')
                    .data(states.features)
                    .attr('cx', d => d.properties.centroid[0])
                    .attr('cy', d => d.properties.centroid[1])
                    .attr('r', (d, i, elem) => sizeScale(
                        covid_data[STATE_CODES[d.id]][elem[i]
                        .getAttribute('data-category')]
                    ));
            })();
        }
     }).observe(svg.node());
});