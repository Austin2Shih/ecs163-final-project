import appState from "../appState"; 

export default function updateDisplay() {
    appState.updateCallbacks.forEach(callback => callback())
}