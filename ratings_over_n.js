var jsonFile = "data/filt-500_yelp_academic_dataset_reviews.json";
//var jsonFile = "data/test_reviews.json";

// Helper functions
var parseDate = d3.time.format("%Y-%m-%d").parse;
var color = d3.scale.category20();

// Compute cumulative moving average (ref http://bit.ly/1pststH)
function cumAvg(sortedObjs, accessor) {
  return sortedObjs.reduce(
      function(avgs, currObj, i) {
        if (i == 1) { 
          return [ accessor(currObj) ];
        } else {
          var lastAvg = avgs[i - 2]; // idxs in reduce are 1-based
          avgs.push( lastAvg + ( (accessor(currObj) - lastAvg) / i) );
          return avgs;
        }
      });
}
                 
// Sizes of small multiples
var margin = { top: 20, right: 20, bottom: 20, left: 20 },
    width  = 200 - margin.left - margin.right,
    height = 150 - margin.top  - margin.bottom;
  
// x-scale, domain is small-multiple-specific
var x = d3.scale.linear()
  .range([0, width]);

// y-scale matched for all small multiples
var y = d3.scale.linear()
  .domain([5,0])
  .range([0,height]);

// xAxis
var xAxis = d3.svg.axis()
  .scale(x)
  .ticks(2)
  .orient("bottom");

var yAxis = d3.svg.axis()
  .tickValues([0, 1, 2, 3, 4, 5])
  .tickFormat(d3.format(".0f"))
  .scale(y)
  .orient("left");

// The moving average line
var line = d3.svg.line()
  .x(function(d,i) { return x(i) + margin.left; })
  .y(function(d,i) { return y(d) + margin.top; });

// Small mulitple chart (re-usable), creates single chart
function smallMultiple(d, i) {
  var g = d3.select(this)
    .append("g");

  x.domain([0,d.values.length])
  
  // Sort ratings by date, for moving average below
  d.values.sort(function(a,b) {
    return parseDate(a.date) - parseDate(b.date);
  });

  // Compute the average rating
  var avg   = d3.mean(d.values, function(r) { return r.stars; });
  console.log(avg);

  // Compute the moving average
  var mvAvg = cumAvg(d.values, function(r) { return r.stars; });

  // Compute histogram of counts
  var hist  = d3.layout.histogram()
    .bins([0,1,2,3,4,5])
    .value(function(d) { return d.stars; })
    (d.values);

  // Make the histograms, rotated 90 deg CW from 'normal'
  var fill = color(i);
  var bar = g.selectAll(".bar")
    .data(hist)
   .enter().append("g")
    .attr("class", "bar")
    .attr("fill", fill)
    .attr("transform", 
          function(d) { return "translate(0," +  y(1 + d.x) + ")"; });
  
  var rect = bar.append("rect")
    .attr("x", margin.left)
    .attr("y", margin.top)
    .attr("width",  function(d) { return x(d.y + 1);  } ) // +1 for 0 cts
    .attr("height", function(d) { return y(5-d.dx); } );

  // Average rating line
  g.append("line")
    .attr("class", "line avg")
    .attr("y1", y(avg) + margin.top)
    .attr("y2", y(avg) + margin.top)
    .attr("x1", x(0) + margin.left)
    .attr("x2", x(d.values.length) + margin.left);

  // Average itself
  g.append("text")
    .attr("class", "avg-val")
    .attr("text-anchor", "start")
    .attr("x", width + margin.left + 1)
    .attr("y", y(avg - 0.1) + margin.top)
    .text( d3.round(avg,1) )
   
  // Moving average line
  g.append("path")
    .datum(mvAvg)
    .attr("class", "line mvavg")
    .attr("d", line);

  // Axes
  g.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(" + margin.left + "," + (margin.top + height) + ")")
    .call(xAxis);
 
  g.append("g")
    .attr("class", "y axis")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
    .call(yAxis);
}

// Load data asynchronously then make chart
d3.json(jsonFile, function(data) {
  d3.select("div#loading").remove(); // data is loaded

  // Split data by business
  var businesses = d3.nest()
    .key(function(d) { return d.name; })
    .entries(data)

  // Bind business data to an <div><svg></svg></div>, one for each business
  var divs = d3.select("#vis")
    .selectAll(".small-multiple")
    .data(businesses)
   .enter()
    .append("div")
    .attr("class", "small-multiple")

  var svgs = divs.append("svg")
    .attr("width",  width + margin.left + margin.right)
    .attr("height", height + margin.top  + margin.bottom)
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  svgs.each(smallMultiple);
     
   
  svgs.append("text")
    .attr("class", "name-label")
    .attr("x", width )
    .attr("y", 10)
    .style("text-anchor", "end")
    .text(function(d) { return d.key; });
  
});

