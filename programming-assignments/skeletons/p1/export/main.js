// Initialize helper function to convert date strings to date objects
const parseTime = d3.timeParse("%Y-%m-%d");

const colorScale = d3.scaleOrdinal()
      .range(['#ccc', '#ffffd9', '#41b6c4','#081d58', '#c7e9b4'])
      .domain(['winter-storm-freeze', 'drought-wildfire', 'flooding', 'tropical-cyclone', 'severe-storm']);

//Load data from CSV file asynchronously and render chart
d3.csv('data/disaster_costs.csv').then(data => {
  data.forEach(d => {
    d.cost = +d.cost;
    d.year = +d.year;
    d.date = parseTime(d.mid);
    // Optional: other data preprocessing steps
  });

  // todo: finish this
  let highestCostPerYearMap = new Map();
  data.forEach((d) => {
    const year = d.year;
    highestCostPerYearMap[year] = Math.max(d.cost, highestCostPerYearMap[year] | 0)
  })


  
  const timeline = new Timeline({
    parentElement: '#vis',
    // Optional: other configurations
    colorScale,
    highestCostPerYearMap
  }, data);
});