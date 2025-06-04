import appState from "./appState.js";
import loadExcelAsJSON from "./utils/loadExcelAsJSON.js";

import displayMap from "./components/map.js";
import displayBarChart from "./components/barchart.js";
import displayLineChart from "./components/linechart.js";
import displayScatterPlot from "./components/scatterplot.js";
import { initCountryCodeConversionMaps } from "./utils/convertCountryCode.js";
import filterUnusedDisasters from "./utils/filterUnusedDisasters.js";
import initYearSlider from "./components/yearSlider.js";
import { startTimelineAnimation } from "./components/timelineAnimation.js"; // Add this import

Promise.all([
    loadExcelAsJSON('./data/em-dat.xlsx'),
    d3.csv('./data/country-codes.csv'),
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
    d3.csv('./data/annual-mean-global-surface-temp.csv'),
    d3.json('./data/hurricanes_with_countries.json')
])
.then(startApp)

function startApp([
    disasterData, 
    countryCodeData, 
    countryShapeData,
    temperatureData,
    hurricaneData,
]) {
    document.getElementById("loading-screen").style.display = "none";

    const filteredDisasterData = filterUnusedDisasters(disasterData)

    appState.data.disasterData = filteredDisasterData;
    appState.data.countryCodeData = countryCodeData;
    appState.data.countryShapeData = countryShapeData;
    appState.data.temperatureData = temperatureData;
    appState.data.hurricaneData = hurricaneData.filter(d => d.year >= 1960);

    initCountryCodeConversionMaps();
    
    // Initialize animation properties
    appState.isInteractionEnabled = false;
    appState.animationComplete = false;
    
    // Hide right panel initially by adding CSS
    addInitialStyles();
    
    // Only display the map initially (no right panel charts yet)
    displayMap();
    
    // Hide the year slider initially since animation will control the year
    hideYearSlider();
    
    // Show start button instead of auto-starting
    createStartButton();
}

function addInitialStyles() {
    // Create and add CSS to hide right panel during animation
    const style = document.createElement('style');
    style.id = 'animation-initial-styles';
    style.textContent = `
        /* Hide right panel initially */
        .right-panel, .charts-container, .chart-container {
            display: none !important;
            transition: all 0.5s ease;
        }
        
        /* Hide year slider initially */
        .year-slider-container {
            display: none;
        }
        
        /* Make map container full width during animation */
        .map-container, #map-svg {
            width: 100% !important;
            transition: width 0.5s ease;
        }
        
        /* Styles for when interactive mode is enabled */
        body.interactive-mode .right-panel,
        body.interactive-mode .charts-container,
        body.interactive-mode .chart-container {
            display: block !important;
        }
        
        body.interactive-mode .year-slider-container {
            display: block;
        }
        
        body.interactive-mode .map-container,
        body.interactive-mode #map-svg {
            width: 70% !important; /* Adjust this to your normal layout */
        }
    `;
    document.head.appendChild(style);
}

function hideYearSlider() {
    // Hide the year slider during animation
    const yearSliderContainer = document.querySelector('.year-slider-container');
    if (yearSliderContainer) {
        yearSliderContainer.style.display = 'none';
    }
}

function showYearSlider() {
    // Show the year slider after animation
    const yearSliderContainer = document.querySelector('.year-slider-container');
    if (yearSliderContainer) {
        yearSliderContainer.style.display = 'block';
    } else {
        // Initialize year slider if it doesn't exist
        initYearSlider();
    }
}

// Function to enable interactive mode after animation completes
// This will be called from the timeline animation
export function enableInteractiveMode() {
    console.log('Enabling interactive mode...');
    
    // Add interactive mode class to body
    document.body.classList.add('interactive-mode');
    
    // Update app state
    appState.isInteractionEnabled = true;
    appState.animationComplete = true;
    appState.selectedYear = null; // Show all years initially
    
    // Initialize and show all the charts
    setTimeout(() => {
        displayLineChart();
        displayScatterPlot();
        displayBarChart();
        
        // Initialize year slider
        initYearSlider();
        showYearSlider();
        
        console.log('Interactive mode fully enabled!');
    }, 500); // Small delay to ensure smooth transition
}

// Make this function available globally so timeline animation can call it
window.enableInteractiveMode = enableInteractiveMode;

function createStartButton() {
    const startButton = document.createElement('button');
    startButton.id = 'start-timeline-btn';
    startButton.innerHTML = 'Start Animation';
    
    startButton.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 20px 40px;
        border-radius: 30px;
        font-size: 1.2em;
        font-weight: bold;
        cursor: pointer;
        z-index: 1000;
        box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
        min-width: 200px;
        text-align: center;
    `;
    
    // Add hover effects
    startButton.addEventListener('mouseenter', () => {
        startButton.style.transform = 'translate(-50%, -50%) scale(1.05)';
        startButton.style.boxShadow = '0 15px 35px rgba(0,0,0,0.4)';
    });
    
    startButton.addEventListener('mouseleave', () => {
        startButton.style.transform = 'translate(-50%, -50%) scale(1)';
        startButton.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
    });
    
    startButton.addEventListener('click', () => {
        startButton.style.transform = 'translate(-50%, -50%) scale(0.95)';
        setTimeout(() => {
            startButton.remove();
            startTimelineAnimation();
        }, 150);
    });
    
    document.body.appendChild(startButton);
}