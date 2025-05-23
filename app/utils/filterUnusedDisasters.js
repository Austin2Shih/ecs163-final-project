export default function filterUnusedDisasters(disasters) {
    return disasters.filter((d) => ["Storm", "Drought", "Earthquake"].includes(d["Disaster Type"]))
}