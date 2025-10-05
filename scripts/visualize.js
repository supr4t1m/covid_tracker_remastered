import { STATE_NAMES, 
        STATE_CODES } from './constants.js' 
import { fillCircles,
         sizeLegend,
         animatedNumber } from './drawingUtil.js';

const { select,
        json,
        geoMercator,
        geoPath,
        geoCentroid,
        scaleSqrt,
        scaleOrdinal,
        max
 } = d3;

const { feature } = topojson;

const svg = select(".map");

const svg_style = window.getComputedStyle(svg.node());

let width = parseInt(svg_style.getPropertyValue('width'));
let height= parseInt(svg_style.getPropertyValue('height'));

const g = svg.append('g');

const projection = geoMercator();
const pathGenerator = geoPath(projection);

const sizeScale = scaleSqrt()
                    .range([0, Math.min(width, height)/20]);

const colorScale = scaleOrdinal()
    .domain(["confirmed", "active", "recovered", "deceased"])
    .range(['#ff073a', '#007bff', '#28a745', '#6c757d']);

let states = {};
export let covid_data = {};

Promise.all([
    json('static/india.json'),
    Promise.resolve(json('https://data.incovid19.org/v4/min/data.min.json').catch(err => json('static/data.min.json')))
]).then(function([country, raw_data]) {

    Object.entries(raw_data).forEach(([st_code, st_data], i) => {
        covid_data[st_code] = st_data.total;
        covid_data[st_code].active = covid_data[st_code].confirmed?covid_data[st_code].confirmed:0;
        covid_data[st_code].active -= covid_data[st_code].recovered?covid_data[st_code].recovered:0;
        covid_data[st_code].active -= covid_data[st_code].deceased?covid_data[st_code].deceased:0;
        covid_data[st_code].active -= covid_data[st_code].other?covid_data[st_code].other:0;
    });

    states = feature(country, country.objects.states);

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
     .attr('stroke', colorScale('confirmed'));

    fillCircles({ covid_data: covid_data, 
        category: 'confirmed',
        sizeScale: sizeScale,
        colorScale: colorScale,
        selection: g,
        features: states.features});

    sizeLegend(g, {
        sizeScale,
        width,
        height,
        numTicks: 4, 
        circleFill: colorScale('confirmed')
    });

    const categoryItem = document.querySelectorAll("#category_dropdown li");

    const circles = g.selectAll('circle.state-circle').data(states.features);


    
    let card = document.querySelector('.data-card');
    let cardHeader = document.querySelector('.data-card__header');
    let cardSubheader = document.querySelector('.data-card__body > h5');
    let cardNum = document.querySelector('.data-card__body > h1');

    let selectedState = document.querySelector('#states_dropdown .dropdown__item-selected');
    let selectedCategory = document.querySelector('#category_dropdown .dropdown__item-selected');

    let target = covid_data[selectedState.dataset.stcode]['confirmed'];

    card.style.backgroundColor = colorScale(selectedCategory.dataset.category) + '1A';

    cardSubheader.textContent = selectedState.textContent;
    cardHeader.textContent = selectedCategory.textContent;

    (async () => {
        animatedNumber(cardNum, 450, target);
    })();
    
    for (let item of categoryItem) {
        item.addEventListener("click", function(event) {
            event.preventDefault();

            let category = this.dataset.category;

            let selectedState = document.querySelector('#states_dropdown .dropdown__item-selected');
            
            let target = covid_data[selectedState.dataset.stcode][category];

            card.style.backgroundColor = colorScale(category) + '1A';
            cardHeader.textContent = this.textContent;

            // animate the card number
            (async () => {
                animatedNumber(cardNum, 450, target);
            })();
            
            sizeScale.domain([0, max(Object.entries(covid_data), 
                d => d[0]!='TT'?d[1][category]:0)])
                .nice();
            
            select('svg.map > g').selectAll('path')
                .attr('stroke', colorScale(category));

            sizeLegend(g, {
                sizeScale,
                width, 
                height, 
                numTicks: 4,
                circleFill: colorScale(category)
            });

            circles
                .attr('data-category', category)
                .attr('fill', colorScale(category))
                .attr('stroke', colorScale(category))
                .transition()
                .duration(750)
                .attr('r', d => sizeScale(covid_data[STATE_CODES[d.id]][category]));
        });
    }

     // here comes the observer API
     new ResizeObserver(entries => {
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
                    .selectAll('circle.state-circle')
                    .data(states.features)
                    .attr('cx', d => d.properties.centroid[0])
                    .attr('cy', d => d.properties.centroid[1])
                    .attr('r', (d, i, elem) => sizeScale(
                        covid_data[STATE_CODES[d.id]][elem[i]
                        .getAttribute('data-category')]
                    ));

                let selectedCategory = document.querySelector('#category_dropdown .dropdown__item-selected');
                let category = selectedCategory.dataset.category;

                sizeLegend(g, {
                    sizeScale,
                    width, 
                    height, 
                    numTicks: 4,
                    circleFill: colorScale(category)
                });
            })();
        }
     }).observe(svg.node());
});