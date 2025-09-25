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
        .selectAll('circle.state-circle')
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

export const sizeLegend = (selection, {
    sizeScale,
    width,
    height,
    numTicks,
    circleFill
}) => {
    
    let spacing = 50;
    let xOffset = width * 0.85;
    let yOffset = height * 0.17;

    const ticks = sizeScale.ticks(numTicks)
                    .filter(d => d!=0)
                    .reverse();

    const groups = selection.selectAll('g')
                    .data(ticks);

    const groupsEnter = groups.enter()
                        .append('g')
                        .attr('class', 'tick');

    groupsEnter.merge(groups)
        .attr('transform', (d, i) => `translate(${xOffset}, ${yOffset - sizeScale(d)})`);

    groups.exit().remove();

    groupsEnter.append('circle')
        // .merge(groups.select('circle'))
        .attr('class', 'legend-circle')
        .transition().duration(750)
        .attr('r', sizeScale)
        .attr('fill', 'transparent')
        .attr('stroke', circleFill);

    groups.select('circle')
        .attr('class', 'legend-circle')
        .attr('r', sizeScale)
        .attr('fill', 'transparent')
        .attr('stroke', circleFill);
      

    groupsEnter.append("text");

    groupsEnter.merge(groups)
        .select('text')
        .attr('class', 'legend-text')
        .text(abbreviateNumber)
        .attr('dy', '-0.15em')
        .attr('y', (d, i) => -sizeScale(d) + 2*i);
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

const numberFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 1,
});

export const abbreviateNumber = (number) => {
  const numberCleaned = Math.round(Math.abs(number));
  if (numberCleaned < 1e3) return numberFormatter.format(Math.floor(number));
  else if (numberCleaned >= 1e3 && numberCleaned < 1e5)
    return numberFormatter.format(number / 1e3) + 'K';
  else if (numberCleaned >= 1e5 && numberCleaned < 1e7)
    return numberFormatter.format(number / 1e5) + 'L';
  else if (numberCleaned >= 1e7 && numberCleaned < 1e10)
    return numberFormatter.format(number / 1e7) + 'Cr';
  else if (numberCleaned >= 1e10 && numberCleaned < 1e14)
    return numberFormatter.format(number / 1e10) + 'K Cr';
  else if (numberCleaned >= 1e14)
    return numberFormatter.format(number / 1e14) + 'L Cr';
};