import appState from '../appState.js';
import { updateYearDisplay } from '../utils/updateDisplay.js';

export function startAutoYearAnimation() {
    console.log('Starting automatic year animation...');
    
    //hide ui elements during animaiton
    hideSliderAndCharts();
    
    showAnimationIndicator();
    
    appState.isAnimating = true;
    appState.selectedYear = 1960;
    
    // start animation loop
    animateYears();
}

function hideSliderAndCharts() {
    //hiding year slider and charts during animation
    const yearSlider = document.querySelector('.year-slider-container');
    if (yearSlider) {
        yearSlider.style.opacity = '0.3';
        yearSlider.style.pointerEvents = 'none';
    }
    
    //hide charts during animation for less distraction
    const charts = document.querySelectorAll('.line-chart-container, .bar-chart-container, .right-container');
    charts.forEach(chart => {
        chart.style.opacity = '0';
    });
}

function showSliderAndCharts() {
    //year slider after information
    const yearSlider = document.querySelector('.year-slider-container');
    if (yearSlider) {
        yearSlider.style.opacity = '1';
        yearSlider.style.pointerEvents = 'auto';
    }
    
    //show charts again after animation
    const charts = document.querySelectorAll('.line-chart-container, .bar-chart-container, .right-container');
    charts.forEach(chart => {
        chart.style.opacity = '1';
    });
}

function showAnimationIndicator() {
    // Create a simple year display overlay
    const indicator = document.createElement('div');
    indicator.id = 'year-animation-indicator';
    indicator.innerHTML = `
        <div class="year-display">
            <div class="current-year" id="current-year-display">1960</div>
            <div class="animation-status">Auto-playing timeline...</div>
            <button id="skip-animation-btn">Skip Animation</button>
        </div>
    `;
    
    indicator.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px;
        border-radius: 10px;
        z-index: 1000;
        font-family: Arial, sans-serif;
        text-align: center;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    `;
    
    // Add styles for the year display
    const style = document.createElement('style');
    style.textContent = `
        #year-animation-indicator .current-year {
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 10px;
            color: #4CAF50;
        }
        
        #year-animation-indicator .animation-status {
            font-size: 0.9em;
            margin-bottom: 15px;
            opacity: 0.8;
        }
        
        #year-animation-indicator button {
            background: #ff4757;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 0.9em;
        }
        
        #year-animation-indicator button:hover {
            background: #ff3742;
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(indicator);
    
    // Add skip button functionality
    document.getElementById('skip-animation-btn').addEventListener('click', () => {
        skipAnimation();
    });
}

function hideAnimationIndicator() {
    const indicator = document.getElementById('year-animation-indicator');
    if (indicator) {
        indicator.remove();
    }
}

function animateYears() {
    if (!appState.isAnimating) return;
    
    const currentYear = appState.selectedYear;
    const endYear = 2024;
    
    // Update the year display indicator
    const yearDisplay = document.getElementById('current-year-display');
    if (yearDisplay) {
        yearDisplay.textContent = currentYear;
    }
    
    // This will trigger your existing slider logic to update the map
    updateYearDisplay();
    
    // Also update the actual slider position to stay in sync
    const slider = document.querySelector('#year-slider, input[type="range"]');
    if (slider) {
        slider.value = currentYear;
    }
    
    // Continue animation
    if (currentYear < endYear) {
        appState.selectedYear++;
        setTimeout(() => animateYears(), appState.animationSpeed || 300); // 300ms between years
    } else {
        // Animation complete
        completeAnimation();
    }
}

function completeAnimation() {
    appState.isAnimating = false;
    
    // Hide animation indicator
    hideAnimationIndicator();
    
    // Show slider and charts fully
    showSliderAndCharts();
    
    // Reset to show all years (or keep on last year - your choice)
    // appState.selectedYear = null; // Uncomment to show all years after animation
    
    console.log('Year animation completed!');
}

