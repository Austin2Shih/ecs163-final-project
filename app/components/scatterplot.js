import appState from '../appState.js';
import {
  convertIdToName,
  convertNameToISO2,
  convertISO2ToISO3,
} from '../utils/convertCountryCode.js';
import { addDisplayUpdateStep } from '../utils/updateDisplay.js';

function aggregateDataByCountry(disasterData, disasterType) {
  // First, expand hurricane data by affected countries
  let processedData;
  if (disasterType === 'Tropical cyclone') {
    processedData = [];
    disasterData.forEach((d) => {
      if (d.affectedCountries && Array.isArray(d.affectedCountries)) {
        // Create a copy of the data for each affected country
        d.affectedCountries.forEach((country) => {
          processedData.push({
            ...d,
            ISO: country, // Use the affected country as the primary country
            year: d.year,
          });
        });
      } else {
        // If no affected countries listed, use the primary country
        processedData.push({
          ...d,
          year: d.year,
        });
      }
    });
  } else {
    // For other disaster types, just normalize the year field and ensure ISO code is used
    processedData = disasterData.map((d) => ({
      ...d,
      year: d['Start Year'],
      // Ensure we're using the correct ISO code
      ISO: d.ISO || d['Country'],
    }));
  }

  // Filter for valid years first
  const validData = processedData.filter(
    (d) => d.year >= 1960 && d.year <= 2024
  );

  // Create all possible country-year combinations
  const uniqueCountries = new Set(validData.map((d) => d.ISO));
  const years = d3.range(1960, 2025);
  const allCombinations = [];

  uniqueCountries.forEach((country) => {
    years.forEach((year) => {
      allCombinations.push([country, year]);
    });
  });

  // Aggregate data by country and year
  const aggregatedData = d3.rollup(
    validData,
    (group) => {
      const values = group
        .map((d) => {
          if (disasterType === 'Tropical cyclone') {
            return (d.wind || 0) * 0.868976; // Convert to knots
          } else if (disasterType === 'Flood') {
            return parseFloat(d["Total Damage ('000 US$)"]) || 0;
          } else {
            return parseFloat(d['Magnitude']) || 0;
          }
        })
        .filter((v) => v > 0); // Filter out zero values

      return {
        mean: values.length > 0 ? d3.mean(values) : 0,
        count: values.length,
        // Store the first event's metadata for country info
        countryInfo: group[0] || null,
      };
    },
    (d) => d.ISO, // Always use ISO code for grouping
    (d) => d.year
  );

  // Convert nested Map to array format and fill in missing years
  const result = [];
  allCombinations.forEach(([country, year]) => {
    const countryData = aggregatedData.get(country);
    const yearData = countryData ? countryData.get(year) : null;

    // If we have data for this country-year combination, use it
    // Otherwise, create an empty entry
    if (yearData) {
      result.push([country, year, yearData]);
    } else {
      // Find any data for this country to get country info
      let countryInfo = null;
      if (countryData) {
        for (const [_, data] of countryData) {
          if (data.countryInfo) {
            countryInfo = data.countryInfo;
            break;
          }
        }
      }

      result.push([
        country,
        year,
        {
          mean: 0,
          count: 0,
          countryInfo: countryInfo,
        },
      ]);
    }
  });

  return result;
}

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

  // Aggregate the data first
  let aggregatedData = aggregateDataByCountry(disasterData, disasterType);

  // Filter out points with mean 0
  aggregatedData = aggregatedData.filter((d) => d[2].mean > 0);

  // Filter for selected country
  if (selectedCountry) {
    aggregatedData = aggregatedData.filter((d) => {
      // For all disaster types, only use ISO codes for comparison
      // Since we've normalized the data in aggregateDataByCountry
      return d[0] === selectedCountryISO3;
    });
  }

  // Calculate scales using the filtered dataset
  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(aggregatedData, (d) => d[2].mean) * 1.3])
    .range([contentHeight, 0]);

  // Create radius scale based on aggregated dataset
  const getRadiusScale = () => {
    const maxCount = d3.max(aggregatedData, (d) => d[2].count);
    return d3.scaleSqrt().domain([0, maxCount]).range([3, 15]);
  };

  // Update radius scale
  const radiusScale = getRadiusScale();

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
    .data(aggregatedData, (d) => `${d[0]}-${d[1]}`); // Use country-year as key

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
    .attr('cx', (d) => xScale(new Date(d[1], 0, 1)))
    .attr('cy', (d) => yScale(d[2].mean))
    .attr('r', (d) => radiusScale(d[2].count))
    .style('opacity', 0.6); // Since we've already filtered, all visible dots should have the same opacity

  // Update tooltip content
  svg
    .select('.dots-group')
    .selectAll('circle')
    .on('mouseover', function (event, d) {
      d3.select(this).style('opacity', 1).style('stroke-width', 2);

      tooltip.style('display', 'block').style('opacity', 1);

      const countryInfo = d[2].countryInfo;
      const formatNumber = (num) => {
        if (!num) return 'Unknown';
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      };

      const formatValue = (value) => {
        if (disasterType === 'Flood') {
          const valueInBillions = value / 1000000;
          return valueInBillions === 0
            ? '$0'
            : `$${d3.format(',.1f')(valueInBillions)}B USD`;
        } else if (disasterType === 'Tropical cyclone') {
          return `${d3.format(',.0f')(value)} kts`;
        }
        return d3.format('.1f')(value);
      };

      const content = `
        <strong>${
          countryInfo['Location'] ||
          countryInfo['Country'] ||
          'Location Unknown'
        }</strong><br/>
        <strong>Year:</strong> ${d[1]}<br/>
        <strong>Average ${
          disasterType === 'Tropical cyclone'
            ? 'Wind Speed'
            : disasterType === 'Flood'
            ? 'Damage'
            : 'Magnitude'
        }:</strong> ${formatValue(d[2].mean)}<br/>
        <strong>Number of Events:</strong> ${formatNumber(d[2].count)}<br/>
        ${
          countryInfo['Disaster Subtype']
            ? `<strong>Subtype:</strong> ${countryInfo['Disaster Subtype']}<br/>`
            : ''
        }
      `;

      tooltip.html(content);

      // Calculate tooltip position
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
      // Remove highlight and tooltip
      d3.select(this).style('opacity', 0.6).style('stroke-width', 0.5);

      tooltip.style('display', 'none').style('opacity', 0);
    });

  // Add mouseleave event to the SVG container to ensure tooltip is hidden
  svg.on('mouseleave', function () {
    tooltip.style('display', 'none').style('opacity', 0);
  });

  // Update labels
  svg
    .select('.y-label')
    .text(
      disasterType === 'Tropical cyclone'
        ? 'Average Wind Speed per Year (knots)'
        : disasterType === 'Flood'
        ? 'Average Total Damage per Year (USD Billions)'
        : 'Average Magnitude per Year'
    );

  svg
    .select('.title')
    .text(
      `${
        disasterType === 'Tropical cyclone' ? 'Hurricane' : disasterType
      } Events ${
        selectedCountryName ? `in ${selectedCountryName}` : 'Worldwide'
      } (Yearly Averages)`
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
