const usedDisasters = ['Tropical cyclone', 'Drought', 'Earthquake'];

export default function filterUnusedDisasters(disasters) {
  return disasters.filter((d) => {
    return (
      usedDisasters.includes(d['Disaster Type']) ||
      usedDisasters.includes(d['Disaster Subtype'])
    );
  });
}
