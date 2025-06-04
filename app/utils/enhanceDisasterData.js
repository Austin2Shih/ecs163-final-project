import { convertISO3ToISO2 } from './convertCountryCode.js';

export default function findAffectedCountriesForDisasters(
  disasterData,
  countryShapeData,
  countryLatLongData,
  thresholdKm = 200
) {
  console.time('Disaster Affected Country Matching');
  const svg = d3.select('#map-svg');
  const { width, height } = svg.node().getBoundingClientRect();
  svg.attr('viewBox', `0 0 ${width} ${height}`);

  // create margins
  const margin = { top: 70, right: 0, bottom: 50, left: 0 };
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

  console.log(countries);
  // Filter for earthquakes and floods
  const validDisasters = disasterData
    .filter(
      (disaster) =>
        (disaster['Disaster Type'] === 'Earthquake' ||
          disaster['Disaster Type'] === 'Flood') &&
        disaster['Start Year'] >= 1960
    )
    .map((disaster) => {
      // Get country coordinates from country-lat-long.csv
      const countryISO2 = convertISO3ToISO2(disaster['ISO']);
      const country = countryLatLongData.find((d) => d.country === countryISO2);

      let lat = '';
      let lon = '';

      if (country) {
        lat = country['latitude'];
        lon = country['longitude'];
      } else {
        lat = disaster['Latitude'] || '';
        lon = disaster['Longitude'] || '';
      }

      console.log(lat, lon);
      // exclude countries we cannot find coordinates for
      if (lat === '' || lon === '') {
        return null;
      }

      return {
        ...disaster,
        Latitude: lat,
        Longitude: lon,
      };
    })
    .filter((d) => d !== null); // Remove any disasters where we couldn't find country coordinates

  const processedDisasters = validDisasters.map((disaster) => {
    const disasterPoint = turf.point([
      +disaster['Latitude'],
      +disaster['Longitude'],
    ]);
    const disasterImpactZone = turf.buffer(disasterPoint, thresholdKm, {
      units: 'kilometers',
    });

    return {
      ...disaster,
      affectedCountries: countries.features
        .filter((country) => {
          const countryPolygon = country.geometry;
          return turf.booleanIntersects(disasterImpactZone, countryPolygon);
        })
        .map((country) => +country.id),
    };
  });

  console.timeEnd('Disaster Affected Country Matching');

  // // Split into separate files for earthquakes and floods
  // const earthquakes = processedDisasters.filter(
  //   (d) => d['Disaster Type'] === 'Earthquake'
  // );
  // const floods = processedDisasters.filter(
  //   (d) => d['Disaster Type'] === 'Flood'
  // );

  // Save earthquake data
  // const earthquakeStr = JSON.stringify(earthquakes);
  // console.log(earthquakeStr);
  // const earthquakeBlob = new Blob([earthquakeStr], {
  //   type: 'application/json',
  // });
  // const earthquakeUrl = URL.createObjectURL(earthquakeBlob);
  // const earthquakeLink = document.createElement('a');
  // earthquakeLink.href = earthquakeUrl;
  // earthquakeLink.download = 'earthquakes_with_countries.json';
  // earthquakeLink.click();
  // URL.revokeObjectURL(earthquakeUrl);

  // // Save flood data
  // const floodStr = JSON.stringify(floods);
  // console.log(floodStr);
  // const floodBlob = new Blob([floodStr], { type: 'application/json' });
  // const floodUrl = URL.createObjectURL(floodBlob);
  // const floodLink = document.createElement('a');
  // floodLink.href = floodUrl;
  // floodLink.download = 'floods_with_countries.json';
  // floodLink.click();
  // URL.revokeObjectURL(floodUrl);
}
