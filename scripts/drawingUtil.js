import { STATE_NAMES, 
        STATE_CODES } from './constants.js';

const { max } = d3;

export function fillCircles({covid_data, 
                            category, 
                            sizeScale, 
                            colorScale,
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
        .attr('fill', colorScale(category))
        .attr('stroke', colorScale(category))
        .attr('opacity', 0.2)
        .transition().duration(750)
        .attr('r', d => sizeScale(covid_data[STATE_CODES[d.id]][category]));
}

// animation utilities
const timingFunctions = {
    linear: t => t,
    inOutQuad: t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t
}

export const animatedNumber = (element, duration=500, target) => {

    const start = parseInt(element.textContent.replace(/,/g, '')) || 0;
    const end = parseInt(target);

    if (start == end) return;

    const range = end - start;
    let curr = start;

    requestAnimationFrame((startTime) => {
        const animationLoop = (prevTimestamp) => {
            let elaps = prevTimestamp - startTime;
            if (elaps > duration) elaps = duration;
            const norm = timingFunctions.inOutQuad( elaps / duration );
            const step = norm * range; 
            curr = start + step;
            element.textContent = Math.trunc(curr).toLocaleString();
            if (elaps < duration) requestAnimationFrame(animationLoop);
        }

        requestAnimationFrame(animationLoop);
    });
}
