import appState from '../appState.js';
import { updateYearDisplay } from '../utils/updateDisplay.js';

export function startAutoYearAnimation() {
    
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
    //annotation overlay with event and description
    const indicator = document.createElement('div');
    indicator.id = 'year-animation-indicator';
    indicator.innerHTML = `
        <div class="annotation-content">
            <div class="current-year" id="current-year-display">1960</div>
            <div class="annotation-text" id="annotation-text">
                Let's explore natural disasters and big events in climate change!
            </div>
            <button id="skip-animation-btn">Skip Animation</button>
        </div>
    `;
    
    indicator.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #000000;
        color: white;
        padding: 25px;
        border-radius: 15px;
        z-index: 1000;
        font-family: Arial, sans-serif;
        max-width: 400px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        border-left: 4px solid rgb(96, 202, 219);
    `;
    
    //styling for the annotations
    const style = document.createElement('style');
    style.textContent = `
        #year-animation-indicator .current-year {
            font-size: 2.2em;
            font-weight: bold;
            margin-bottom: 15px;
            color:rgb(96, 202, 219);
            text-align: center;
        }
        
        #year-animation-indicator .annotation-text {
            font-size: 1em;
            line-height: 1.5;
            margin-bottom: 20px;
            text-align: left;
            min-height: 60px;
        }
        
        .annotation-highlight {
            background: rgba(96, 202, 219, 0.3);
            padding: 2px 4px;
            border-radius: 3px;
            color:rgb(96, 202, 219);
            font-weight: bold;
        }
        
        #year-animation-indicator button {
            background: #ff4757;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.9em;
            width: 100%;
            transition: background 0.3s ease;
        }
        
        #year-animation-indicator button:hover {
            background: #ff3742;
        }
        
        .annotation-special {
            background: rgba(96, 202, 219, 0.1);
            border: 1px solid rgba(96, 202, 219, 0.3);
            border-radius: 8px;
            padding: 15px;
            animation: glow 2s ease-in-out;
        }
        
        @keyframes glow {
            0%, 100% { box-shadow: 0 0 5px rgba(96, 202, 219, 0.3); }
            50% { box-shadow: 0 0 20px rgba(96, 202, 219, 0.6); }
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(indicator);
    
    //skip button if users dont want to go through animation
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
//major disasters that will show up
const disasterAnnotations = {
    1960: "Let's explore natural disasters and big events in climate change!",
    1962: "Sep - Rachel Carson published her famous book, Silent Spring, triggering large movements in environmental conservation efforts.",
    1969: "The Ohio Cuyahoga River catches on fire, brings major awareness to environmental issues.",
    1970: "Apr 22 - <span class='annotation-highlight'>First US Earth Day</span> to increase awareness for environmental conservation. Nov 12-13 - <span class='annotation-highlight'>Bhola Cyclone</span> happened in Bangladesh with winds speed reaching 205 km/h, equivalent to a Category 4 major hurricane. Before the cyclone reached land, a 35-foot (10.6 m) storm caused widespread flooding.",
    1972: "June 5 - <span class='annotation-highlight'>UN Environment Programme</span> was formed, encouraging the involvement of science and policy to help environmental conservation.",
    1975: "Aug 5-9 - <span class='annotation-highlight'>Typhoon Nina</span> hit western Henan China causing the Banqiao Dam's failure causing a flood that killed more than 150 thousand people.",
    1976: "July 28 - <span class='annotation-highlight'>Large earthquake in Tangshan, China</span> with magnitude of 7.8 on the Richter Scale, 85% of all buildings in the city destroyed.",
    1987: "Sep 16 - <span class='annotation-highlight'>Montreal Protocol</span> passed to reduce ozone-depleting chemicals.",
    1988: "UN IPCC (Intergovernmental Panel on Climate Change) assesses the impact of and possible responses to global warming and compiles scientific reports for policymakers.",
    1990: "Apr 22 - <span class='annotation-highlight'>Earth Day</span> is now an international celebration.",
    1991: "Apr 22-30 - <span class='annotation-highlight'>The Bangladesh Cyclone</span> struck Chittagoong with wind speeds up to 210 km/h, with 80-90% of buildings getting destroyed and around 139,000 injured.",
    1992: "June 3-14 - UN Earth Summit held.",
    1997: "Dec 11 - <span class='annotation-highlight'>Kyoto Protocol</span> is held addressing global warming and reducing greenhouse gad emissions",
    2004: "Dec 26 - <span class='annotation-highlight'>KIndian Ocean Earthquake and Tsunami</span> occurred in the west coast of Indonesia with a magnitude of 9.1, causing a large tsunami.",
    2005: "Oct 8 - The <span class='annotation-highlight'>Kashmir Earthquake</span> in the Kashmir region of Pakistan was recorded at magnitude 7.6 and had numerous aftershocks, landslides, and falling rocks that killed at least 79 thousand people and destroyed more than 32 thousand buildings.",
    2008: "May 2-3 - <span class='annotation-highlight'>Cyclone Nargis</span> hit Myanmar, causing large impact on its largest city of Yangon as well as Ayeyarwady. It was category 3 and largely affected 50 townships and 2.4 million people with 140,000 casualties.",
    2010: "Jan 12 - An earthquake struck with a magnitude of 7.0 struck Haiti, with over 300,000 buildings and houses destroyed. It was followed by aftershocks registed at 5.9 and 5.5. 2-3 hundered thousand deaths were estimated.",
    2011: "Mar - Fukushima accident caused by an earthquake-triggered tsunami off the coast of Japan.",
    2014: "Apr - Monthly CO2 levels breach 400 ppm threshold and continue to rise.",
    2015: "Dec 12 - <span class='annotation-highlight'>Paris Agreement</span> was adopted, replacing the Kyoto Protocol to reduce greenhouse gases. 195 countries signed.",
    2016: "<span class='annotation-highlight'>Hottest year</span> on record at the time.",
    2017: "Apr 22 - <span class='annotation-highlight'>March for Science</span> was held on Earth Day with over a million participants worldwide, encouraging scientifically informed policymaking. Sep 20 - <span class='annotation-highlight'>Hurricane Maria</span> struck Puerto Rico and caused 41 inches of rainfall, which led to flooding. It caused $98 billion in damages.",
    2019: "2019-2020 - Over 80 thousand fires were reported in the Amazon Rainforest, and over 3 million hectares were burned.",
    2020: "2020 and 2016 are tied as the <span class='annotation-highlight'>hottest years</span> on record. Earth's global average surface temp continues to warm due to human activities.",
    2023: "Feb 6 - An earthquake with a magnitude of 7.8 hit south-central Turkey, causing tens of thousands of casualties in Turkey and Syria and over 100,000 buildings to be damaged. This earthquake left 1.9 million people to be displaced."
};

function animateYears() {
    if (!appState.isAnimating) return;
    
    const currentYear = appState.selectedYear;
    const endYear = 2024;
    
    //update the year display
    const yearDisplay = document.getElementById('current-year-display');
    const annotationText = document.getElementById('annotation-text');
    
    if (yearDisplay) {
        yearDisplay.textContent = currentYear;
    }
    
    //update annotation text for special events
    if (annotationText) {
        const annotation = disasterAnnotations[currentYear];
        if (annotation) {
            annotationText.innerHTML = annotation;
            annotationText.classList.add('annotation-special');
        } else {
            annotationText.innerHTML = `Tracking natural disasters and climate change events worldwide in ${currentYear}...`;
            annotationText.classList.remove('annotation-special');
        }
    }

    updateYearDisplay();

    const slider = document.querySelector('#year-slider, input[type="range"]');
    if (slider) {
        slider.value = currentYear;
    }
    
    //determine pause duration on whether there is major natural disaster in that year
    const annotation = disasterAnnotations[currentYear];
    let pauseDuration;
    
    if (annotation) {
        //major disaster - 3 year pause
        pauseDuration = 3000;
    } else {
        // regular years - 400 ms delay
        pauseDuration = appState.animationSpeed || 400;
    }
    
    //continue animation
    if (currentYear < endYear) {
        appState.selectedYear++;
        setTimeout(() => animateYears(), pauseDuration);
    } else {
        completeAnimation();
    }
}

function completeAnimation() {
    appState.isAnimating = false;
    hideAnimationIndicator();
    showSliderAndCharts();
    //select year as 2024 at end of animation so map doesnt get cluttered
    appState.selectedYear = 2024;
    updateYearDisplay();
    
}

function skipAnimation() {
    appState.isAnimating = false;
    appState.selectedYear = 2024;
    completeAnimation();
    updateYearDisplay();
}

//auto start fuction
export function autoStartYearAnimation() {
    setTimeout(() => {
        startAutoYearAnimation();
    }, 2000); //starts 2 seconds after page loaded
}
