import appState from '../appState.js';
import { 
    convertIdToName
} from '../utils/convertCountryCode.js';
import { addDisplayUpdateStep } from '../utils/updateDisplay.js';

export default function displayBarChart(selectedCountry) {
    const { disasterData } = appState.data;

    const selectedCountryName = convertIdToName(selectedCountry);

    //grab svg
    const svg = d3.select('#bar-chart-svg');
    const { width, height } = svg.node().getBoundingClientRect();
    svg.attr('viewBox', `0 0 ${width} ${height}`);
    
    console.log('Bar chart dimensions:', width, 'x', height);

    const margin = { top: 30, right: 100, bottom: 60, left: 50 };
    const contentWidth = width - margin.left - margin.right;
    const contentHeight = height - margin.top - margin.bottom;

    //clear and redraw every time
    svg.selectAll('*').remove();

    //filter for selected country
    let countryDisasterData = [];
    if (selectedCountry && disasterData) {
        //potential multiple ways to match country
        countryDisasterData = disasterData.filter(d => 
            d.Country === selectedCountryName ||
            d.country === selectedCountryName ||
            String(d.ISO) === String(selectedCountry) ||
            String(d.ISO3) === String(selectedCountry) ||
            String(d.id) === String(selectedCountry)
        );
    }
    
    //defaults to world data
    if (!countryDisasterData || countryDisasterData.length === 0) {
        countryDisasterData = disasterData || [];
        console.log('Using world disaster data:', countryDisasterData.length, 'records');
    } else {
        console.log('Found disaster records for', selectedCountryName, ':', countryDisasterData.length);
    }

    //process into year ranges
    function processDisasterData(rawData) {
        if (!rawData || rawData.length === 0) {
            console.log('No disaster data to process');
            return [];
        }

        console.log('Processing', rawData.length, 'disaster records');
        console.log('Sample record:', rawData[0]);
        console.log('All field names in sample record:', Object.keys(rawData[0]));
        
        const numericFields = {};
        Object.keys(rawData[0]).forEach(key => {
            const value = rawData[0][key];
            if (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)))) {
                numericFields[key] = value;
            }
        });
        console.log('Numeric fields (potential cost fields):', numericFields);

        //5 year ranges
        const getYearRange = (year) => {
            const rangeStart = Math.floor(year / 5) * 5;
            return `${rangeStart}-${rangeStart + 4}`;
        };

        //extract years and groups
        const processedData = new Map();
        let recordsProcessed = 0;
        let recordsWithValidYear = 0;
        let recordsWithValidCost = 0;
        
        rawData.forEach((disaster, index) => {
            recordsProcessed++;
            
            let year = null;
            const yearFields = ['Start Year', 'End Year', 'Year', 'year']; // Start Year is the main field
            
            for (let field of yearFields) {
                if (disaster[field]) {
                    if (typeof disaster[field] === 'number') {
                        year = disaster[field];
                        break;
                    } else if (typeof disaster[field] === 'string') {
                        const yearMatch = disaster[field].match(/\b(19|20)\d{2}\b/);
                        if (yearMatch) {
                            year = parseInt(yearMatch[0]);
                            break;
                        }
                    }
                }
            }

            if (!year || year < 1950 || year > 2030) {
                if (index < 5) console.log(`Record ${index}: Invalid year`, year, 'from fields:', yearFields.map(f => disaster[f]));
                return;
            }
            
            recordsWithValidYear++;
            if (index < 5) console.log(`Record ${index}: Valid year ${year}`);

            const yearRange = getYearRange(year);
            
            if (!processedData.has(yearRange)) {
                processedData.set(yearRange, {
                    year: yearRange,
                    earthquake: 0,
                    drought: 0,
                    hurricane: 0,
                    flood: 0,
                    wildfire: 0,
                    tornado: 0,
                    winter_storm: 0
                });
            }

            const rangeData = processedData.get(yearRange);

            //get disaster type and cost
            const disasterType = String(disaster['Disaster Type'] || disaster.disaster_type || disaster.Type || '').toLowerCase();
            
            //try to get cost from the correct field names in your data
            let cost = 0;
            const costFields = [
                "Total Damage, Adjusted ('000 US$)", // Inflation-adjusted (preferred)
                "Total Damage ('000 US$)",           // Original value
                "Reconstruction Costs, Adjusted ('000 US$)",
                "Reconstruction Costs ('000 US$)",
                "Insured Damage, Adjusted ('000 US$)",
                "Insured Damage ('000 US$)"
            ];
            
            for (let field of costFields) {
                if (disaster[field] && !isNaN(parseFloat(disaster[field]))) {
                    cost = parseFloat(disaster[field]);
                    if (index < 5) console.log(`Record ${index}: Found cost ${cost} in field "${field}"`);
                    break;
                }
            }

            if (cost > 0) {
                recordsWithValidCost++;
                
                //convert costs from thousands to billions
                let costInBillions;
                if (cost > 0) {
                    costInBillions = cost / 1000000; //convert from thousands to billions
                } else {
                    costInBillions = 0;
                }

                if (index < 5) console.log(`Record ${index}: Cost ${cost} -> ${costInBillions}B, Type: ${disasterType}`);

                //categorize disasters
                if (disasterType.includes('earthquake')) rangeData.earthquake += costInBillions;
                else if (disasterType.includes('drought')) rangeData.drought += costInBillions;
                else if (disasterType.includes('hurricane') || disasterType.includes('cyclone') || disasterType.includes('typhoon')) rangeData.hurricane += costInBillions;
                else if (disasterType.includes('flood')) rangeData.flood += costInBillions;
                else if (disasterType.includes('fire') || disasterType.includes('wildfire')) rangeData.wildfire += costInBillions;
                else if (disasterType.includes('tornado')) rangeData.tornado += costInBillions;
                else if (disasterType.includes('storm') || disasterType.includes('winter')) rangeData.winter_storm += costInBillions;
            }
        });

        console.log(`Processing summary: ${recordsProcessed} total, ${recordsWithValidYear} with valid years, ${recordsWithValidCost} with valid costs`);

        //convert to array and sort by year range
        const result = Array.from(processedData.values()).sort((a, b) => {
            const aStart = parseInt(a.year.split('-')[0]);
            const bStart = parseInt(b.year.split('-')[0]);
            return aStart - bStart;
        });

        console.log('Final processed data:', result);
        result.forEach(yearData => {
            const total = Object.keys(yearData).filter(k => k !== 'year').reduce((sum, k) => sum + yearData[k], 0);
        });

        return result;
    }

    //process the actual disaster data
    const processedData = processDisasterData(countryDisasterData);
    
    //return blank chart if nothing
    if (!processedData || processedData.length === 0 || processedData.every(d => {
        const total = Object.keys(d).filter(k => k !== 'year').reduce((sum, k) => sum + d[k], 0);
        return total === 0;
    })) {
        return; // Just return, leaving the chart blank
    }

    console.log('Using real disaster data for:', selectedCountryName || 'World', processedData);

    // Disaster types
    const disasterTypes = [
        { key: 'hurricane', name: 'Hurricane', color: '#e74c3c' },
        { key: 'drought', name: 'Drought', color: '#f39c12' },
        { key: 'wildfire', name: 'Wildfire', color: '#e67e22' },
        { key: 'winter_storm', name: 'Winter Storm', color: '#3498db' },
        { key: 'flood', name: 'Flood', color: '#9b59b6' },
        { key: 'tornado', name: 'Tornado', color: '#1abc9c' },
        { key: 'earthquake', name: 'Earthquake', color: '#34495e' }
    ];

    //prepare stacked data using real processed data
    const keys = disasterTypes.map(d => d.key);
    const stack = d3.stack().keys(keys);
    const stackedData = stack(processedData);

    console.log('Stacked data prepared, layers:', stackedData.length);

    //create scales using real processed data
    const xScale = d3.scaleBand()
        .domain(processedData.map(d => d.year))
        .range([margin.left, width - margin.right])
        .padding(0.4);

    const maxValue = d3.max(stackedData[stackedData.length - 1], d => d[1]);
    const yScale = d3.scaleLinear()
        .domain([0, maxValue])
        .range([height - margin.bottom, margin.top]);

    const colorScale = d3.scaleOrdinal()
        .domain(keys)
        .range(disasterTypes.map(d => d.color));

    console.log('Scales created, max value:', maxValue);

    // add axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale).tickFormat(d => `${d}B`);

    svg.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(xAxis)
        .attr('class', 'x-axis')
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .style("font-size", "10px");

    svg.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(yAxis)
        .attr('class', 'y-axis')
        .style("font-size", "10px");

    console.log('Axes added');

    // Create stacked bars
    const layers = svg.selectAll('.layer')
        .data(stackedData)
        .enter()
        .append('g')
        .attr('class', 'layer')
        .attr('fill', d => colorScale(d.key));

    layers.selectAll('rect')
        .data(d => d)
        .enter()
        .append('rect')
        .attr('x', d => xScale(d.data.year))
        .attr('y', d => yScale(d[1]))
        .attr('height', d => yScale(d[0]) - yScale(d[1]))
        .attr('width', xScale.bandwidth());

    console.log('Bars created');

    // Add title with country name (same pattern as line chart)
    svg.append('text')
        .attr('class', 'chart-title')
        .attr('text-anchor', 'middle')
        .attr('x', width / 2)
        .attr('y', margin.top - 10)
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .text(`${selectedCountryName || 'World'} - Disaster Costs by Year Range`);

    // Add axis labels (same pattern as line chart)
    svg.append('text')
        .attr('class', 'x-label')
        .attr('text-anchor', 'middle')
        .attr('x', width / 2)
        .attr('y', height - 10)
        .style('font-size', '10px')
        .text('Year Range');

    svg.append('text')
        .attr('class', 'y-label')
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', 20)
        .style('font-size', '10px')
        .text('Damage Cost (Billions USD)');

    // Add legend
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - margin.right + 10}, ${margin.top + 20})`);

    const legendItems = legend.selectAll('.legend-item')
        .data(disasterTypes)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${i * 16})`);

    legendItems.append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', d => d.color);

    legendItems.append('text')
        .attr('x', 16)
        .attr('y', 6)
        .attr('dy', '0.35em')
        .style('font-size', '9px')
        .text(d => d.name);

    console.log('Legend added');
    console.log('Bar chart completed successfully!');
}

addDisplayUpdateStep(() => {
    displayBarChart(appState.selectedCountry);
});