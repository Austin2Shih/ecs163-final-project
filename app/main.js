const HISTOGRAM_NUM_BINS = 30
const HISTOGRAM_BAR_GAP = 2

// defining global state that will change what data is displayed
const appState = {
    selectedCountryIso2: null,
    selectedCountryName: "Global",
    updateDashboard: () => {},
    mapTransformation: d3.zoomIdentity
}

Promise.all([
    d3.csv('data/ds_salaries.csv'),
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
    d3.csv('data/iso-codes-map.csv')
]).then(displayDashboard)

/**
 * Renders a full salary dashboard including:
 * - A histogram of salary distribution
 * - A Sankey diagram showing relationships between salary bins, experience levels, and work types
 * - A world map color-coded by median salary per country
 *
 * @param {Array} data - An array containing:
 *   [0] {Object[]} salaryData - Array of salary records with fields such as `salary_in_usd`, `experience_level`, `remote_ratio`, and `company_location`
 *   [1] {Object} countryData - TopoJSON object representing countries of the world
 *   [2] {Object[]} isoCodeMapData - Mapping from country ISO Alpha-2 codes to internal country IDs (fields: `country_code_alpha2`, `country_id`)
 */
function displayDashboard([salaryData, countryData, isoCodeMapData]) { 
    // creating a reusable callback function to call when a country is clicked on the map
    appState.updateDashboard = () => {
        // clear existing elements in svg
        d3.select("#map-svg").selectAll("*").remove();
        d3.select("#histogram-svg").selectAll("*").remove();
        d3.select("#parallel-svg").selectAll("*").remove();

        // filter based on selectedCountry
        const filteredSalaryData = salaryData.filter(({company_location}) => 
            appState.selectedCountryIso2 ? company_location === appState.selectedCountryIso2: true
        )   

        const salaryHistogramData = filteredSalaryData.map(({ salary_in_usd }) => +salary_in_usd)

        // binning salaries for the sankey diagram
        const binSalaries = (salary) => {
            if (salary < 50000) return '< 50k'
            if (salary >= 50000 && salary < 100000) return '50k-100k'
            if (salary >= 100000 && salary < 150000) return '100k-150k'
            if (salary >= 150000 && salary < 200000) return '150k-200k'
            return '200k+'
        }

        const experienceLevelMap = {
            SE: 'Senior',
            MI: 'Mid Level',
            EN: 'Entry Level',
            EX: 'Executive'
        }

        const binWorkTypes = (remoteRatio) => {
            if (remoteRatio <= 33) return 'in-office'
            if (remoteRatio > 33 && remoteRatio <= 66) return 'hybrid'
            return 'remote'
        }

        const parallelData = filteredSalaryData.map(({ salary_in_usd, experience_level, remote_ratio }) => ({
            salaryBin: binSalaries(+salary_in_usd),
            experienceLevel: experienceLevelMap[experience_level],
            workType: binWorkTypes(+remote_ratio)
        }))

        // creating quick lookup maps to go between country representations
        const isoCodeToIdMap = Object.fromEntries(isoCodeMapData.map(({country_code_alpha2, country_id}) => [country_code_alpha2, +country_id]))
        const idToIsoCodeMap = Object.fromEntries(isoCodeMapData.map(({country_id, country_code_alpha2}) => [+country_id, country_code_alpha2]))
        const isoCodeToNameMap = Object.fromEntries(isoCodeMapData.map(({country_code_alpha2, country_name}) => [country_code_alpha2, country_name]))

        const mapData = salaryData.map(({ salary_in_usd, company_location, employee_residence }) => ({
            salary_in_usd: +salary_in_usd,
            employee_country: isoCodeToIdMap[employee_residence],
            country: isoCodeToIdMap[company_location],
            iso2: company_location
        }))

        displayHistogram(salaryHistogramData)
        displaySankey(parallelData)
        displayMap({ mapData, countryData, isoCodeToIdMap, idToIsoCodeMap, isoCodeToNameMap })
    }

    // initial render
    appState.updateDashboard()
}

/**
 * Renders a histogram of salary data.
 * 
 * @param {number[]} data - An array of salary values in USD.
 * 
 * This function:
 *   - Sets up the SVG canvas and margins.
 *   - Computes histogram bins using d3.histogram with predefined number of bins.
 *   - Calculates appropriate x and y scales.
 *   - Appends axes, labels, and bars representing the frequency of salary ranges.
 */
