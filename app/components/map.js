import appState from "../appState.js";
import { convertIdToName } from "../utils/convertCountryCode.js";
import { updateDisplay, addDisplayUpdateStep } from "../utils/updateDisplay.js";

export default function displayMap() {
    const { countryShapeData } = appState.data;

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
            } else {
                appState.selectedCountry = clickedCountryId;
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
}