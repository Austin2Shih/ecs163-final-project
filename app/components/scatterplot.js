import appState from '../appState.js';
import {
  convertIdToName,
  convertNameToISO2,
  convertISO2ToISO3,
} from '../utils/convertCountryCode.js';
import { addDisplayUpdateStep } from '../utils/updateDisplay.js';

// scatterplot of natural disasters over time
function displayScatterPlot(selectedCountry, disasterType) {
  const svgId = `#${
    disasterType === 'Tropical cyclone'
      ? 'hurricane'
      : disasterType.toLowerCase()
  }-scatter-plot-svg`;

  let svg = d3.select(svgId);
  let g;

  // Create tooltip if it doesn't exist
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
      .style('border-radius', '4px')
      .style('padding', '10px')
      .style('pointer-events', 'none')
      .style('font-size', '12px')
      .style('max-width', '300px')
      .style('z-index', 1000)
      .style('display', 'none');
  }

  // Only create the SVG structure if it doesn't exist
  if (svg.select('g').empty()) {
    svg.selectAll('*').remove();

    const { width, height } = svg.node().getBoundingClientRect();
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const margin = { top: 30, right: 30, bottom: 50, left: 70 };
    const contentWidth = width - margin.left - margin.right;
    const contentHeight = height - margin.top - margin.bottom;

    // Create main group element
    g = svg
      .append('g')
      .attr('class', 'main-group')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const xScale = d3
      .scaleTime()
      .domain([new Date('1960-01-01'), new Date('2024-01-01')])
      .range([0, contentWidth]);

    // Add X axis
    g.append('g')
      .attr('transform', `translate(0,${contentHeight})`)
      .attr('class', 'x-axis')
      .call(d3.axisBottom(xScale).ticks(10).tickFormat(d3.timeFormat('%Y')));

    // Add Y axis (will be updated with data)
    g.append('g').attr('class', 'y-axis');

    // Add grid lines
    g.append('g')
      .attr('class', 'grid x-grid')
      .attr('transform', `translate(0,${contentHeight})`)
      .call(
        d3.axisBottom(xScale).ticks(10).tickSize(-contentHeight).tickFormat('')
      )
      .style('stroke-dasharray', '2,2')
      .style('stroke-opacity', 0.2);

    g.append('g')
      .attr('class', 'grid y-grid')
      .style('stroke-dasharray', '2,2')
      .style('stroke-opacity', 0.2);

    // Add axis labels
    g.append('text')
      .attr('class', 'x-label')
      .attr('text-anchor', 'middle')
      .attr('x', contentWidth / 2)
      .attr('y', contentHeight + 40)
      .style('font-size', '12px')
      .text('Year');

    g.append('text')
      .attr('class', 'y-label')
      .attr('transform', 'rotate(-90)')
      .attr('y', -55)
      .attr('x', -contentHeight / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px');

    // Add title
    g.append('text')
      .attr('class', 'title')
      .attr('text-anchor', 'middle')
      .attr('x', contentWidth / 2)
      .attr('y', -10)
      .style('font-size', '14px')
      .style('font-weight', 'bold');

    // Create a group for the dots
    g.append('g').attr('class', 'dots-group');
  } else {
    g = svg.select('.main-group');
  }

  const { width, height } = svg.node().getBoundingClientRect();
  const margin = { top: 30, right: 30, bottom: 50, left: 70 };
  const contentWidth = width - margin.left - margin.right;
  const contentHeight = height - margin.top - margin.bottom;

  // Get the data and process it
  const selectedCountryName = convertIdToName(selectedCountry);
  const selectedCountryISO2 = convertNameToISO2(selectedCountryName);
  const selectedCountryISO3 = convertISO2ToISO3(selectedCountryISO2);

  let disasterData = null;
  if (disasterType === 'Earthquake') {
    disasterData = appState.data.earthquakeData;
  } else if (disasterType === 'Flood') {
    disasterData = appState.data.floodData;
  } else if (disasterType === 'Tropical cyclone') {
    disasterData = appState.data.hurricaneData;
  }

  // Calculate scales using the full dataset before filtering
  const yScale = d3
    .scaleLinear()
    .domain([
      0,
      disasterType === 'Tropical cyclone'
        ? d3.max(disasterData, (d) => (d.wind || 0) * 1.3)
        : disasterType === 'Flood'
        ? d3.max(
            disasterData,
            (d) => parseFloat(d["Total Damage ('000 US$)"]) || 0
          ) * 1.1
        : d3.max(disasterData, (d) => (parseFloat(d['Magnitude']) || 0) * 1.3),
    ])
    .range([contentHeight, 0]);

  // Create radius scale based on full dataset
  const getRadiusScale = () => {
    if (disasterType === 'Tropical cyclone') {
      const maxWind = d3.max(disasterData, (d) => (d.wind || 0) * 0.868976);
      return d3.scaleLinear().domain([0, maxWind]).range([3, 15]);
    } else if (disasterType === 'Flood') {
      const maxDamage = d3.max(
        disasterData,
        (d) => parseFloat(d["Total Damage ('000 US$)"]) || 0
      );
      return d3.scaleSqrt().domain([0, maxDamage]).range([3, 20]);
    } else {
      const maxMagnitude = d3.max(
        disasterData,
        (d) => parseFloat(d['Magnitude']) || 0
      );
      return d3.scaleLinear().domain([0, maxMagnitude]).range([3, 20]);
    }
  };

  // Update radius scale
  const radiusScale = getRadiusScale();

  // Filter disaster data after scales are calculated
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

  // Sort data for top 50 after filtering
  const sortedData = [...disasterData].sort((a, b) => {
    if (disasterType === 'Tropical cyclone') {
      return (b.wind || 0) - (a.wind || 0);
    } else if (disasterType === 'Flood') {
      return (
        (parseFloat(b["Total Damage ('000 US$)"]) || 0) -
        (parseFloat(a["Total Damage ('000 US$)"]) || 0)
      );
    } else {
      return (
        (parseFloat(b['Magnitude']) || 0) - (parseFloat(a['Magnitude']) || 0)
      );
    }
  });

  const top20Disasters = new Set(
    sortedData
      .slice(0, 20)
      .map(
        (d) =>
          d.DisasterId ||
          d.id ||
          `${d['Start Year']}-${d.Longitude}-${d.Latitude}`
      )
  );

  // Update scales
  const xScale = d3
    .scaleTime()
    .domain([new Date('1960-01-01'), new Date('2024-01-01')])
    .range([0, contentWidth]);

  // Update Y axis
  const yAxis = d3
    .axisLeft(yScale)
    .ticks(8)
    .tickFormat((d) => {
      if (disasterType === 'Flood') {
        const inBillions = d / 1000000;
        return inBillions === 0 ? '$0' : `$${d3.format(',.1f')(inBillions)}B`;
      } else if (disasterType === 'Tropical cyclone') {
        return `${d3.format(',.0f')(d)} kts`;
      }
      return d3.format('.1f')(d);
    });

  svg
    .select('.y-axis')
    .call(yAxis)
    .selectAll('text')
    .style('text-anchor', 'end')
    .attr('dx', '-0.8em')
    .attr('dy', '0.3em');

  // Update y-grid
  svg
    .select('.y-grid')
    .call(d3.axisLeft(yScale).ticks(8).tickSize(-contentWidth).tickFormat(''));

  // Update dots
  const dots = svg
    .select('.dots-group')
    .selectAll('circle')
    .data(
      disasterData,
      (d) =>
        d.DisasterId ||
        d.id ||
        `${d['Start Year']}-${d.Longitude}-${d.Latitude}`
    );

  // Remove old dots
  dots.exit().remove();

  // Add new dots
  const dotsEnter = dots
    .enter()
    .append('circle')
    .style('opacity', 0.6)
    .style('fill', () => {
      switch (disasterType) {
        case 'Earthquake':
          return '#d62728';
        case 'Flood':
          return '#2ca02c';
        case 'Tropical cyclone':
          return '#1f77b4';
        default:
          return '#d62728';
      }
    })
    .style('stroke', '#000')
    .style('stroke-width', 0.5);

  // Update all dots
  dots
    .merge(dotsEnter)
    .attr('cx', (d) => {
      const date =
        disasterType === 'Tropical cyclone'
          ? new Date(d.year, 0, 1)
          : new Date(
              d['Start Year'],
              (d['Start Month'] || 1) - 1,
              d['Start Day'] || 1
            );
      return xScale(date);
    })
    .attr('cy', (d) => {
      if (disasterType === 'Tropical cyclone') {
        return yScale((d.wind || 0) * 0.868976);
      } else if (disasterType === 'Flood') {
        return yScale(parseFloat(d["Total Damage ('000 US$)"]) || 0);
      }
      return yScale(parseFloat(d['Magnitude']) || 0);
    })
    .attr('r', (d) => {
      if (disasterType === 'Tropical cyclone') {
        const windInKnots = (d.wind || 0) * 0.868976;
        return radiusScale(windInKnots);
      } else if (disasterType === 'Flood') {
        const damage = parseFloat(d["Total Damage ('000 US$)"]) || 0;
        return radiusScale(damage);
      } else {
        const magnitude = parseFloat(d['Magnitude']) || 0;
        return radiusScale(magnitude);
      }
    })
    .style('opacity', (d) => {
      if (!selectedCountry) return 0.6;
      const isInCountry =
        d.ISO === selectedCountryISO3 ||
        d['affectedCountries'].includes(selectedCountry);
      return isInCountry ? 0.6 : 0.1;
    });

  // Add event listeners
  svg
    .select('.dots-group')
    .selectAll('circle')
    .on('mouseover', function (event, d) {
      const eventId =
        d.DisasterId ||
        d.id ||
        `${d['Start Year']}-${d.Longitude}-${d.Latitude}`;
      if (!top20Disasters.has(eventId)) return;

      const isInCountry =
        !selectedCountry ||
        d.ISO === selectedCountryISO3 ||
        d['affectedCountries'].includes(selectedCountry);
      d3.select(this)
        .style('opacity', isInCountry ? 1 : 0.3)
        .style('stroke-width', 2);

      tooltip.style('display', 'block').style('opacity', 1);

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
          const valueInThousands =
            parseFloat(d["Total Damage ('000 US$)"]) || 0;
          const valueInBillions = valueInThousands / 1000000;
          return valueInBillions === 0
            ? '$0'
            : `$${d3.format(',.1f')(valueInBillions)}B USD`;
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
            ? `<strong>Wind Speed:</strong> ${(d.wind * 0.868976).toFixed(
                0
              )} knots<br/>`
            : disasterType === 'Flood'
            ? `<strong>Total Damage:</strong> ${formatNumber({
                toString: () => 'Total Damage',
                "Total Damage ('000 US$)": d["Total Damage ('000 US$)"],
              })}<br/>`
            : `<strong>Magnitude:</strong> ${parseFloat(d['Magnitude']).toFixed(
                1
              )}<br/>`
        }
        <strong>Total Deaths:</strong> ${formatNumber(d['Total Deaths'])}<br/>
        <strong>Total Affected:</strong> ${formatNumber(
          d['Total Affected']
        )}<br/>
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
    .on('mouseout', function (event, d) {
      const eventId =
        d.DisasterId ||
        d.id ||
        `${d['Start Year']}-${d.Longitude}-${d.Latitude}`;
      if (!top20Disasters.has(eventId)) return;

      const isInCountry =
        !selectedCountry ||
        d.ISO === selectedCountryISO3 ||
        d['affectedCountries'].includes(selectedCountry);
      d3.select(this)
        .style('opacity', isInCountry ? 0.6 : 0.1)
        .style('stroke-width', 0.5);
      tooltip.style('display', 'none').style('opacity', 0);
    });

  // Update labels
  svg
    .select('.y-label')
    .text(
      disasterType === 'Tropical cyclone'
        ? 'Wind Speed (knots)'
        : disasterType === 'Flood'
        ? 'Total Damage (USD Billions)'
        : 'Magnitude'
    );

  svg
    .select('.title')
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
