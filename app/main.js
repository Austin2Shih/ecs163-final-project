import appState from './appState.js';
import loadExcelAsJSON from './utils/loadExcelAsJSON.js';

import displayMap from './components/map.js';
import displayBarChart from './components/barchart.js';
import displayLineChart from './components/linechart.js';
import {
  displayEarthquakeScatterPlot,
  displayFloodScatterPlot,
  displayHurricaneScatterPlot,
} from './components/scatterplot.js';
import { initCountryCodeConversionMaps } from './utils/convertCountryCode.js';
import filterUnusedDisasters from './utils/filterUnusedDisasters.js';
import initYearSlider from './components/yearSlider.js';
import { startYearAnimation } from './components/autoYearAnimation.js';

Promise.all([
  loadExcelAsJSON('./data/em-dat.xlsx'),
  d3.csv('./data/country-codes.csv'),
  d3.csv('./data/country-lat-long.csv'),
  d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'),
  d3.csv('./data/annual-mean-global-surface-temp.csv'),
  d3.json('./data/earthquakes_with_countries.json'),
  d3.json('./data/floods_with_countries.json'),
  d3.json('./data/hurricanes_with_countries.json'),
]).then(startApp);

function startApp([
  disasterData,
  countryCodeData,
  countryLatLongData,
  countryShapeData,
  temperatureData,
  earthquakeData,
  floodData,
  hurricaneData,
]) {
  document.getElementById('loading-screen').style.display = 'none';

  const filteredDisasterData = filterUnusedDisasters(disasterData);

  appState.data.disasterData = filteredDisasterData;
  appState.data.countryCodeData = countryCodeData;
  appState.data.countryShapeData = countryShapeData;
  appState.data.countryLatLongData = countryLatLongData;
  appState.data.temperatureData = temperatureData;
  appState.data.earthquakeData = earthquakeData;
  appState.data.floodData = floodData;
  appState.data.hurricaneData = hurricaneData.filter((d) => d.year >= 1960);

  initCountryCodeConversionMaps();

  initYearSlider();

  displayMap();
  displayLineChart();
  displayEarthquakeScatterPlot();
  displayHurricaneScatterPlot();
  displayFloodScatterPlot();
  displayBarChart();

  startYearAnimation();
}
