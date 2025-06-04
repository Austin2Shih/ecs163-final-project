export default function findAffectedCountries(hurricaneData, countryFeatures, thresholdKm = 200) {
    // console.log(hurricaneData.length)
    console.time('Affected Country Matching'); // Start timer
    const testHurricaneData = hurricaneData.map(hurricane => {
        const hurricanePoint = turf.point([hurricane.lon, hurricane.lat]);
        const hurricaneImpactZone = turf.buffer(hurricanePoint, thresholdKm, { units: 'kilometers' });
        return {
            ...hurricane,
            affectedCountries: countryFeatures.filter((country) => {
                const countryPolygon = country.geometry;
                return turf.booleanIntersects(hurricaneImpactZone, countryPolygon);
            })
            .map(country => +country.id)
        }
    })

    console.timeEnd('Affected Country Matching'); // End timer
    // console.log(testHurricaneData)

    // Trigger file download with updated data as JSON
    const dataStr = JSON.stringify(testHurricaneData);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'hurricanes_with_countries.json';
    a.click();

    URL.revokeObjectURL(url);
}
