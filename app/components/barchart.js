import appState from "../appState.js";
import { updateDisplay, addDisplayUpdateStep } from "../utils/updateDisplay.js";
import displayBarChart from "./barchart.js";

export default function displayMap() {
    const { countryShapeData, disasterData } = appState.data;

    // Clear any existing map content first
    d3.select('#map-svg').selectAll("*").remove();

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

    // Create main container group
    const containerGroup = svg.append("g")
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Create zoom group - this is what gets transformed during zoom
    const mapGroup = containerGroup.append("g")
        .attr("class", "zoom-group");

    // title for the map (outside zoom group so it doesn't move)
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "1.5rem")
        .text("Natural Disasters");

    // Variable to store the current chart instance
    let currentChart = null;

    // Function to show chart in the dedicated bottom-right container
    function showChartForCountry(countryFeature) {
        const countryName = countryFeature.properties.name;
        
        console.log(`Creating chart for: ${countryName}`);
        
        // Get the bar chart container
        const containerDiv = document.querySelector('.bar-chart-container');
        const barChartSvg = d3.select('#bar-chart-svg');
        
        if (!containerDiv || barChartSvg.empty()) {
            console.error('Bar chart container not found!');
            return;
        }

        // Get usable dimensions (accounting for 16px padding)
        const containerRect = containerDiv.getBoundingClientRect();
        const usableWidth = containerRect.width - 32;
        const usableHeight = containerRect.height - 32;
        
        console.log(`Container: ${containerRect.width}x${containerRect.height}, Usable: ${usableWidth}x${usableHeight}`);
        
        // Check if dimensions are reasonable
        if (usableWidth < 200 || usableHeight < 150) {
            console.error('Container too small:', usableWidth, 'x', usableHeight);
            
            // Show a simple message in the container
            barChartSvg
                .attr("width", usableWidth)
                .attr("height", usableHeight)
                .selectAll("*").remove();
                
            barChartSvg.append("text")
                .attr("x", usableWidth / 2)
                .attr("y", usableHeight / 2)
                .attr("text-anchor", "middle")
                .style("font-size", "12px")
                .style("fill", "#666")
                .text(`Container: ${Math.round(usableWidth)}×${Math.round(usableHeight)}`);
            return;
        }
        
        // Try a simpler chart config first
        const chartConfig = {
            width: usableWidth,
            height: usableHeight,
            margin: { 
                top: 25,
                right: 80,   // Fixed smaller right margin
                bottom: 60,  // Fixed smaller bottom margin  
                left: 45     // Fixed smaller left margin
            },
            showTitle: true,
            title: countryName
        };

        console.log('Chart config:', chartConfig);
        console.log('Chart area will be:', 
            chartConfig.width - chartConfig.margin.left - chartConfig.margin.right, 'x',
            chartConfig.height - chartConfig.margin.top - chartConfig.margin.bottom);

        // Clear previous chart
        if (currentChart) {
            currentChart.clearChart();
        }

        // Size the SVG properly
        barChartSvg
            .attr("width", usableWidth)
            .attr("height", usableHeight);

        // Add a temporary background to see the SVG bounds
        barChartSvg.selectAll("*").remove();
        barChartSvg.append("rect")
            .attr("width", usableWidth)
            .attr("height", usableHeight)
            .attr("fill", "#f0f0f0")
            .attr("stroke", "#999")
            .attr("stroke-width", 1);

        // Create the chart
        try {
            console.log('Calling displayBarChart...');
            currentChart = displayBarChart('#bar-chart-svg', countryName, chartConfig);
            console.log('Chart created successfully');
        } catch (error) {
            console.error('Chart creation failed:', error);
            
            barChartSvg.append("text")
                .attr("x", usableWidth / 2)
                .attr("y", usableHeight / 2)
                .attr("text-anchor", "middle")
                .style("font-size", "12px")
                .style("fill", "red")
                .text(`Error: ${error.message}`);
        }
    }

    // Function to hide/clear chart
    function hideChart() {
        if (currentChart) {
            currentChart.clearChart();
            currentChart = null;
        }
        d3.select('#bar-chart-svg').selectAll("*").remove();
        console.log('Chart cleared');
    }

    // Create country groups
    const countryGroups = mapGroup
        .selectAll("g.country")
        .data(countries.features, d => d.id)
        .enter()
        .append("g")
        .attr("class", "country")
        .style("cursor", "pointer")
        .style("opacity", d => {
            if (appState.selectedCountry === null) return 1;
            return d.id === appState.selectedCountry ? 1 : 0.3;
        })
        .on("click", (event, d) => {
            console.log('Country clicked:', d.properties.name);
            
            if (appState.selectedCountry === d.id) {
                appState.selectedCountry = null;
                hideChart();
            } else {
                appState.selectedCountry = d.id;
                showChartForCountry(d);
            }

            updateDisplay();
        });

    // Draw paths within groups
    countryGroups
        .append("path")
        .attr("d", path)
        .attr("fill", "#ddd")
        .attr("stroke", d => d.id === appState.selectedCountry ? "yellow" : "black")
        .attr("stroke-width", 0.5);

    // Draw labels within groups
    countryGroups
        .append("text")
        .attr("x", d => isNaN(d.centroid[0]) ? 0 : d.centroid[0])
        .attr("y", d => isNaN(d.centroid[1]) ? 0 : d.centroid[1])
        .text(d => d.properties.name)
        .attr("fill", "black")
        .attr("font-size", "12px")
        .attr("text-anchor", "middle")
        .attr("pointer-events", "none")
        .style("opacity", d => {
            const screenArea = path.area(d.largestPolygon);
            return screenArea > 1500 ? 1 : 0;
        });

    // Add disaster points
    const disasterColor = d3.scaleOrdinal()
        .domain(["Storm", "Earthquake", "Drought"])
        .range(["#1f77b4", "#d62728", "#2ca02c"]);

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

    // Create zoom behavior - Fixed version
    const zoom = d3.zoom()
        .scaleExtent([1, 14])
        .translateExtent([
            [0, 0],
            [width, height]
        ])
        .on("zoom", (event) => {
            mapGroup.attr("transform", event.transform);
            
            const zoomLevel = event.transform.k;
            
            mapGroup.selectAll("text")
                .attr("font-size", `${12 / zoomLevel}px`)
                .style("opacity", d => {
                    const screenArea = path.area(d.largestPolygon) * zoomLevel * zoomLevel;
                    return screenArea > 1500 ? 1 : 0;
                });
        });

    svg.call(zoom);

    // Update function for selection changes
    addDisplayUpdateStep(() => {
        countryGroups.selectAll("path")
            .attr("stroke", d => d.id === appState.selectedCountry ? "yellow" : "black");
        
        countryGroups
            .style("opacity", d => {
                if (appState.selectedCountry === null) return 1;
                return d.id === appState.selectedCountry ? 1 : 0.3;
            });
    });

    console.log('Map initialized successfully');
}