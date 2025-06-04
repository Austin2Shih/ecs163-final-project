const usedDisasters = ['Tropical cyclone', 'Flood', 'Earthquake'];

export default function filterUnusedDisasters(disasters) {
    return disasters.filter((d) => {
        return (
            usedDisasters.includes(d['Disaster Type']) ||
            usedDisasters.includes(d['Disaster Subtype']) &&
            d["Magnitude"] !== null
        );
    });
}
