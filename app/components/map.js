import appState from '../appState.js';
import {
  updateDisplay,
  addDisplayUpdateStep,
  addYearDisplayUpdateStep,
} from '../utils/updateDisplay.js';
import {
  convertIdToName,
  convertISO3ToId,
} from '../utils/convertCountryCode.js';

export default function displayMap() {
  const {
    countryShapeData,
    disasterData,
    hurricaneData,
    temperatureData,
    floodData,
  } = appState.data;
  const relevantCountries = new Set(
    disasterData.map((d) => convertISO3ToId(d['ISO']))
  );

  // get map svg container and its width and height
  const svg = d3.select('#map-svg');
  const { width, height } = svg.node().getBoundingClientRect();
  svg.attr('viewBox', `0 0 ${width} ${height}`);

  // create margins
  const margin = { top: 120, right: 0, bottom: 120, left: 0 };
  const contentWidth = width - margin.left - margin.right;
  const contentHeight = height - margin.top - margin.bottom;

  // convert TopoJSON to GeoJSON for countries
  const countries = topojson.feature(
    countryShapeData,
    countryShapeData.objects.countries
  );

  // filter out antarctica
  countries.features = countries.features.filter(
    (d) => d.id !== 'ATA' && d.properties.name !== 'Antarctica'
  );

  // define projection for the map
  const projection = d3
    .geoMercator()
    .fitSize([contentWidth, contentHeight], countries);

  // create a geoPath generator for country shapes
  const path = d3.geoPath().projection(projection);

  // find largest polygon for each country's path, used for labeling the country
  countries.features.forEach((d) => {
    const geom = d.geometry;
    // Find the largest polygon by area
    let maxArea = -Infinity;
    let largestPoly = null;

    if (geom.type === 'Polygon') {
      largestPoly = geom.coordinates;
    } else {
      geom.coordinates.forEach((poly) => {
        const polyArea = Math.abs(d3.polygonArea(poly[0]));
        if (polyArea > maxArea) {
          maxArea = polyArea;
          largestPoly = poly;
        }
      });
    }

    d.largestPolygon = {
      type: 'Polygon',
      coordinates: largestPoly,
    };

    d.centroid = path.centroid(d.largestPolygon);
  });

  const containerGroup = svg
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  // create zoom group
  const mapGroup = containerGroup.append('g');

  // title for the map
  svg
    .append('text')
    .attr('id', 'map-title')
    .attr('x', width / 2)
    .attr('y', margin.top / 2)
    .attr('text-anchor', 'middle')
    .style('font-size', '1.5rem')
    .text(
      `Natural Disasters - Year ${appState.selectedYear} ${
        convertIdToName(appState.selectedCountry) || ''
      }`
    );

  addYearDisplayUpdateStep(() => {
    d3.select('#map-title').text(
      `Natural Disasters - Year ${appState.selectedYear || ''} ${
        convertIdToName(appState.selectedCountry) || ''
      }`
    );
  });

  addDisplayUpdateStep(() => {
    d3.select('#map-title').text(
      `Natural Disasters - Year ${appState.selectedYear || ''} ${
        convertIdToName(appState.selectedCountry) || ''
      }`
    );
  });

  const countryTempData = Object.fromEntries(
    temperatureData.map((d) => {
      let latestTemp = 0.0;
      const yearEntries = Object.fromEntries(
        Object.entries(d)
          .filter(([key, _]) => !isNaN(key))
          .map(([key, val]) => {
            if (val !== '') {
              latestTemp = val;
            }
            return [key, val === '' ? latestTemp : val];
          })
      );

      return [convertISO3ToId(d['ISO3']), yearEntries];
    })
  );

  const temperatureColor = d3
    .scaleSequential()
    .domain(
      d3.extent(
        Object.values(countryTempData)
          .map((d) => Object.values(d))
          .flat()
      )
    )
    .interpolator(d3.interpolateYlOrRd);

  const countryGroups = mapGroup
    .selectAll('g.country')
    .data(countries.features, (d) => +d.id)
    .enter()
    .append('g')
    .attr('class', 'country')
    .style('cursor', 'pointer')
    .style('opacity', (d) => {
      if (appState.selectedCountry === null) return 1;
      return +d.id === appState.selectedCountry ? 1 : 0.3;
    })
    .on('click', (_, d) => {
      const clickedCountryId = +d.id;
      if (
        !relevantCountries.has(clickedCountryId) ||
        appState.selectedCountry === clickedCountryId
      ) {
        appState.selectedCountry = null;
      } else {
        appState.selectedCountry = clickedCountryId;
      }

      updateDisplay(); // Triggers full redraw
    });

  // draw countries on the map
  addDisplayUpdateStep(() => {
    countryGroups
      .selectAll('path')
      .attr('stroke', (d) =>
        +d.id === appState.selectedCountry ? 'yellow' : 'black'
      );

    countryGroups.style('opacity', (d) => {
      if (appState.selectedCountry === null) return 1;
      return +d.id === appState.selectedCountry ? 1 : 0.3;
    });
  });

  addYearDisplayUpdateStep(() => {
    countryGroups.selectAll('path').attr('fill', (d) => {
      if (!relevantCountries.has(+d.id)) {
        return '#eee';
      }
      const temp = countryTempData?.[+d.id]?.[appState.selectedYear];
      return temperatureColor(temp || 0.0);
    });
  });

  // Draw path within group
  countryGroups
    .append('path')
    .attr('d', path)
    .attr('fill', (d) => {
      if (!relevantCountries.has(+d.id)) {
        return '#eee';
      }
      const temp = countryTempData?.[+d.id]?.[appState.selectedYear];
      return temperatureColor(temp || 0.0);
    })
    .attr('stroke', (d) =>
      +d.id === appState.selectedCountry ? 'yellow' : 'black'
    )
    .attr('stroke-width', 0.5);

  // Draw label within group
  countryGroups
    .append('text')
    .attr('x', (d) => (isNaN(d.centroid[0]) ? 0 : d.centroid[0]))
    .attr('y', (d) => (isNaN(d.centroid[1]) ? 0 : d.centroid[1]))
    .text((d) => d.properties.name)
    .attr('fill', 'black')
    .attr('font-size', `12px`)
    .attr('text-anchor', 'middle')
    .attr('pointer-events', 'none')
    .style('opacity', (d) => {
      const screenArea = path.area(d.largestPolygon);
      return screenArea > 1500 ? 1 : 0;
    });

  const earthquakesWithCoords = disasterData.filter(
    (d) => d.Latitude && d.Longitude && d['Disaster Type'] === 'Earthquake'
  );

  mapGroup
    .selectAll('circle.earthquake')
    .data(
      earthquakesWithCoords.filter(
        (d) =>
          !appState.selectedYear || +d['Start Year'] === +appState.selectedYear
      )
    )
    .enter()
    .append('circle')
    .attr('class', 'earthquake')
    .attr('pointer-events', 'none')
    .attr('cx', (d) => projection([+d.Longitude, +d.Latitude])[0])
    .attr('cy', (d) => projection([+d.Longitude, +d.Latitude])[1])
    .attr('r', (d) => Math.pow(2, +d['Magnitude']) * 0.075)
    .attr('fill', '#d62728')
    .attr('opacity', 0.55)
    .attr('stroke', '#000')
    .attr('stroke-width', 0.2);

  mapGroup
    .selectAll('path.hurricane')
    .data(
      hurricaneData.filter(
        (d) => !appState.selectedYear || +d.year === +appState.selectedYear
      )
    )
    .enter()
    .append('path')
    .attr('class', 'hurricane')
    .attr('pointer-events', 'none')
    .attr('d', (d) => {
      const [cx, cy] = projection([d.lon, d.lat]);
      const size = d.wind * 0.1;
      return `M ${cx},${cy - size} 
              L ${cx - size * 0.866},${cy + size / 2}
              L ${cx + size * 0.866},${cy + size / 2}
              Z`;
    })
    .attr('fill', '#1f77b4')
    .attr('opacity', 0.55)
    .attr('stroke', '#000')
    .attr('stroke-width', 0.3);

  function getFloodSize(d) {
    const totalAffected = parseInt(d['Total Affected']) || 0;
    return Math.max(Math.min(Math.sqrt(totalAffected) * 0.005, 30), 5);
  }

  // add flood data
  mapGroup
    .selectAll('rect.flood')
    .data(
      floodData.filter(
        (d) =>
          !appState.selectedYear || +d['Start Year'] === +appState.selectedYear
      )
    )
    .enter()
    .append('rect')
    .attr('class', 'flood')
    .attr('pointer-events', 'none')
    .attr('x', (d) => {
      const [cx, _] = projection([+d.Longitude, +d.Latitude]);
      const size = getFloodSize(d);
      return cx - size / 2;
    })
    .attr('y', (d) => {
      const [_, cy] = projection([+d.Longitude, +d.Latitude]);
      const size = getFloodSize(d);
      return cy - size / 2;
    })
    .attr('width', (d) => getFloodSize(d))
    .attr('height', (d) => getFloodSize(d))
    .attr('fill', '#2ca02c')
    .attr('opacity', 0.55)
    .attr('stroke', '#000')
    .attr('stroke-width', 0.3);

  addYearDisplayUpdateStep(() => {
    const filteredEarthquakes = disasterData.filter(
      (d) =>
        (!appState.selectedYear ||
          +d['Start Year'] === +appState.selectedYear) &&
        d.Latitude &&
        d.Longitude &&
        d['Disaster Type'] === 'Earthquake'
    );

    const filteredHurricanes = appState.data.hurricaneData.filter(
      (d) => !appState.selectedYear || +d.year === +appState.selectedYear
    );

    const filteredFloods = appState.data.floodData.filter(
      (d) =>
        !appState.selectedYear || +d['Start Year'] === +appState.selectedYear
    );

    // Earthquakes
    const earthquakes = mapGroup
      .selectAll('circle.earthquake')
      .data(filteredEarthquakes, (d) => d.DisasterId || d.id);

    earthquakes.join(
      (enter) =>
        enter
          .append('circle')
          .attr('class', 'earthquake')
          .attr('pointer-events', 'none')
          .attr('cx', (d) => projection([+d.Longitude, +d.Latitude])[0])
          .attr('cy', (d) => projection([+d.Longitude, +d.Latitude])[1])
          .attr('r', (d) => Math.pow(2, +d['Magnitude']) * 0.075)
          .attr('fill', '#d62728')
          .attr('opacity', 0.55)
          .attr('stroke', '#000')
          .attr('stroke-width', 0.3),
      (update) =>
        update
          .attr('cx', (d) => projection([+d.Longitude, +d.Latitude])[0])
          .attr('cy', (d) => projection([+d.Longitude, +d.Latitude])[1]),
      (exit) => exit.remove()
    );

    // Hurricanes
    const hurricanes = mapGroup
      .selectAll('path.hurricane')
      .data(filteredHurricanes, (d) => d.id);

    hurricanes.join(
      (enter) =>
        enter
          .append('path')
          .attr('class', 'hurricane')
          .attr('pointer-events', 'none')
          .attr('d', (d) => {
            const [cx, cy] = projection([d.lon, d.lat]);
            const size = d.wind * 0.1;
            return `M ${cx},${cy - size} 
                    L ${cx - size * 0.866},${cy + size / 2}
                    L ${cx + size * 0.866},${cy + size / 2}
                    Z`;
          })
          .attr('fill', '#1f77b4')
          .attr('opacity', 0.55)
          .attr('stroke', '#000')
          .attr('stroke-width', 0.3),
      (update) =>
        update
          .attr('cx', (d) => projection([d.lon, d.lat])[0])
          .attr('cy', (d) => projection([d.lon, d.lat])[1]),
      (exit) => exit.remove()
    );

    // Floods
    const floods = mapGroup
      .selectAll('rect.flood')
      .data(filteredFloods, (d) => d.id);

    floods.join(
      (enter) =>
        enter
          .append('rect')
          .attr('class', 'flood')
          .attr('pointer-events', 'none')
          .attr('x', (d) => {
            const [cx, _] = projection([+d.Longitude, +d.Latitude]);
            const size = getFloodSize(d);
            return cx - size / 2;
          })
          .attr('y', (d) => {
            const [_, cy] = projection([+d.Longitude, +d.Latitude]);
            const size = getFloodSize(d);
            return cy - size / 2;
          })
          .attr('width', (d) => getFloodSize(d))
          .attr('height', (d) => getFloodSize(d))
          .attr('fill', '#2ca02c')
          .attr('opacity', 0.55)
          .attr('stroke', '#000')
          .attr('stroke-width', 0.3),
      (update) =>
        update
          .attr('cx', (d) => projection([+d.Longitude, +d.Latitude])[0])
          .attr('cy', (d) => projection([+d.Longitude, +d.Latitude])[1]),
      (exit) => exit.remove()
    );
  });

  // create the legend
  const legendHeight = 20;
  const legendWidth = contentWidth / 4;

  // Add disaster type legend to top left
  const disasterLegend = svg
    .append('g')
    .attr('class', 'disaster-legend')
    .attr('transform', `translate(40, ${margin.top / 2})`);

  // Add background rectangle first (so it's behind everything)
  disasterLegend
    .append('rect')
    .attr('x', -10)
    .attr('y', -30)
    .attr('width', 130)
    .attr('height', 110)
    .attr('fill', 'white')
    .attr('stroke', '#666')
    .attr('stroke-width', 1)
    .attr('rx', 5)
    .attr('ry', 5);

  // Legend items data
  const legendItems = [
    { type: 'Earthquake', color: '#d62728', shape: 'circle' },
    { type: 'Hurricane', color: '#1f77b4', shape: 'triangle' },
    { type: 'Flood', color: '#2ca02c', shape: 'square' },
  ];

  // Create legend items
  const legendItem = disasterLegend
    .selectAll('g')
    .data(legendItems)
    .enter()
    .append('g')
    .attr('transform', (d, i) => `translate(0, ${i * 25})`);

  // Add shapes
  legendItem.each(function (d) {
    const g = d3.select(this);
    if (d.shape === 'circle') {
      g.append('circle')
        .attr('cx', 10)
        .attr('cy', 10)
        .attr('r', 6)
        .attr('fill', d.color)
        .attr('opacity', 0.55)
        .attr('stroke', '#000')
        .attr('stroke-width', 0.3);
    } else if (d.shape === 'triangle') {
      g.append('path')
        .attr('d', `M 10,4 L 4,16 L 16,16 Z`)
        .attr('fill', d.color)
        .attr('opacity', 0.55)
        .attr('stroke', '#000')
        .attr('stroke-width', 0.3);
    } else if (d.shape === 'square') {
      g.append('rect')
        .attr('x', 4)
        .attr('y', 4)
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', d.color)
        .attr('opacity', 0.55)
        .attr('stroke', '#000')
        .attr('stroke-width', 0.3);
    }
  });

  // Add text labels
  legendItem
    .append('text')
    .attr('x', 25)
    .attr('y', 14)
    .text((d) => d.type)
    .style('font-size', '14px');

  // Add title
  disasterLegend
    .append('text')
    .attr('x', 0)
    .attr('y', -10)
    .text('Disaster Types')
    .style('font-size', '16px')
    .style('font-weight', 'bold');

  // Temperature legend (existing code)
  const legendScale = d3
    .scaleLinear()
    .domain(temperatureColor.domain())
    .range([0, legendWidth]);

  // add gradient for the legend
  const defs = svg.append('defs');

  const linearGradient = defs
    .append('linearGradient')
    .attr('id', 'legend-gradient')
    .attr('x1', '0%')
    .attr('y1', '100%')
    .attr('x2', '100%')
    .attr('y2', '100%');

  const [min, max] = legendScale.domain();
  const mid = (min + max) / 2;

  linearGradient
    .append('stop')
    .attr('offset', '0%')
    .attr('stop-color', temperatureColor(min));

  linearGradient
    .append('stop')
    .attr('offset', '50%')
    .attr('stop-color', temperatureColor(mid));

  linearGradient
    .append('stop')
    .attr('offset', '100%')
    .attr('stop-color', temperatureColor(max));

  // Add the legend rectangle with gradient fill
  svg
    .append('g')
    .attr(
      'transform',
      `translate(${width - legendWidth - 20}, ${margin.top / 2})`
    )
    .append('rect')
    .attr('width', legendWidth)
    .attr('height', legendHeight)
    .style('fill', 'url(#legend-gradient)');

  svg
    .append('g')
    .attr(
      'transform',
      `translate(${width - legendWidth - 20}, ${margin.top / 2 - 6})`
    )
    .append('text')
    .style('font-size', '0.75rem')
    .text('Temperature change since 1960');

  // Add the legend axis
  svg
    .append('g')
    .attr(
      'transform',
      `translate(${width - legendWidth - 20}, ${margin.top / 2 + legendHeight})`
    )
    .call(
      d3
        .axisBottom(legendScale)
        .ticks(5)
        .tickFormat((d) => `+${d3.format('.2s')(d)}°C`)
    );

  // create zoom behavior generator
  const zoom = d3
    .zoom()
    .scaleExtent([1, 14])
    .translateExtent([
      [0, 0],
      [width, height],
    ])
    .on('zoom', (event) => {
      mapGroup.attr('transform', event.transform);
      const zoomLevel = event.transform.k;
      // keep font-size the same as we zoom in. Also, once the country is large enough on the screen, display label.
      // the incremental label display is to prevent visual clutter
      mapGroup
        .selectAll('text')
        .data(countries.features, (d) => d.id)
        .attr('font-size', `${10 / zoomLevel}px`)
        .style('opacity', (d) => {
          const screenArea =
            path.area(d.largestPolygon) * zoomLevel * zoomLevel;
          return screenArea > 1500 ? 1 : 0;
        });
    });

  // add zoom
  svg.call(zoom);
}