function displayHistogram(data) {
    // get the svg object and grab the width and height
    const svg = d3.select('#histogram-svg');
    const { width, height } = svg.node().getBoundingClientRect();

    // create margins
    const margin = { top: 48, right: 32, bottom: 56, left: 32 };
    const contentWidth = width - margin.left - margin.right;
    const contentHeight = height - margin.top - margin.bottom;

    const maxValue = Math.max(...data)
    const maxBinValue = Math.ceil(maxValue / HISTOGRAM_NUM_BINS) * (HISTOGRAM_NUM_BINS + 1)

    // add group
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // create x scale
    const x = d3.scaleLinear()
        .domain([0, maxBinValue])
        .range([0, contentWidth]);

    // set up histogram parameters
    const histogram = d3.histogram()
        .value(d => d)
        .domain([0, maxBinValue])
        .thresholds(x.ticks(HISTOGRAM_NUM_BINS));

    // apply data to histogram generator
    const bins = histogram(data);

    // create y scale
    const y = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.length)])
        .range([contentHeight, 0]);

    // add in title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', margin.top / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .text(() => {
            const base = "Distribution of Salaries (USD)"
            const additional = ` - ${appState.selectedCountryName}`
            return base + additional
        });

    // add in x axis
    g.append('g')
        .attr('transform', `translate(0, ${contentHeight})`)
        .call(d3.axisBottom(x));

    // add in x label
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height - 12)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .text('Salary (USD)');

    // add in y axis
    g.append('g')
        .call(d3.axisLeft(y));

    // add bars in
    g.selectAll('rect')
        .data(bins)
        .enter()
        .append('rect')
        .attr('x', d => x(d.x0) + HISTOGRAM_BAR_GAP / 2)
        .attr('y', d => y(d.length))
        .attr('width', d => x(d.x1) - x(d.x0) - HISTOGRAM_BAR_GAP)
        .attr('height', d => contentHeight - y(d.length))
        .style('fill', 'steelblue');
}

/**
 * Renders a Sankey diagram based on data containing salary bins, experience levels, and work types.
 * Each row in `data` represents a flow from salary bin → experience level → work type.
 * 
 * @param {Array<Object>} data - The dataset to visualize. Each object should contain:
 *   - {string} salaryBin - The salary category of the entry.
 *   - {string} experienceLevel - The experience level
 *   - {string} workType - The work arrangement remote, hybrid, in-office).
 * 
 * The function:
 *   - Extracts unique node labels from the three categories.
 *   - Constructs a matrix to count connections between nodes.
 *   - Converts the matrix into Sankey link format.
 *   - Uses d3-sankey to compute node and link positions.
 *   - Draws nodes and links on the SVG element with id "parallel-svg".
 */
function displaySankey(data) {
    // get the svg object and grab the width and height
    const svg = d3.select('#parallel-svg');
    const { width, height } = svg.node().getBoundingClientRect();

    // set margins
    const margin = { top: 48, right: 64, bottom: 16, left: 32 };

    // get all nodes from unique values for attributes
    const salaryBins = Array.from(new Set(data.map(({salaryBin}) => salaryBin)))
    const experienceLevel = Array.from(new Set(data.map(({experienceLevel}) => experienceLevel)))
    const workType = Array.from(new Set(data.map(({workType}) => workType)))

    const nodes = [...salaryBins, ...experienceLevel, ...workType].map((id) => ({ id }))
    const nodeMap = Object.fromEntries(nodes.map(({ id }, index) => [id, index]))

    const linkMatrix = Array.from({ length: nodes.length }, () => Array(nodes.length).fill(0))

    data.forEach(({ salaryBin, experienceLevel, workType }) => {
        linkMatrix[nodeMap[salaryBin]][nodeMap[experienceLevel]] += 1
        linkMatrix[nodeMap[experienceLevel]][nodeMap[workType]] += 1
    })

    const links = []

    for (let i = 0; i < nodes.length; i++) {
        for (let j = 0; j < nodes.length; j++) {
            if (linkMatrix[i][j] > 0) {
                links.push({
                    source: i,
                    target: j,
                    value: linkMatrix[i][j]
                })
            }
        }
    }

    // get a sankey generator
    const sankey = d3.sankey()
    .nodeWidth(20)
    .nodePadding(10)
    .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]]);

    // generate sankey data
    const graph = sankey({nodes, links})

    // draw title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text(() => {
            const base = "Salary → Experience → Work Type"
            const additional = ` - ${appState.selectedCountryName}`
            return base + additional
        });

    // get color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // draw the links using the sankeyLink generator
    svg.append("g")
        .attr("fill", "none")
        .selectAll("path")
        .data(graph.links)
        .enter()
        .append("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke", d => color(d.source.id))
        .attr("stroke-width", d => Math.max(1, d.width))
        .attr("opacity", 0.6)

    // create a group for the nodes
    const node = svg.append("g")
        .selectAll("g")
        .data(graph.nodes)
        .enter().append("g")
        .attr("transform", d => `translate(${d.x0},${d.y0})`)

    // draw the nodes relative to where the group is placed
    node.append("rect")
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)
        .attr("fill", d => color(d.id))

    // add in text to label nodes
    node.append("text")
        .attr("x", d => (d.x1 - d.x0) + 6)
        .attr("y", d => (d.y1 - d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "start")
        .attr("font-size", "0.75rem")
        .text(d => d.id);
}

