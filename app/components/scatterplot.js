import appState from '../appState.js';
import {
  convertIdToName,
  convertNameToISO2,
  convertISO2ToISO3,
} from '../utils/convertCountryCode.js';
import { addDisplayUpdateStep } from '../utils/updateDisplay.js';

// scatterplot of natural disasters over time
export default function displayScatterPlot(selectedCountry) {
  // Clear any existing SVG contents
  d3.select('#scatter-plot-svg').selectAll('*').remove();

  // Get the container dimensions
  const svg = d3.select('#scatter-plot-svg');
  const { width, height } = svg.node().getBoundingClientRect();
  svg.attr('viewBox', `0 0 ${width} ${height}`);

  const margin = { top: 30, right: 30, bottom: 50, left: 70 };
  const contentWidth = width - margin.left - margin.right;
  const contentHeight = height - margin.top - margin.bottom;

  // Create main group element
  const g = svg
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // convert country id to name and iso3 for consistency across csvs
  const selectedCountryName = convertIdToName(selectedCountry);
  const selectedCountryISO2 = convertNameToISO2(selectedCountryName);
  const selectedCountryISO3 = convertISO2ToISO3(selectedCountryISO2);
  console.log(selectedCountryISO3);

  // Filter earthquake data
  let earthquakeData = appState.data.disasterData?.filter((d) => {
    if (!d) return false;
    const isEarthquake = d['Disaster Type'] === 'Earthquake';
    const startYear = Number(d['Start Year']);
    const isInTimeRange = 1961 <= startYear && startYear <= 2024;
    const matchesCountry = !selectedCountry || d.ISO === selectedCountryISO3;
    return isEarthquake && isInTimeRange && matchesCountry;
  });

  console.log(earthquakeData);

  // If no country is selected, default to worldwide
  if (!selectedCountry) {
    earthquakeData = appState.data.disasterData?.filter((d) => {
      if (!d) return false;
      const isEarthquake = d['Disaster Type'] === 'Earthquake';
      const startYear = Number(d['Start Year']);
      const isInTimeRange = 1961 <= startYear && startYear <= 2024;
      return isEarthquake && isInTimeRange;
    });
    console.log(earthquakeData);
  }

  // Create scales
  const xScale = d3
    .scaleTime()
    .domain([new Date('1961-01-01'), new Date('2024-01-01')])
    .range([0, contentWidth]);

  const yScale = d3
    .scaleLinear()
    .domain([
      0,
      d3.max(earthquakeData, (d) => parseFloat(d['Magnitude'])) || 10,
    ])
    .range([contentHeight, 0]);

  // Create axes
  const xAxis = d3.axisBottom(xScale).ticks(10).tickFormat(d3.timeFormat('%Y'));

  const yAxis = d3.axisLeft(yScale).ticks(8);

  // Add X axis
  g.append('g')
    .attr('transform', `translate(0,${contentHeight})`)
    .call(xAxis)
    .attr('class', 'x-axis');

  // Add Y axis
  g.append('g').call(yAxis).attr('class', 'y-axis');

  // Add grid lines
  g.append('g')
    .attr('class', 'grid')
    .attr('transform', `translate(0,${contentHeight})`)
    .call(
      d3.axisBottom(xScale).ticks(10).tickSize(-contentHeight).tickFormat('')
    )
    .style('stroke-dasharray', '2,2')
    .style('stroke-opacity', 0.2);

  g.append('g')
    .attr('class', 'grid')
    .call(d3.axisLeft(yScale).ticks(8).tickSize(-contentWidth).tickFormat(''))
    .style('stroke-dasharray', '2,2')
    .style('stroke-opacity', 0.2);

  // Add tooltip div if it doesn't exist
  let tooltip = d3.select('body').select('.tooltip');
  if (tooltip.empty()) {
    tooltip = d3
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
  }

  // Add dots
  g.selectAll('circle')
    .data(earthquakeData)
    .enter()
    .append('circle')
    .attr('cx', (d) =>
      xScale(
        new Date(d['Start Year'], d['Start Month'] || 0, d['Start Day'] || 1)
      )
    )
    .attr('cy', (d) => yScale(parseFloat(d['Magnitude'])))
    .attr('r', 5)
    .style('fill', '#1f77b4')
    .style('opacity', 0.6)
    .on('mouseover', function (event, d) {
      d3.select(this).style('opacity', 1).attr('r', 8);

      tooltip.transition().duration(200).style('opacity', 0.9);

      const date = new Date(
        d['Start Year'],
        d['Start Month'] - 1 || 0,
        d['Start Day'] || 1
      );
      tooltip.html(
        `Location: ${d['Location'] || d['Country']}<br/>
        Magnitude: ${parseFloat(d['Magnitude']).toFixed(1)}<br/>
        Date: ${date.toLocaleDateString()}<br/>
        Total Deaths: ${d['Total Deaths'] || 'Unknown'}<br/>
        Total Affected: ${d['Total Affected'] || 'Unknown'}`
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
    .on('mouseout', function () {
      d3.select(this).style('opacity', 0.6).attr('r', 5);
      tooltip.transition().duration(500).style('opacity', 0);
    });

  // Add axis labels
  g.append('text')
    .attr('class', 'x-label')
    .attr('text-anchor', 'middle')
    .attr('x', contentWidth / 2)
    .attr('y', contentHeight + 40)
    .style('font-size', '10px')
    .text('Year');

  g.append('text')
    .attr('class', 'y-label')
    .attr('text-anchor', 'middle')
    .attr('transform', 'rotate(-90)')
    .attr('x', -contentHeight / 2)
    .attr('y', -50)
    .style('font-size', '10px')
    .text('Earthquake Magnitude');

  // Add title
  g.append('text')
    .attr('class', 'chart-title')
    .attr('text-anchor', 'middle')
    .attr('x', contentWidth / 2)
    .attr('y', -10)
    .style('font-size', '12px')
    .style('font-weight', 'bold')
    .text(`${selectedCountryName || 'Worldwide'} Earthquakes (1961-2024)`);
}

// Add to display update steps
addDisplayUpdateStep(() => {
  displayScatterPlot(appState.selectedCountry);
});
