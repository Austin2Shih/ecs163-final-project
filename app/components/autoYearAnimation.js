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
                Beginning our journey through decades of natural disasters...
            </div>
            <button id="skip-animation-btn">Skip Animation</button>
        </div>
    `;
    
    indicator.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 25px;
        border-radius: 15px;
        z-index: 1000;
        font-family: Arial, sans-serif;
        max-width: 400px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        border-left: 4px solid #4CAF50;
    `;
    
    //styling for the annotations
    const style = document.createElement('style');
    style.textContent = `
        #year-animation-indicator .current-year {
            font-size: 2.2em;
            font-weight: bold;
            margin-bottom: 15px;
            color: #4CAF50;
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
            background: rgba(255, 193, 7, 0.3);
            padding: 2px 4px;
            border-radius: 3px;
            color: #FFC107;
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
            background: rgba(255, 193, 7, 0.1);
            border: 1px solid rgba(255, 193, 7, 0.3);
            border-radius: 8px;
            padding: 15px;
            animation: glow 2s ease-in-out;
        }
        
        @keyframes glow {
            0%, 100% { box-shadow: 0 0 5px rgba(255, 193, 7, 0.3); }
            50% { box-shadow: 0 0 20px rgba(255, 193, 7, 0.6); }
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