/**
 * Displays a map with countries color-coded by median salary.
 * Supports zoom and pan interactions and dynamic country labels.
 * 
 * @param {Object} params - The parameters for rendering the map.
 * @param {Array<Object>} params.mapData - Array of salary data objects, each containing a country code and salary info.
 * @param {Object} params.countryData - TopoJSON object containing country geometries and metadata.
 * @param {Map<string, string>} params.isoCodeToIdMap - Map from ISO 2-letter country codes to internal country IDs used in GeoJSON/TopoJSON.
 * @param {Map<string, string>} params.idToIsoCodeMap - Map from internal country IDs to ISO 2-letter country codes.
 * @param {Map<string, string>} params.isoCodeToNameMap - Map from ISO 2-letter country codes to full country names.
 */
function displayMap({ mapData, countryData, isoCodeToIdMap, idToIsoCodeMap, isoCodeToNameMap }) {
    const selectedId = isoCodeToIdMap[appState.selectedCountryIso2]

    // get map svg container and its width and height
    const svg = d3.select('#map-svg');
    const { width, height } = svg.node().getBoundingClientRect();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    // create margins
    const margin = { top: 120, right: 0, bottom: 120, left: 0 };
    const contentWidth = width - margin.left - margin.right;
    const contentHeight = height - margin.top - margin.bottom;

    // convert TopoJSON to GeoJSON for countries
    const countries = topojson.feature(countryData, countryData.objects.countries);

    // filter out Antarctica (since it's irrelevant in this map)
    countries.features = countries.features.filter(
        d => d.id !== 'ATA' && d.properties.name !== 'Antarctica'
    );

    // define projection for the map
    const projection = d3.geoMercator()
        .fitSize([contentWidth, contentHeight], countries);

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

    const countryMap = Object.fromEntries(countries.features.map((country) => [+country.id, country]))

    // store a graph where each country is a node and edges are made where people work remote for another country
    mapData.forEach((dataPoint) => {
        const company_country = dataPoint.country
        const employee_country = dataPoint.employee_country
        if (!countryMap[company_country]) {
            return
        }

        if (!countryMap[company_country].employee_countries) {
            countryMap[company_country].employee_countries = {}
        }

        if (!countryMap[company_country].employee_countries[employee_country]) {
            countryMap[company_country].employee_countries[employee_country] = 0
        }

        countryMap[company_country].employee_countries[employee_country]++
    })

    // compute median salary per country
    const countrySalaries = d3.rollup(
        mapData,
        values => d3.median(values, d => d.salary_in_usd),
        d => d.country
    );

    // define color scale based on median salary values
    const color = d3.scaleSequential()
        .domain(d3.extent(Array.from(countrySalaries.values())))
        .interpolator(d3.interpolateYlOrRd);

    const containerGroup = svg.append("g")
        .attr('transform', `translate(${margin.left}, ${margin.top})`)

    // create zoom group
    const mapGroup = containerGroup.append("g")

    // draw countries on the map
    mapGroup
        .selectAll("path")
        .data(countries.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", d => color(countrySalaries.get(+d.id)) ?? "#ddd")
        .attr("stroke", "black")
        .attr("stroke-width", 0.5)
        .style("opacity", d => !appState.selectedCountryIso2 || +d.id === isoCodeToIdMap[appState.selectedCountryIso2] ? 1 : 0.3)
        .on("click", (_, d) => {
            // when a country is clicked, check if there is data for the country
            // if there is no data, just set it back to global data
            if (!color(countrySalaries.get(+d.id))) {
                appState.selectedCountryIso2 = null;
                appState.selectedCountryName = "Global";
                appState.updateDashboard();
                return
            }

            // if re-selecting the same country, deselect it.
            const selectedCountryIso2 = isoCodeToIdMap[appState.selectedCountryIso2]
            if (selectedCountryIso2 === +d.id) {
                appState.selectedCountryIso2 = null;
                appState.selectedCountryName = "Global";
            } else {
                const isoCode = idToIsoCodeMap[+d.id];
                appState.selectedCountryIso2 = isoCode;
                appState.selectedCountryName = isoCodeToNameMap[isoCode];

            }

            // trigger re-render. Redraw everything because of filter change
            appState.updateDashboard();
         });

    // title for the map
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "1.5rem")
        .text(() => {
            const base = "Median Salary by Country (USD)"
            const additional = ` - ${appState.selectedCountryName}`
            return base + additional
        });

    // instructions for using the viz
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", margin.top / 2 + 24)
        .attr("text-anchor", "middle")
        .style("font-size", "1rem")
        .text("Zoom and pan enabled on the map. Clicking a colored country will select it. Click the country again to deselect.");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", margin.top / 2 + 24 * 2)
        .attr("text-anchor", "middle")
        .style("font-size", "1rem")
        .text("Clicking a country will show where its remote employees are located.");

    // create the legend
    const legendHeight = 20;
    const legendWidth = contentWidth / 2;

    const legendScale = d3.scaleLinear()
        .domain(color.domain())
        .range([0, legendWidth]);

    // add gradient for the legend
    const defs = svg.append("defs");

    const linearGradient = defs.append("linearGradient")
        .attr("id", "legend-gradient")
        .attr("x1", "0%").attr("y1", "100%")
        .attr("x2", "100%").attr("y2", "100%");

    const [min, max] = legendScale.domain();
    const mid = (min + max) / 2;

    linearGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", color(min));

    linearGradient.append("stop")
        .attr("offset", "50%")
        .attr("stop-color", color(mid));

    linearGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", color(max));

    // Add the legend rectangle with gradient fill
    svg.append("g")
        .attr("transform", `translate(${width - legendWidth - 20}, ${height - margin.bottom / 2})`)
        .append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient)");

    // Add the legend axis
    svg.append("g")
        .attr("transform", `translate(${width - legendWidth - 20}, ${height - margin.bottom / 2 + legendHeight})`)
        .call(d3.axisBottom(legendScale).ticks(6).tickFormat(d3.format("$.2s")));

    // util for generating arc path
    const generateArcPath = ([x1, y1], [x2, y2]) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.5; // control arc height
        return `M${x1},${y1} A${dr},${dr} 0 0,1 ${x2},${y2}`;
    }

    const countryConnections = Object.entries(countryMap[+selectedId]?.employee_countries || [])
        .map(([countryId, count]) => ({ countryId: +countryId, count }))
        .filter(({countryId}) => countryMap[countryId])

    // draw the arcs using dasharray and dashoffset to create a draw animation from country of origin to dest
    mapGroup.selectAll(".arrow")
        .data(countryConnections)
        .enter()
        .append("path")
        .attr("class", "arrow")
        .attr("d", d => {
            const from = countryMap[d.countryId].centroid;
            const to = countryMap[selectedId].centroid;
            return (from && to) ? generateArcPath(from, to) : null;
        })
        .attr("stroke", "steelblue")
        .attr("stroke-width", d => `${Math.min(5, 0.75 * d.count)}`)
        .attr("fill", "none")
        .attr("stroke-dasharray", function () {
            return this.getTotalLength();
        })
        .attr("stroke-dashoffset", function () {
            return this.getTotalLength();
        })
        .style("opacity", 0.8)
        .transition()
        .duration(1000)
        .attr("stroke-dashoffset", 0);

    // draw all country labels at the centroid of the largest polygon associated with the country
    // if not part of the selected country, then set the opacity lower to highlight the selected one
    // also, only show the text if the country drawn is big enough on the screen to prevent clutter
    // Note: drawing this text at the end so the arcs don't go over the country label
    mapGroup.selectAll("text")
        .data(countries.features, d => +d.id)   
        .enter()
        .append("text")
        .attr("x", d => {
            return isNaN(d.centroid[0]) ? 0 : d.centroid[0];
        })
        .attr("y", d => {
            return isNaN(d.centroid[1]) ? 0 : d.centroid[1];
        })
        .text(d => d.properties.name)
        .attr("fill", "black")
        .attr("font-size", `12px`)
        .attr("text-anchor", "middle")
        .attr("pointer-events", "none")
        .style("opacity", d => {
            const screenArea = path.area(d.largestPolygon);
            const displayOpacity = !appState.selectedCountryIso2 || +d.id === isoCodeToIdMap[appState.selectedCountryIso2] ? 1 : 0.3
            return screenArea > 1500 ? displayOpacity : 0;
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
        appState.mapTransformation = event.transform
        const zoomLevel = event.transform.k
        // keep font-size the same as we zoom in. Also, once the country is large enough on the screen, display label.
        // the incremental label display is to prevent visual clutter
        mapGroup.selectAll("text").data(countries.features, d => d.id)
            .attr("font-size", `${10 / zoomLevel}px`)
            .style("opacity", d => {
                const screenArea = path.area(d.largestPolygon) * zoomLevel * zoomLevel;
                const displayOpacity = !appState.selectedCountryIso2 || +d.id === isoCodeToIdMap[appState.selectedCountryIso2] ? 1 : 0.3
                return screenArea > 1500 ? displayOpacity : 0;
            });
    });

    // add zoom
    svg.call(zoom);
    svg.call(zoom.transform, appState.mapTransformation);
}