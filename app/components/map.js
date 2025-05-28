import appState from "../appState.js";
import { updateDisplay, addDisplayUpdateStep } from "../utils/updateDisplay.js";
import displayBarChart from "./barchart.js"; // Import your bar chart component

export default function displayMap() {
    const { countryShapeData, disasterData } = appState.data;

    // get map svg container and its width and height
    const svg = d3.select('#map-svg');
    const { width, height } = svg.node().getBoundingClientRect();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    // create margins
    const margin = { top: 120, right: 0, bottom: 120, left: 0 };
    const contentWidth = width - margin.left - margin.right;
    const contentHeight = height - margin.top - margin.bottom;

    // convert TopoJSON to GeoJSON for countries
    const countries = topojson.feature(countryShapeData, countryShapeData.objects.countries);

    // filter out antarctica
    countries.features = countries.features.filter(
        d => d.id !== 'ATA' && d.properties.name !== 'Antarctica'
    );

    // define projection for the map
    const projection = d3.geoMercator().fitSize([contentWidth, contentHeight], countries);

    // create a geoPath generator for country shapes
    const path = d3.geoPath().projection(projection);

    // find largest polygon for each country's path, used for labeling the country
    countries.features.forEach(d => {
        const geom = d.geometry;
        // Find the largest polygon by area
        let maxArea = -Infinity
        let largestPoly = null

        if (geom.type === 'Polygon') {
            largestPoly = geom.coordinates
        } else {
            geom.coordinates.forEach((poly) => {
                const polyArea = Math.abs(d3.polygonArea(poly[0]))
                if (polyArea > maxArea) {
                    maxArea = polyArea;
                    largestPoly = poly
                }
            })
        }

        d.largestPolygon = {
            type: 'Polygon',
            coordinates: largestPoly
        };

        d.centroid = path.centroid(d.largestPolygon)
    });

    const containerGroup = svg.append("g")
        .attr('transform', `translate(${margin.left}, ${margin.top})`)

    // create zoom group
    const mapGroup = containerGroup.append("g")

    // title for the map
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "1.5rem")
        .text("Natural Disasters");

    // Create chart container area (positioned on the right side)
    const chartContainer = svg.append("g")
        .attr("class", "chart-overlay")
        .attr("transform", `translate(${width - 500}, ${margin.top})`)
        .style("opacity", 0);

    // Add background for chart area
    chartContainer.append("rect")
        .attr("width", 480)
        .attr("height", 400)
        .attr("fill", "white")
        .attr("stroke", "#333")
        .attr("stroke-width", 2)
        .attr("rx", 8)
        .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.2))");

    // Add close button for chart
    const closeButton = chartContainer.append("g")
        .attr("class", "close-button")
        .attr("transform", "translate(450, 15)")
        .style("cursor", "pointer")
        .on("click", () => {
            hideChart();
            appState.selectedCountry = null;
            updateDisplay();
        });

    closeButton.append("circle")
        .attr("r", 12)
        .attr("fill", "#ff4757")
        .attr("stroke", "white")
        .attr("stroke-width", 2);

    closeButton.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .style("fill", "white")
        .style("font-weight", "bold")
        .style("font-size", "14px")
        .text("×");

    // Create SVG element for the bar chart within the chart container
    const chartSvg = chartContainer.append("svg")
        .attr("id", "embedded-chart")
        .attr("x", 15)
        .attr("y", 35)
        .attr("width", 450)
        .attr("height", 350);

    // Variable to store the current chart instance
    let currentChart = null;

    // Function to show chart for selected country
    function showChartForCountry(countryFeature) {
        const countryName = countryFeature.properties.name;
        const countryId = countryFeature.id;
        
        // Configuration for the embedded chart
        const chartConfig = {
            width: 450,
            height: 350,
            margin: { top: 30, right: 80, bottom: 60, left: 70 },
            showTitle: true,
            title: `${countryName} - Disaster Costs`
        };

        // Clear previous chart if exists
        if (currentChart) {
            currentChart.clearChart();
        }

        // Create new chart instance
        currentChart = displayBarChart('#embedded-chart', countryName, chartConfig);
        
        // Show chart container with animation
        chartContainer.transition()
            .duration(500)
            .style("opacity", 1);
    }

    // Function to hide chart
    function hideChart() {
        chartContainer.transition()
            .duration(300)
            .style("opacity", 0);
        
        // Clear chart after hiding
        setTimeout(() => {
            if (currentChart) {
                currentChart.clearChart();
                currentChart = null;
            }
        }, 300);
    }

    const countryGroups = mapGroup
        .selectAll("g.country")
        .data(countries.features, d => +d.id)
        .enter()
        .append("g")
        .attr("class", "country")
        .style("cursor", "pointer")
        .style("opacity", d => {
            if (appState.selectedCountry === null) return 1;
            return +d.id === appState.selectedCountry ? 1 : 0.3;
        })
        .on("click", (_, d) => {
            const clickedCountryId = +d.id;
            if (appState.selectedCountry === clickedCountryId) {
                appState.selectedCountry = null;
                hideChart();
            } else {
                appState.selectedCountry = clickedCountryId;
                showChartForCountry(d);
            }

            updateDisplay(); // Triggers full redraw
        });

    // draw countries on the map
    addDisplayUpdateStep(() => {
        countryGroups.selectAll("path")
            .attr("stroke", d => +d.id === appState.selectedCountry ? "yellow" : "black")  
        
        countryGroups
            .style("opacity", d => {
                if (appState.selectedCountry === null) return 1;
                return +d.id === appState.selectedCountry ? 1 : 0.3;
            })  
    })

    // Draw path within group
    countryGroups
        .append("path")
        .attr("d", path)
        .attr("fill", "#ddd")
        .attr("stroke", d => +d.id === appState.selectedCountry ? "yellow" : "black")
        .attr("stroke-width", 0.5);

    // Draw label within group
    countryGroups
        .append("text")
        .attr("x", d => isNaN(d.centroid[0]) ? 0 : d.centroid[0])
        .attr("y", d => isNaN(d.centroid[1]) ? 0 : d.centroid[1])
        .text(d => d.properties.name)
        .attr("fill", "black")
        .attr("font-size", `12px`)
        .attr("text-anchor", "middle")
        .attr("pointer-events", "none")
        .style("opacity", d => {
            const screenArea = path.area(d.largestPolygon);
            return screenArea > 1500 ? 1 : 0;
        });

    const disasterColor = d3.scaleOrdinal()
        .domain(["Storm", "Earthquake", "Drought"])
        .range(["#1f77b4", "#d62728", "#2ca02c"]); // blue, red, green

    const disastersWithCoords = disasterData.filter(d => d.Latitude && d.Longitude);

    mapGroup.selectAll("circle.disaster")
        .data(disastersWithCoords)
        .enter()
        .append("circle")
        .attr("class", "disaster")
        .attr("cx", d => projection([+d.Longitude, +d.Latitude])[0])
        .attr("cy", d => projection([+d.Longitude, +d.Latitude])[1])
        .attr("r", 3)
        .attr("fill", d => disasterColor(d["Disaster Type"]))
        .attr("opacity", 0.6)
        .attr("stroke", "#333")
        .attr("stroke-width", 0.2);

    // create zoom behavior generator
    const zoom = d3.zoom()
    .scaleExtent([1, 14])
    .translateExtent([
        [0, 0],
        [width, height]
    ])
    .on("zoom", (event) => {
        mapGroup.attr("transform", event.transform);
        const zoomLevel = event.transform.k
        // keep font-size the same as we zoom in. Also, once the country is large enough on the screen, display label.
        // the incremental label display is to prevent visual clutter
        mapGroup.selectAll("text").data(countries.features, d => d.id)
            .attr("font-size", `${10 / zoomLevel}px`)
            .style("opacity", d => {
                const screenArea = path.area(d.largestPolygon) * zoomLevel * zoomLevel;
                return screenArea > 1500 ? 1 : 0;
            });
    });

    // add zoom
    svg.call(zoom);

    // Handle appState updates for chart
    addDisplayUpdateStep(() => {
        if (appState.selectedCountry) {
            const selectedFeature = countries.features.find(f => +f.id === appState.selectedCountry);
            if (selectedFeature && currentChart) {
                // Update existing chart if country is already selected
                currentChart.updateChart(selectedFeature.properties.name);
            }
        }
    });
}