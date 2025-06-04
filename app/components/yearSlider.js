import { yearUpdateDisplay } from '../utils/updateDisplay.js';
import appState from '../appState.js';

export default function initYearSlider() {
    d3.select('#year-slider')
    .on('input', function () {
        appState.selectedYear = +this.value;
        yearUpdateDisplay();
    })

    appState.selectedYear = 1960
}