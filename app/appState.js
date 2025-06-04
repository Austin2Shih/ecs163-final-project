const appState = {
    displayStage: 0,
    selectedCountry: null,
    selectedYear: null,
    updateCallbacks: [],
    yearUpdateCallbacks: [],

    //properties for animated slideshow
    isAnimating: false,
    animationComplete: false,
    animationSpeed: 150,
    isInteractionEnabled: false,

    data: {
        countryCodeData: null,
        disasterData: null,
        countryShapeData: null,
        temperatureData: null,
        hurricaneData: null,
    }
}

export default appState