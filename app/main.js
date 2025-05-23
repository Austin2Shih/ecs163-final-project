import appState from "./appState.js";
import loadExcelAsJSON from "./utils/loadExcelAsJSON.js";

import displayMap from "./components/map.js";
import displayBarChart from "./components/barchart.js";
import displayLineChart from "./components/linechart.js";
import displayScatterPlot from "./components/scatterplot.js";
import { initCountryCodeConversionMaps } from "./utils/convertCountryCode.js";
import filterUnusedDisasters from "./utils/filterUnusedDisasters.js";

Promise.all([
    loadExcelAsJSON('./data/em-dat.xlsx'),
    d3.csv('./data/country-codes.csv'),
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
])
.then(startApp)

function startApp([
    disasterData, 
    countryCodeData, 
    countryShapeData
]
) {
    document.getElementById("loading-screen").style.display = "none";

    const filteredDisasterData = filterUnusedDisasters(disasterData)

    appState.data.disasterData = filteredDisasterData;
    appState.data.countryCodeData = countryCodeData;
    appState.data.countryShapeData = countryShapeData;
    initCountryCodeConversionMaps()

    displayMap();
    displayLineChart();
    displayScatterPlot();
    displayBarChart();
}

