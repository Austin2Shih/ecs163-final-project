import appState from '../appState.js';
import { updateYearDisplay } from '../utils/updateDisplay.js';

export function startTimelineAnimation() {
    console.log('Starting timeline animation...');
    
    hideRightPanel();
    
    //set app state
    appState.isAnimating = true;
    appState.isInteractionEnabled = false;
    appState.selectedYear = 1960; // Start from 1960 to match your data
    
    //cant interact with country during animation
    disableCountryInteraction();
    
    animateYear();
}

function hideRightPanel() {
    const rightPanel = document.querySelector('.right-panel, .charts-container');
    if (rightPanel) {
        rightPanel.style.transition = 'opacity 0.5s ease';
        rightPanel.style.opacity = '0';
        setTimeout(() => {
            rightPanel.style.display = 'none';
        }, 500);
    }
}

function showRightPanel() {
    const rightPanel = document.querySelector('.right-panel, .charts-container');
    if (rightPanel) {
        rightPanel.style.display = 'block';
        rightPanel.style.opacity = '0';
        setTimeout(() => {
            rightPanel.style.opacity = '1';
        }, 100);
    }
}

function disableCountryInteraction() {
    const countryGroups = d3.selectAll('g.country');
    countryGroups.style('pointer-events', 'none');
}

function enableCountryInteraction() {
    const countryGroups = d3.selectAll('g.country');
    countryGroups.style('pointer-events', 'auto');
}

function animateYear() {
    if (!appState.isAnimating) return;
    
    const currentYear = appState.selectedYear;
    const startYear = 1960;
    const endYear = 2024;

    console.log('Animating year:', currentYear); // Debug log
    
    // Trigger year update (this will update your map automatically)
    updateYearDisplay();
    
    // Continue animation
    if (currentYear < endYear) {
        appState.selectedYear++;
        setTimeout(() => animateYear(), appState.animationSpeed);
    } else {
        // Animation complete
        completeAnimation();
    }
}

function completeAnimation() {
    appState.isAnimating = false;
    appState.animationComplete = true;
    
    // Reset to show all years initially after animation
    appState.selectedYear = null;
    
    //interactive mode after finishing animation
    setTimeout(() => {
        enableInteractiveMode();
    }, 500);
}

function enableInteractiveMode() {
    appState.isInteractionEnabled = true;
    enableCountryInteraction();
    
    showRightPanel();
    
    // Call the main app's interactive mode function
    if (window.enableInteractiveMode) {
        window.enableInteractiveMode();
    }
    
    // Update display to show all years after animation
    updateYearDisplay();
    
    console.log('Interactive mode enabled - you can now click on countries!');
}