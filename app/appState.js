const appState = {
  displayStage: 0,
  selectedCountry: null,
  selectedYear: null,
  updateCallbacks: [],
  yearUpdateCallbacks: [],
  data: {
    countryCodeData: null,
    disasterData: null,
    countryShapeData: null,
    temperatureData: null,
    earthquakeData: null,
    floodData: null,
    hurricaneData: null,
  },
};
export default appState;
