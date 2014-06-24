var jsonFile = "data/filt-500_yelp_academic_dataset_reviews.json";
//var jsonFile = "data/test_reviews.json"; // only 2 plots

// Helper functions
var parseDate = d3.time.format("%Y-%m-%d").parse;
var color     = d3.scale.category20();

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

// Small multiple parameters 
var smNCutoff = 150; // set to null if the x domain should be set for each
var margin = { top: 20, right: 40, bottom: 20, left: 30 },
    width  = 220 - margin.left - margin.right,
    height = 150 - margin.top  - margin.bottom;

var x = d3.scale.linear() // domain is small-multiple-specific
  .clamp(true)
  .domain([0, 300])
  .range([0, width]);

var y = d3.scale.linear() // yelp = 1-5 stars, always)
  .domain([5,0])
  .range([0,height]);

var xAxis = d3.svg.axis()
  .scale(x)
  .ticks(2)
  .orient("bottom");

var yAxis = d3.svg.axis()
  .tickValues([0, 1, 2, 3, 4, 5])
  .tickFormat(d3.format(".0f"))
  .scale(y)
  .orient("left");

// meta plot parameters, domains will fit data
var metaNCutoff = 300; // n > this value are filtered for the meta plot
var metaM = { top: 20, right: 50, bottom: 50, left: 50 },
    metaW = 450 - metaM.left - metaM.right,
    metaH = 250 - metaM.top  - metaM.bottom;

var xMeta = d3.scale.linear()
  .domain([0,metaNCutoff])
  .range([0,metaW]);

var yMeta = d3.scale.linear()
  .clamp(true)
  .domain([-1,1])
  .range([0,metaH]);

var xAxisMeta = d3.svg.axis()
  .ticks(5)
  .tickFormat(d3.format(".0f"))
  .scale(xMeta)
  .orient("bottom");

var yAxisMeta = d3.svg.axis()
  .ticks(2)
  .tickFormat(d3.format(".0f"))
  .scale(yMeta)
  .orient("left");

// for meta plot, each small multiple adds it's cumAvg over increasing n
var metaCumAvgs = [];

// The moving average line
var line = d3.svg.line()
  .x(function(d,i) { return x(i) + margin.left; })
  .y(function(d,i) { return y(d) + margin.top; });

var metaLine = d3.svg.line()
  .x(function(d,i) { return xMeta(i) + metaM.left; })
  .y(function(d,i) { return yMeta(d) + metaM.top; })

