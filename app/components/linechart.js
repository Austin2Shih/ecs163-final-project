import appState from '../appState.js';
import {
  convertIdToName,
  convertNameToISO2,
} from '../utils/convertCountryCode.js';
import { addDisplayUpdateStep } from '../utils/updateDisplay.js';

// linechart of global warming over time
export default function displayLineChart(selectedCountry) {
  const { temperatureData } = appState.data;

  // convert country id to name and iso2 for consistency across csvs
  const selectedCountryName = convertIdToName(selectedCountry);
  const selectedCountryISO2 = convertNameToISO2(selectedCountryName);

  // Find the selected country's data
  let countryData = temperatureData.find((d) => d.ISO2 === selectedCountryISO2);

  // default to world data if unselected
  if (!countryData) {
    countryData = temperatureData.find((d) => d.Country === 'World');
  }

  // Transform data from wide to long format
  const years = Object.keys(countryData).filter((key) => !isNaN(key));
  const transformedData = years
    .map((year) => ({
      year: new Date(parseInt(year), 0, 1),
      meanTemp: parseFloat(countryData[year]),
    }))
    .filter((d) => !isNaN(d.meanTemp)); // Filter out any invalid data points

  const svg = d3.select('#line-chart-svg');
  const { width, height } = svg.node().getBoundingClientRect();
  svg.attr('viewBox', `0 0 ${width} ${height}`);

  const margin = { top: 30, right: 30, bottom: 50, left: 70 };
  const contentWidth = width - margin.left - margin.right;
  const contentHeight = height - margin.top - margin.bottom;

  // Clear existing elements for redraw
  svg.selectAll('*').remove();

  // Create scales
  const xScale = d3
    .scaleTime()
    .domain(d3.extent(transformedData, (d) => d.year))
    .range([margin.left, width - margin.right]);

  const yScale = d3
    .scaleLinear()
    .domain([
      Math.floor(d3.min(transformedData, (d) => d.meanTemp) * 10) / 10 - 0.1,
      Math.ceil(d3.max(transformedData, (d) => d.meanTemp) * 10) / 10 + 0.1,
    ])
    .range([height - margin.bottom, margin.top]);

  // Create line generator
  const line = d3
    .line()
    .x((d) => xScale(d.year))
    .y((d) => yScale(d.meanTemp))
    .curve(d3.curveMonotoneX);

  // Add axes
  const xAxis = d3.axisBottom(xScale).ticks(10).tickFormat(d3.timeFormat('%Y'));

  const yAxis = d3
    .axisLeft(yScale)
    .ticks(8)
    .tickFormat((d) => d.toFixed(1) + '°C');

  svg
    .append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(xAxis)
    .attr('class', 'x-axis');

  svg
    .append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(yAxis)
    .attr('class', 'y-axis');

  // Add line path with animation
  const path = svg
    .append('path')
    .datum(transformedData)
    .attr('fill', 'none')
    .attr('stroke', '#9467bd')
    .attr('stroke-width', 2.5)
    .attr('d', line);

  // Get the total length of the path
  const totalLength = path.node().getTotalLength();

  // Set up the starting position of the line
  path
    .attr('stroke-dasharray', totalLength + ' ' + totalLength)
    .attr('stroke-dashoffset', totalLength)
    .transition()
    .duration(1000)
    .ease(d3.easeLinear)
    .attr('stroke-dashoffset', 0);

  // Add dots with animation
  const dots = svg
    .selectAll('.dot')
    .data(transformedData)
    .enter()
    .append('circle')
    .attr('class', 'dot')
    .attr('cx', (d) => xScale(d.year))
    .attr('cy', (d) => yScale(d.meanTemp))
    .attr('r', 3)
    .attr('fill', '#9467bd')
    .style('opacity', 0)
    .transition()
    .delay((d, i) => i * (1000 / transformedData.length))
    .duration(200)
    .style('opacity', 0.7);

  // Add tooltip
  const tooltip = d3
    .select('body')
    .append('div')
    .attr('class', 'tooltip')
    .style('opacity', 0)
    .style('position', 'absolute')
    .style('background-color', 'white')
    .style('border', '1px solid #ddd')
    .style('padding', '10px')
    .style('border-radius', '5px')
    .style('pointer-events', 'none')
    .style('max-width', '300px')
    .style('word-wrap', 'break-word');

  // Add hover effects
  svg
    .selectAll('.dot')
    .on('mouseover', (event, d) => {
      tooltip.transition().duration(200).style('opacity', 0.9);

      tooltip.html(
        `Year: ${d.year.getFullYear()}<br/>Temperature: ${d.meanTemp.toFixed(
          2
        )}°C`
      );

      // Calculate tooltip position to prevent going off-screen
      const tooltipNode = tooltip.node();
      const tooltipRect = tooltipNode.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Calculate initial position
      let left = event.pageX + 10;
      let top = event.pageY - 28;

      // Adjust horizontal position if needed
      if (left + tooltipRect.width > viewportWidth - 10) {
        left = event.pageX - tooltipRect.width - 10;
      }

      // Adjust vertical position if needed
      if (top + tooltipRect.height > viewportHeight - 10) {
        top = event.pageY - tooltipRect.height - 10;
      }

      // Ensure tooltip doesn't go off the left or top of the screen
      left = Math.max(10, left);
      top = Math.max(10, top);

      tooltip.style('left', left + 'px').style('top', top + 'px');
    })
    .on('mouseout', () => {
      tooltip.transition().duration(500).style('opacity', 0);
    });

  // Add axis labels
  svg
    .append('text')
    .attr('class', 'x-label')
    .attr('text-anchor', 'middle')
    .attr('x', width / 2)
    .attr('y', height - 10)
    .style('font-size', '10px')
    .text('Year');

  svg
    .append('text')
    .attr('class', 'y-label')
    .attr('text-anchor', 'middle')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', 25)
    .style('font-size', '10px')
    .text('Mean Surface Temperature Change (°C)');

  // Add title with country name
  svg
    .append('text')
    .attr('class', 'chart-title')
    .attr('text-anchor', 'middle')
    .attr('x', width / 2)
    .attr('y', margin.top - 10)
    .style('font-size', '12px')
    .style('font-weight', 'bold')
    .text(
      `${
        selectedCountryName || 'World'
      } Surface Temperature Change (1951-1980 baseline)`
    );

  // Add grid lines
  svg
    .append('g')
    .attr('class', 'grid')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(
      d3.axisBottom(xScale).ticks(10).tickSize(-contentHeight).tickFormat('')
    )
    .style('stroke-dasharray', '2,2')
    .style('stroke-opacity', 0.2);

  svg
    .append('g')
    .attr('class', 'grid')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(yScale).ticks(8).tickSize(-contentWidth).tickFormat(''))
    .style('stroke-dasharray', '2,2')
    .style('stroke-opacity', 0.2);
}

addDisplayUpdateStep(() => {
  displayLineChart(appState.selectedCountry);
});
