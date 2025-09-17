import { STATE_NAMES, 
        STATE_CODES } from './constants.js';

const { max } = d3;

export function fillCircles({covid_data, 
                            category, 
                            sizeScale, 
                            selection,
                            features}) {
    sizeScale.domain([0, max(Object.entries(covid_data), 
        d => d[0]!='TT'?d[1][category]:0)])
        .nice();

    const circles = selection
        .selectAll('circle')
        .data(features);

    circles.enter()
        .append('circle')
        .attr('class', 'state-circle')
        .attr('data-category', category)
        .attr('cx', d => d.properties.centroid[0])
        .attr('cy', d => d.properties.centroid[1])
        .transition().duration(750)
        .attr('r', d => sizeScale(covid_data[STATE_CODES[d.id]][category]))
        .attr('fill', 'rgb(0 0 0 / 5%)')
        .attr('stroke', 'black');
}