d3.json(jsonFile, function(data) { // load data asynchronously then make chart
  d3.select("div#loading").remove(); 
 
  var metaSVG = d3.select("#vis").append("div") // meta is made after individuals
    .attr("class", "meta")
   .append("svg")
    .attr("width",  metaW + metaM.left + metaM.right)
    .attr("height", metaH + metaM.top  + metaM.bottom)
    .attr("transform", "translate(" + metaM.left + "," + metaM.top + ")");

  // split data by business
  var businesses = d3.nest()
    .key(function(d) { return d.name; })
    .entries(data)

  // each business gets its own small multiple
  var divs = d3.select("#vis").append("div")
    .attr("class", "small-multiple-container")
    .selectAll(".small-multiple")
    .data(businesses)
   .enter().append("div")
    .attr("class", "small-multiple")

  var svgs = divs.append("svg")
    .attr("width",  width + margin.left + margin.right)
    .attr("height", height + margin.top  + margin.bottom)
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  svgs.each(smallMultiple);
     
  svgs.append("text") // text to each small multiple
    .attr("class", "name-label")
    .attr("x", (width / 2) + margin.left )
    .attr("y", 15)
    .style("text-anchor", "middle")
    .text(function(d) { return d.key; });
  
  // Construct meta plot
  //metaCumAvgs = metaCumAvgs.filter(function(d) { return d.x < metaNCutoff; });
  //xMeta.domain([1, d3.max(metaCumAvgs, function(d) { return d.x + 1; }) ]);
  
  metaSVG.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(" + metaM.left + "," + (metaH + metaM.top) + ")")
    .call(xAxisMeta)
   .append("text")
    .attr("class", "x meta-label")
    .style("text-anchor", "middle")
    .attr("x", metaW / 2)
    .attr("y", 30)
    .text("Cumulative number of reviews");

  metaSVG.append("g")
    .attr("class", "y axis")
    .attr("transform", "translate(" + metaM.left + "," + metaM.top + ")") 
    .call(yAxisMeta)
   .append("text")
    .attr("class", "y meta-label")
    .style("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -(metaH / 2))
    .attr("y", -(metaM.left / 2))
    .text("Stars from mean rating");

  metaSVG.append("g")
    .selectAll(".meta-line")
    .data(metaCumAvgs)
   .enter().append("path")
    .attr("class", "meta-line")
    .attr("d", metaLine);
  

  /*
  metaSVG.append("g")
    .selectAll(".meta-dot")
    .data(metaCumAvgs)
   .enter().append("circle")
    .attr("class", "meta-dot")
    .attr("r", 1)
    .attr("cx", function(d)   { return xMeta(d.x + 1) + metaM.left; })
    .attr("cy", function(d)   { return yMeta(d.y) + metaM.top; })
    .attr("fill", function(d) { return d.fill; });
*/ 
  metaSVG.append("line")
    .attr("class", "line zero")
    .attr("y1", yMeta(0) + metaM.top)
    .attr("y2", yMeta(0) + metaM.top)
    .attr("x1", xMeta(0) + metaM.left)
    .attr("x2", xMeta(metaNCutoff) + metaM.left);
     
  metaSVG.append("text")
    .attr("class", "meta-title")
    .attr("x", metaW + metaM.left)
    .attr("y", metaM.top)
    .style("text-anchor", "end")
    .text("Meta plot (" + businesses.length + " stores, " + data.length + " reviews)");
});

function smallMultiple(d, i) { // creates a single small multiple chart
  var g = d3.select(this)
    .append("g");

  var fill = color(i);
  if (smNCutoff == null) { 
    x.domain([0,d.values.length]); 
  }
  
  // Sort ratings by date, for moving average below
  d.values.sort(function(a,b) {
    return parseDate(a.date) - parseDate(b.date);
  });

  // Compute the average rating
  var avg = d3.mean(d.values, function(r) { return r.stars; });

  // Compute the moving average, normalize and add to the global array
  var mvAvg = cumAvg(d.values, function(r) { return r.stars; });
/*  mvAvg.forEach( function(d, i) { 
    metaCumAvgs.push( { "x": i, "y": (d-avg), "fill": fill } ); 
  } );
*/
   
  metaCumAvgs.push(
    mvAvg.slice(0, metaNCutoff).map(function(d) { return d-avg; })
  );

  var hist  = d3.layout.histogram()     // compute star counts
    .bins([0,1.01,2.01,3.01,4.01,5.01]) // offset for intuitive binning
    .value(function(d) { return d.stars; })
    (d.values);

  var bar = g.selectAll(".bar") // histograms rotated 90 deg CW, display n on mouseover
    .data(hist)
   .enter().append("g")
    .attr("class", "bar")
    .attr("fill", fill)
    .attr("transform", 
          function(d) { return "translate(0," +  y(1 + d.x) + ")"; })
    .on("mouseover", 
        function(d) { d3.select(this).select("text").style("visibility", "visible") })
    .on("mouseout", 
        function(d) { d3.select(this).select("text").style("visibility", "hidden") }) 
  
  var rect = bar.append("rect")
    .attr("x", margin.left)
    .attr("y", margin.top)
    .attr("width",  function(d) { return x(d.y + 1);  } ) // +1 for 0 cts
    .attr("height", function(d) { return y(5-d.dx); } );

  var cts = bar.append("text") // display histogram count on mouseover
    .attr("class", "n-ct")
    .attr("visibility", "hidden")
    .attr("x", function(d) { return x(d.y) + margin.left + 5; })
    .attr("y", function(d) { return y(5-d.dx)/2 + margin.top + 2; })
    .text(function(d) { return "n=" + d.y; });

  g.append("line") // average rating line
    .attr("class", "line avg")
    .attr("y1", y(avg) + margin.top)
    .attr("y2", y(avg) + margin.top)
    .attr("x1", x(0) + margin.left)
    .attr("x2", x(d.values.length) + margin.left);

  g.append("text") // average value itself  
    .attr("class", "avg-val")
    .attr("text-anchor", "start")
    .attr("x", width + margin.left + 2)
    .attr("y", y(avg - 0.1) + margin.top)
    .text( d3.round(avg,1) + " avg");
   
  g.append("path") // moving average line
    .datum(mvAvg)
    .attr("class", "line mvavg")
    .attr("d", line);

  // Axes
  g.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(" + margin.left + "," + (margin.top + height) + ")")
    .call(xAxis)
   .append("text")
    .attr("class", "x label")
    .attr("x", width)
    .attr("y", -5)
    .style("text-anchor", "end")
    .text("Cumulative n");

  g.append("g")
    .attr("class", "y axis")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
    .call(yAxis)
   .append("text")
    .attr("class", "y label")
    .attr("transform", "rotate(-90)")
    .attr("x", -(height / 2))
    .attr("y", -(margin.left / 1.5))
    .style("text-anchor", "middle")
    .text("Stars");
}


