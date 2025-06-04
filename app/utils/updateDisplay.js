import appState from '../appState.js';

export function addDisplayUpdateStep(updateStep) {
  appState.updateCallbacks.push(updateStep);
}

export function updateDisplay() {
  appState.updateCallbacks.forEach((callback) => callback());
}

export function addYearDisplayUpdateStep(updateStep) {
  appState.yearUpdateCallbacks.push(updateStep);
}

export function yearUpdateDisplay() {
  appState.yearUpdateCallbacks.forEach((callback) => callback());
}
