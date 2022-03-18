class Timeline {

  /**
   * Class constructor with initial configuration
   * @param {Object}
   * @param {Array}
   */
  constructor(_config, _data) {
    this.config = {
      parentElement: _config.parentElement,
      disasterCategories: _config.disasterCategories,
      containerWidth: 800,
      containerHeight: 900,
      tooltipPadding: 15,
      margin: {top: 120, right: 20, bottom: 20, left: 45},
      legendWidth: 170,
      legendHeight: 8,
      legendRadius: 5,
      colorScale: _config.colorScale
    }
    this.data = _data;
    this.selectedCategories = [];
    this.filteredData = [];
    this.maxYear = Math.max(...this.data.map(a => a.year))
    this.highestCostPerYearMap = _config.highestCostPerYearMap
    this.initVis();
  }
  /**
   * We initialize the arc generator, scales, axes, and append static elements
   */
  initVis() {
    let vis = this;

    // Calculate inner chart size. Margin specifies the space around the actual chart.
    vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
    vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

    // Todo: Initialize scales and axes
    vis.yScale = d3.scaleBand()
      .domain(
        new Set(this.data.map(a => a.year).sort((a, b) =>  b - a ))
      )
      .range([0, vis.height])
    vis.xScale = d3.scaleTime().domain([new Date(this.maxYear, 0, 1), new Date(this.maxYear, 11, 31)]).range([0, vis.width])

    vis.xAxis = d3.axisTop(vis.xScale)
      .tickSize(10)
      .tickPadding(8)
      .tickFormat(d3.timeFormat("%b"))

    vis.yAxis = d3.axisLeft(vis.yScale)
      .tickSize(-vis.width)
      .tickPadding(8)
      .tickFormat(d3.format("d"));

    // Initialize arc generator that we use to create the SVG path for the half circles. 
    vis.radiusScale = d3.scaleSqrt()
      .domain([d3.min(vis.data, (d) => d.cost), d3.max(vis.data, (d) => d.cost)])
      .range([4, 140])

    vis.arcGenerator = d3.arc()
        .outerRadius(d => vis.radiusScale(d))
        .innerRadius(0)
        .startAngle(-Math.PI / 2)
        .endAngle(Math.PI / 2);

    // Define size of SVG drawing area
    vis.svg = d3.select(vis.config.parentElement).append('svg')
        .attr('width', vis.config.containerWidth)
        .attr('height', vis.config.containerHeight)
        .attr('id', 'chart');

    // Append group element that will contain our actual chart 
    // and position it according to the given margin config
    vis.chartArea = vis.svg.append('g')
        .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

    // Todo: Append axis groups
    // Append x-axis group
    vis.xAxisG = vis.chartArea.append('g')
    // Append y-axis group
    vis.yAxisG = vis.chartArea.append('g')


    // Initialize clipping mask that covers the whole chart
    vis.chartArea.append('defs')
      .append('clipPath')
        .attr('id', 'chart-mask')
      .append('rect')
        .attr('width', vis.width)
        .attr('y', -vis.config.margin.top)
        .attr('height', vis.config.containerHeight);

    // Apply clipping mask to 'vis.chart' to clip semicircles at the very beginning and end of a year
    vis.chart = vis.chartArea.append('g')
        .attr('clip-path', 'url(#chart-mask)');

    // Optional: other static elements
    // ...
    
    vis.updateVis();
  }

  /**
   * Prepare the data and scales before we render it.
   */
  updateVis() {
    let vis = this;
    // Displat only data from selected categories
    vis.filteredData = vis.data.filter(d => vis.selectedCategories.includes(d.category))
    vis.renderVis();
  }

  /**
   * Bind data to visual elements (enter-update-exit) and update axes
   */
  renderVis() {
    let vis = this;
    
    // If not filter selected, display all data
    if (vis.selectedCategories.length == 0) {
      vis.filteredData = vis.data
    }

    // render circles
    const circles = vis.chart.selectAll('path')
      .data(vis.filteredData)
      .join('path')
      .attr('d', (d) => vis.arcGenerator(d.cost))
      .attr('transform', d => {
        const date = new Date(d.mid)
        const diff = vis.maxYear - date.getFullYear()
        const xPos = vis.xScale(new Date(date.getFullYear() + diff, date.getMonth(), date.getDate()))
        const yPos = vis.yScale(d.year) + 10
        return `translate(${xPos},${yPos})`
      })
      .attr('fill', d => vis.config.colorScale(d.category))
      .attr('class', 'mark')


    circles.on('mouseover', (event, d) => {
      d3.select('#tooltip')
        .style('display', 'block')
        .style('top', `${(event.pageY + vis.config.tooltipPadding)}px`)
        .style('left', `${(event.pageX + vis.config.tooltipPadding)}px`)
        .html(`
              <div class='title'>${d.name}</div>
              <div>${d.cost} Billion</div>
            `);
    })
      .on('mouseleave', () => {
        d3.select('#tooltip').style('display', 'none');
      });

    // render axis
    vis.xAxisG.call(vis.xAxis)
      .call(g => g.select('.domain')
      .remove())
    vis.yAxisG.call(vis.yAxis)
      .call(g => g.select('.domain')
      .remove())

    // render labels
    this.renderCostliestLabel();
    // render legend
    this.renderLegend();
  }

  renderLegend() {
    let vis = this;
    const aggregated = d3.rollups(
      vis.data,
      (v) => v.length,
      (d) => d.category
    )

    vis.config.disasterCategories = Array.from(aggregated, ([category]) => ({
      category
    }))

    vis.svg.selectAll('.legendPoint')
      .data(vis.config.disasterCategories)
      .join('circle')
      .attr('class', 'mark')
      .attr('r', vis.config.legendRadius)
      .attr('cx', 10)
      .attr('cy', (d, i) => (i*14)+10)
      .attr('fill', d => vis.config.colorScale(d.category))
      .on('click', (e,d) => this.handleClick(d))

    vis.svg.selectAll('.legendPoints')
      .data(vis.config.disasterCategories)
      .join('text')
      .text((d) => this.mapCategory(d.category))
      .attr('x', 20)
      .attr('y', (d, i) => (i+1) * 14)
      .style('font-size', '12px')
      .attr('fill', (d) => vis.selectedCategories.includes(d.category) ? "black" : "grey")
      .on('click', (e,d) => this.handleClick(d))
    
    // Todo: Display the disaster category legend that also serves as an interactive filter.
    // You can add the legend also to `index.html` instead and have your event listener in `main.js`.
  }

  handleClick = (d) => {
    let vis = this
    if (vis.selectedCategories.includes(d.category)) {
      vis.selectedCategories = vis.selectedCategories.filter(f => f !== d.category);
    } else {
      vis.selectedCategories.push(d.category)
    }
    vis.updateVis()
  }

  mapCategory = (category) => {
    switch(category){
      case 'winter-storm-freeze':
        return "Winter storms, freezing"
      case 'drought-wildfire':
        return "Drought and wildfire"
      case 'flooding':
        return "Flooding"
      case 'tropical-cyclone':
        return "Tropical cyclones"
      case 'severe-storm':
        return "Severe storms"
      default:
        return ""
    }
  }

  renderCostliestLabel = () => {
    let vis = this
    let eventsToLabel = []
    for(let i = 0; i < vis.filteredData.length; i++) {
      const entry = vis.filteredData[i]
      if((entry.cost) == vis.highestCostPerYearMap[entry.year]) {
        eventsToLabel.push(entry)
      }
    }
    vis.chart.selectAll('text')
        .data(eventsToLabel)
        .join('text')
        .attr('transform', d => {
          const curr = new Date(d.element.mid)
          const diff = this.maxYear - curr.getFullYear()
          const xPos = vis.xScale(new Date(curr.getFullYear() + diff, curr.getMonth(), curr.getDate()))
          const yPos = vis.yScale(d.year) + 20
          return "translate(" + xPos + "," + yPos + ")"
        })
        .attr('text-anchor', 'middle')
        .text(d => d.element.name)
        .attr('fill', 'grey')
        .style('font-size', '10px')
  }
}

