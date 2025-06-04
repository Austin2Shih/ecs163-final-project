import appState from '../appState.js';
import { updateYearDisplay } from '../utils/updateDisplay.js';

export function startTimelineAnimation() {
    console.log('Starting timeline animation...');
    
    // Hide right panel during animation
    hideRightPanel();
    
    // Set animation state
    appState.isAnimating = true;
    appState.isInteractionEnabled = false;
    appState.selectedYear = 1950;
    
    // Disable country interaction
    disableCountryInteraction();
    
    // Start the animation directly - no overlays
    animateYear();
}

function hideRightPanel() {
    const rightPanel = document.querySelector('.right-panel, .charts-container'); // Adjust selector
    if (rightPanel) {
        rightPanel.style.transition = 'opacity 0.5s ease';
        rightPanel.style.opacity = '0';
        setTimeout(() => {
            rightPanel.style.display = 'none';
        }, 500);
    }
}

function showRightPanel() {
    const rightPanel = document.querySelector('.right-panel, .charts-container'); // Adjust selector
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
    const startYear = 1950;
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
    
    // Directly enable interactive mode - no popups
    setTimeout(() => {
        enableInteractiveMode();
    }, 500); // Small delay for smooth transition
}

function enableInteractiveMode() {
    // Enable interactions
    appState.isInteractionEnabled = true;
    enableCountryInteraction();
    
    // Show right panel
    showRightPanel();
    
    // Call the main app's interactive mode function
    if (window.enableInteractiveMode) {
        window.enableInteractiveMode();
    }
    
    console.log('Interactive mode enabled - you can now click on countries!');
}