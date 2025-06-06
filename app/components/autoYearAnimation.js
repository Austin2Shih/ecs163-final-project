import appState from '../appState.js';
import { updateDisplay, updateYearDisplay } from '../utils/updateDisplay.js';

//major disasters and climate events that will show up
const annotations = {
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

const annotatedYears = Object.keys(annotations).map(year => parseInt(year)).sort((a, b) => a - b);
let yearIndex = 0;

export function startAnimation() {
    
    //hide ui elements during animaiton
    hideSliderAndCharts();
    createAnnotation();
    yearIndex = 0;
    
    appState.isAnimating = false;
    appState.selectedYear = annotatedYears[yearIndex];
    
    updateCurrentDisplay();
}

function hideSliderAndCharts() {
    //hiding year slider and charts during animation
    const yearSlider = document.querySelector('.year-slider-container');
    if (yearSlider) {
        yearSlider.style.opacity = '0.3';
        yearSlider.style.pointerEvents = 'none';
    }
    
    //hide charts on the right during animation for less distraction
    const charts = document.querySelectorAll('.right-container');
    charts.forEach(chart => {
        chart.style.opacity = '0';
        chart.style.pointerEvents = 'none';
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
    const rightContainer = document.querySelector('.right-container');
    if (rightContainer) {
        rightContainer.style.opacity = '1';
    }

    const hiddenElements = document.querySelectorAll('[data-hidden-during-navigation="true"]');
    hiddenElements.forEach(element => {
        element.style.display = '';
        element.removeAttribute('data-hidden-during-navigation');
    });
    
    const charts = document.querySelectorAll('.line-chart-container, .bar-chart-container, .chart, canvas');
    charts.forEach(chart => {
        chart.style.opacity = '1';
        chart.style.display = '';
    });
}

function createAnnotation(){
    const annotationInfo = document.createElement('div');
    annotationInfo.id = 'event-annotation-content';
    annotationInfo.innerHTML = `
        <h3 id="current-year-display">${annotatedYears[0]}</h3>
        <p class="event-counter" id="event-counter">Event 1 of ${annotatedYears.length}</p>
        <div class="annotation-text" id="annotation-text">
            Use the buttons below to explore natural disasters and climate events!
        </div>
        <div class="navigation-buttons">
            <button id="prev-btn" class="nav-btn">
                <span class="nav-arrow">←</span> Previous Event
            </button>
            <button id="next-btn" class="nav-btn">
                Next Event <span class="nav-arrow">→</span>
            </button>
            <button id="exit-nav-btn" class="exit-btn">Exit Navigation</button>
        </div>
    `;
    annotationInfo.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #FFFFFF;
        color: white;
        padding: 25px;
        border-radius: 15px;
        z-index: 1000;
        font-family: Arial, sans-serif;
        max-width: 450px;
    `;
    
    document.body.appendChild(annotationInfo);
    const style = document.createElement('style');
    style.id = 'annotation-styles';
    style.textContent = `
        #event-annotation-content {
            padding: 20px 0 30px 0;
            margin-bottom: 20px;
        }
        
        #event-annotation-content h3 {
            font-size: 2.2em;
            font-weight: bold;
            color: rgb(96, 202, 219);
            margin: 0 0 10px 0;
            text-align: center;
        }
        
        #event-annotation-content .event-counter {
            font-size: 0.95em;
            color: black;
            margin: 0 0 20px 0;
            text-align: center;
            font-style: italic;
        }
        
        #event-annotation-content .annotation-text {
            font-size: 1em;
            line-height: 1.7;
            margin: 0 0 20px 0;
            padding: 15px;
            background: white;
            color:black;
        }
        
        .annotation-highlight {
            background: rgba(96, 202, 219, 0.2);
            padding: 2px 4px;
            border-radius: 3px;
            color: rgb(77, 183, 200);
            font-weight: bold;
        }
        
        .annotation-special .annotation-text {
            background: rgba(96, 202, 219, 0.08);
            border-left: 4px solid rgb(96, 202, 219);
            box-shadow: 0 2px 8px rgba(96, 202, 219, 0.1);
        }
        
        #event-annotation-content .navigation-buttons {
            display: flex;
            gap: 8px;
            margin-top: 15px;
            flex-wrap: wrap;
        }
        
        #event-annotation-content .nav-btn {
            border: none;
            background: rgb(96, 202, 219);
            color: white;
            padding: 10px 14px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.85em;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
            flex: 1;
            min-width: 120px;
        }
        
        #event-annotation-content .nav-btn:hover {
            background: rgb(76, 182, 199);
            transform: translateY(-1px);
        }
        
        #event-annotation-content .nav-btn:disabled {
            background: #999;
            cursor: not-allowed;
            transform: none;
        }
        
        #event-annotation-content .nav-arrow {
            font-size: 1.1em;
            font-weight: bold;
        }
        
        #event-annotation-content .exit-btn {
            background: #ff4757;
            border: none;
            color: white;
            padding: 10px 14px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.85em;
            transition: background 0.3s ease;
            flex: 0 0 auto;
            min-width: 100px;
        }
        
        #event-annotation-content .exit-btn:hover {
            background: #ff3742;
        }
    `;
    document.head.appendChild(style);

    document.getElementById('prev-btn').addEventListener('click', () => {
        goToPrev();
    });

    document.getElementById('next-btn').addEventListener('click', () => {
        goToNext();
    });

    document.getElementById('exit-nav-btn').addEventListener('click', () => {
        exit();
    });

    updateButtons();
}

function hideAnnotation(){
    const info = document.getElementById('event-annotation-content');
    if (info) {
        info.remove();
    }
    const styles = document.getElementById('annotation-styles');
    if (styles) {
        styles.remove();
    }
}
function goToPrev() {
    if (yearIndex > 0) {
        yearIndex--;
        appState.selectedYear = annotatedYears[yearIndex];
        updateDisplay();
        updateCurrentDisplay();
        updateButtons();
    }
}
function goToNext() {
    if (yearIndex < annotatedYears.length - 1) {
        yearIndex++;
        appState.selectedYear = annotatedYears[yearIndex];
        updateDisplay();
        updateCurrentDisplay();
        updateButtons();
    }
    else {
        updateDisplay();
        updateCurrentDisplay();
        updateButtons();
        setTimeout(() => {
            exit();
        }, 2000);
    }
}

function updateCurrentDisplay() {
    const current = appState.selectedYear;
    const yearDisplay = document.getElementById('current-year-display');
    const annotationText = document.getElementById('annotation-text');
    const eventCounter = document.getElementById('event-counter');

    if (yearDisplay) {
        yearDisplay.textContent = current;
    }
    
    //update annotation text for special events
    if (annotationText) {
        const annotation = annotations[current];
        if (annotation) {
            annotationText.innerHTML = annotation;
            const content = document.getElementById('event-annotation-content');
            if (content) {
                content.classList.add('annotation-special');
            }
        } 
        else {
            annotationText.innerHTML = `Major event in ${current}`;
            const content = document.getElementById('event-annotation-content');
            if (content) {
                content.classList.add('annotation-special');
            }
        }
    }

    if (eventCounter) {
        const eventNum = yearIndex + 1;
        eventCounter.textContent = `Event ${eventNum} of ${annotatedYears.length}`;
    }

    updateYearDisplay();

    const slider = document.querySelector('#year-slider, input[type="range"]');
    if (slider) {
        slider.value = current;
    }
}

function updateButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    if (prevBtn) {
        prevBtn.disabled = yearIndex <= 0;
    }
    if (nextBtn) {
        if (yearIndex >= annotatedYears.length - 1) {
            nextBtn.disabled = true;
            nextBtn.innerHTML = 'Complete! Press Exit! <span class="nav-arrow"></span>';
        }
        else {
            nextBtn.disabled = false;
            nextBtn.innerHTML = 'Next Event <span class="nav-arrow">→</span>';
        }
    }
}

function exit() {
    hideAnnotation();
    showSliderAndCharts();
    updateYearDisplay();  
}

// start fuction
export function startYearAnimation() {
    setTimeout(() => {
        startAnimation();
    }, 100);
}