function skipAnimation() {
    appState.isAnimating = false;
    appState.selectedYear = 2024; // Jump to end
    completeAnimation();
    updateYearDisplay(); // Update one final time
}

// Auto-start function to call from main.js
export function autoStartYearAnimation() {
    // Wait a bit for everything to load, then start animation
    setTimeout(() => {
        startAutoYearAnimation();
    }, 2000); // 2 second delay after page loads
}

const disasterAnnotations = {
    1960: "Beginning our journey through decades of natural disasters...",
    1964: "The <span class='annotation-highlight'>Great Alaska Earthquake</span> (magnitude 9.2) - the most powerful earthquake recorded in North American history.",
    1970: "The <span class='annotation-highlight'>Bhola Cyclone</span> in Bangladesh killed an estimated 500,000 people - one of the deadliest natural disasters ever.",
    1976: "The <span class='annotation-highlight'>Tangshan Earthquake</span> in China (magnitude 7.5) devastated the industrial city, killing over 240,000 people.",
    1980: "Mount St. Helens erupted in Washington State, the most significant volcanic event in the continental US in modern times.",
    1985: "The <span class='annotation-highlight'>Mexico City Earthquake</span> (magnitude 8.0) caused widespread destruction in the capital.",
    1988: "The <span class='annotation-highlight'>Armenian Earthquake</span> (magnitude 6.8) killed 25,000 people and left 500,000 homeless.",
    1991: "Mount Pinatubo erupted in the Philippines, affecting global climate for years.",
    1995: "The <span class='annotation-highlight'>Kobe Earthquake</span> in Japan (magnitude 6.9) caused massive damage to this major port city.",
    1999: "The <span class='annotation-highlight'>İzmit Earthquake</span> in Turkey (magnitude 7.6) killed over 17,000 people.",
    2004: "The <span class='annotation-highlight'>Indian Ocean Tsunami</span> triggered by a magnitude 9.1 earthquake killed over 230,000 people across 14 countries.",
    2005: "<span class='annotation-highlight'>Hurricane Katrina</span> devastated New Orleans and the Gulf Coast, becoming one of the costliest disasters in US history.",
    2008: "The <span class='annotation-highlight'>Sichuan Earthquake</span> in China (magnitude 7.9) killed nearly 70,000 people.",
    2010: "The <span class='annotation-highlight'>Haiti Earthquake</span> (magnitude 7.0) devastated Port-au-Prince, killing over 200,000 people.",
    2011: "The <span class='annotation-highlight'>Tōhoku Earthquake and Tsunami</span> in Japan (magnitude 9.1) triggered the Fukushima nuclear disaster.",
    2012: "<span class='annotation-highlight'>Hurricane Sandy</span> caused widespread damage across the Caribbean and Eastern United States.",
    2013: "<span class='annotation-highlight'>Typhoon Haiyan</span> (Yolanda) devastated the Philippines with winds up to 195 mph.",
    2015: "The <span class='annotation-highlight'>Nepal Earthquake</span> (magnitude 7.8) killed nearly 9,000 people and damaged historic sites.",
    2017: "A devastating hurricane season with <span class='annotation-highlight'>Harvey, Irma, and Maria</span> causing unprecedented damage.",
    2018: "The <span class='annotation-highlight'>Camp Fire</span> in California became the deadliest wildfire in state history.",
    2019: "Massive <span class='annotation-highlight'>Australian Bushfires</span> burned an area larger than Florida.",
    2020: "A record-breaking Atlantic hurricane season with 30 named storms, including devastating hurricanes in Central America.",
    2021: "The <span class='annotation-highlight'>Texas Winter Storm</span> caused widespread power outages and infrastructure failure.",
    2023: "The <span class='annotation-highlight'>Turkey-Syria Earthquakes</span> (magnitude 7.8) killed over 50,000 people across both countries.",
    2024: "Continuing to monitor and understand patterns in our changing climate..."
};