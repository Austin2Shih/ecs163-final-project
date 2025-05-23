import appState from "../appState.js";

let ISO3ToIdMap = {}
let ISO2ToIdMap = {}
let ISO3ToISO2Map = {}
let ISO2ToISO3Map = {}
let IdToNameMap = {}

export function initCountryCodeConversionMaps() {
    ISO3ToIdMap = Object.fromEntries(
        appState.data.countryCodeData.map(
            ({ country_code_alpha3, country_id }) => [country_code_alpha3, +country_id]
        )
    )

    ISO2ToIdMap = Object.fromEntries(
        appState.data.countryCodeData.map(
            ({ country_code_alpha2, country_id }) => [country_code_alpha2, +country_id]
        )
    )

    ISO3ToISO2Map = Object.fromEntries(
        appState.data.countryCodeData.map(
            ({ country_code_alpha3, country_code_alpha2 }) => [country_code_alpha3, country_code_alpha2]
        )
    )

    ISO2ToISO3Map = Object.fromEntries(
        appState.data.countryCodeData.map(
            ({ country_code_alpha2, country_code_alpha3 }) => [country_code_alpha2, country_code_alpha3]
        )
    )

    IdToNameMap = Object.fromEntries(
        appState.data.countryCodeData.map(
            ({ country_id, country_name }) => [+country_id, country_name]
        )
    )
}

export function convertISO3ToId(iso3) {
    return ISO3ToIdMap[iso3]
}

export function convertISO2ToId(iso2) {
    return ISO2ToIdMap[iso2]
}

export function convertISO3ToISO2(iso3) {
    return ISO3ToISO2Map[iso3]
}

export function convertISO2ToISO3(iso2) {
    return ISO2ToISO3Map[iso2]
}

export function convertIdToName(id) {
    return IdToNameMap[id]
}