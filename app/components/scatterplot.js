import appState from '../appState.js';
import {
  convertIdToName,
  convertNameToISO2,
  convertISO2ToISO3,
} from '../utils/convertCountryCode.js';
import { addDisplayUpdateStep } from '../utils/updateDisplay.js';

// scatterplot of natural disasters over time
function displayScatterPlot(selectedCountry, disasterType) {
  // Clear any existing SVG contents
  d3.select(
    `#${
      disasterType === 'Tropical cyclone'
        ? 'hurricane'
        : disasterType.toLowerCase()
    }-scatter-plot-svg`
  )
    .selectAll('*')
    .remove();

  // Get the container dimensions
  const svg = d3.select(
    `#${
      disasterType === 'Tropical cyclone'
        ? 'hurricane'
        : disasterType.toLowerCase()
    }-scatter-plot-svg`
  );
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

  // get disaster data based on disaster type
  let disasterData = null;

  if (disasterType === 'Earthquake') {
    disasterData = appState.data.earthquakeData;
  } else if (disasterType === 'Flood') {
    disasterData = appState.data.floodData;
  } else if (disasterType === 'Tropical cyclone') {
    disasterData = appState.data.hurricaneData;
  }

  console.log(disasterData);

  // Filter disaster data
  disasterData = disasterData.filter((d) => {
    if (!d) return false;
    const startYear = d['Start Year'] ? Number(d['Start Year']) : d['year'];
    const isInTimeRange = 1960 <= startYear && startYear <= 2024;
    const matchesCountry =
      !selectedCountry ||
      d.ISO === selectedCountryISO3 ||
      d['affectedCountries'].includes(selectedCountry);
    return (
      isInTimeRange &&
      matchesCountry &&
      (d['Magnitude'] !== null || d['wind'] !== null)
    );
  });

  // Create scales based on disaster type
  const xScale = d3
    .scaleTime()
    .domain([new Date('1960-01-01'), new Date('2024-01-01')])
    .range([0, contentWidth]);

  const yScale = d3
    .scaleLinear()
    .domain([
      0,
      disasterType === 'Tropical cyclone'
        ? d3.max(disasterData, (d) => d.wind || 0) * 1.1
        : disasterType === 'Flood'
        ? d3.max(
            disasterData,
            (d) => parseFloat(d["Total Damage ('000 US$)"]) || 0
          ) * 1.1
        : d3.max(disasterData, (d) => parseFloat(d['Magnitude']) || 0) * 1.1,
    ]) // Add 10% padding
    .range([contentHeight, 0]);

  // Create axes
  const xAxis = d3.axisBottom(xScale).ticks(10).tickFormat(d3.timeFormat('%Y'));
  const yAxis = d3
    .axisLeft(yScale)
    .ticks(8)
    .tickFormat((d) => {
      if (disasterType === 'Flood') {
        // Convert to hundreds of millions (divide by 100000 since d is already in thousands)
        const inHundredsOfMillions = d / 100000;
        return inHundredsOfMillions === 0
          ? '0'
          : d3.format(',.0f')(inHundredsOfMillions) + '00';
      }
      return d;
    });

  // Add X axis
  g.append('g')
    .attr('transform', `translate(0,${contentHeight})`)
    .call(xAxis)
    .attr('class', 'x-axis');

  // Add Y axis
  g.append('g')
    .call(yAxis)
    .attr('class', 'y-axis')
    .selectAll('text') // Select all tick labels
    .style('text-anchor', 'end') // Align text to the end
    .attr('dx', '-0.8em') // Increased left shift
    .attr('dy', '0.3em'); // Adjust vertical alignment

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
    .data(disasterData)
    .enter()
    .append('circle')
    .attr('cx', (d) => {
      let date;
      if (disasterType === 'Tropical cyclone') {
        // For hurricanes, use the year field
        date = new Date(d.year, 0, 1); // January 1st of the hurricane year
      } else {
        // For other disasters, use the existing date format
        date = new Date(
          d['Start Year'],
          (d['Start Month'] || 1) - 1,
          d['Start Day'] || 1
        );
      }
      return xScale(date);
    })
    .attr('cy', (d) => {
      if (disasterType === 'Tropical cyclone') {
        return yScale(d.wind || 0);
      } else if (disasterType === 'Flood') {
        return yScale(parseFloat(d["Total Damage ('000 US$)"]) || 0);
      }
      return yScale(parseFloat(d['Magnitude']) || 0);
    })
    .attr('r', (d) => {
      // Scale radius based on total affected population and damage
      if (disasterType === 'Flood') {
        const totalAffected = parseInt(d['Total Affected']) || 0;
        const totalDamage = parseFloat(d["Total Damage ('000 US$)"]) || 0;
        // Combine both metrics for a more dynamic radius
        return Math.max(
          3,
          Math.min(
            12,
            Math.sqrt(totalAffected) * 0.005 + Math.sqrt(totalDamage) * 0.02
          )
        );
      }
      const totalAffected = parseInt(d['Total Affected']) || 0;
      return Math.max(3, Math.min(12, Math.sqrt(totalAffected) * 0.01));
    })
    .style('fill', () => {
      // Match the map's color scheme
      switch (disasterType) {
        case 'Earthquake':
          return '#d62728'; // red
        case 'Flood':
          return '#2ca02c'; // green
        case 'Tropical cyclone':
          return '#1f77b4'; // blue
        default:
          return '#d62728';
      }
    })
    .style('opacity', 0.6)
    .style('stroke', '#000')
    .style('stroke-width', 0.5)
    .on('mouseover', function (event, d) {
      d3.select(this).style('opacity', 1).style('stroke-width', 2);

      tooltip.transition().duration(200).style('opacity', 0.9);

      let date;
      if (disasterType === 'Tropical cyclone') {
        date = new Date(d.year, 0, 1);
      } else {
        date = new Date(
          d['Start Year'],
          (d['Start Month'] || 1) - 1,
          d['Start Day'] || 1
        );
      }

      const formatNumber = (num) => {
        if (!num) return 'Unknown';
        if (
          disasterType === 'Flood' &&
          num.toString().includes('Total Damage')
        ) {
          // Convert to hundreds of millions for damage values
          const valueInThousands =
            parseFloat(d["Total Damage ('000 US$)"]) || 0;
          const valueInHundredsOfMillions = valueInThousands / 100000;
          return valueInHundredsOfMillions === 0
            ? '$0'
            : `$${d3.format(',.0f')(valueInHundredsOfMillions)}00 million USD`;
        }
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      };

      const content = `
        <strong>${
          d['Location'] || d['Country'] || 'Location Unknown'
        }</strong><br/>
        <strong>Date:</strong> ${
          disasterType === 'Tropical cyclone'
            ? d.year
            : date.toLocaleDateString()
        }<br/>
        ${
          disasterType === 'Tropical cyclone'
            ? `<strong>Wind Speed:</strong> ${d.wind} mph<br/>`
            : disasterType === 'Flood'
            ? ''
            : `<strong>Magnitude:</strong> ${parseFloat(d['Magnitude']).toFixed(
                1
              )}<br/>`
        }
        <strong>Total Deaths:</strong> ${formatNumber(d['Total Deaths'])}<br/>
        <strong>Total Affected:</strong> ${formatNumber(
          d['Total Affected']
        )}<br/>
        <strong>Total Damage:</strong> ${formatNumber({
          toString: () => 'Total Damage',
          "Total Damage ('000 US$)": d["Total Damage ('000 US$)"],
        })}<br/>
        ${
          d['Disaster Subtype']
            ? `<strong>Subtype:</strong> ${d['Disaster Subtype']}<br/>`
            : ''
        }
      `;

      tooltip.html(content);

      // Calculate tooltip position to prevent going off-screen
      const tooltipNode = tooltip.node();
      const tooltipRect = tooltipNode.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let left = event.pageX + 10;
      let top = event.pageY - 28;

      if (left + tooltipRect.width > viewportWidth - 10) {
        left = event.pageX - tooltipRect.width - 10;
      }
      if (top + tooltipRect.height > viewportHeight - 10) {
        top = event.pageY - tooltipRect.height - 10;
      }

      left = Math.max(10, left);
      top = Math.max(10, top);

      tooltip.style('left', left + 'px').style('top', top + 'px');
    })
    .on('mouseout', function () {
      d3.select(this).style('opacity', 0.6).style('stroke-width', 0.5);
      tooltip.transition().duration(500).style('opacity', 0);
    });

  // Add axis labels
  g.append('text')
    .attr('class', 'x-label')
    .attr('text-anchor', 'middle')
    .attr('x', contentWidth / 2)
    .attr('y', contentHeight + 40)
    .style('font-size', '12px')
    .text('Year');

  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', -55)
    .attr('x', -contentHeight / 2)
    .attr('text-anchor', 'middle')
    .style('font-size', '12px')
    .text(
      disasterType === 'Tropical cyclone'
        ? 'Wind Speed (mph)'
        : disasterType === 'Flood'
        ? 'Total Damage (Hundreds of Millions USD)'
        : 'Magnitude'
    );

  // Add title
  g.append('text')
    .attr('class', 'title')
    .attr('text-anchor', 'middle')
    .attr('x', contentWidth / 2)
    .attr('y', -10)
    .style('font-size', '14px')
    .style('font-weight', 'bold')
    .text(
      `${
        disasterType === 'Tropical cyclone' ? 'Hurricane' : disasterType
      } Events ${
        selectedCountryName ? `in ${selectedCountryName}` : 'Worldwide'
      }`
    );
}

// Export functions for each disaster type
export function displayEarthquakeScatterPlot(selectedCountry) {
  displayScatterPlot(selectedCountry, 'Earthquake');
}

export function displayFloodScatterPlot(selectedCountry) {
  displayScatterPlot(selectedCountry, 'Flood');
}

export function displayHurricaneScatterPlot(selectedCountry) {
  displayScatterPlot(selectedCountry, 'Tropical cyclone');
}

// Add to display update steps
addDisplayUpdateStep(() => {
  displayEarthquakeScatterPlot(appState.selectedCountry);
  displayFloodScatterPlot(appState.selectedCountry);
  displayHurricaneScatterPlot(appState.selectedCountry);
});
