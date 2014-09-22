/*
 * Yelp reviews over changing n
 * @author: christopher c williams
 * @date:   2014-06
 */

// shared variables
var sliderHandle, sliderContainer, metaSVG, metaXMax, nBusinesses, nReviews;
var metaCumAvgs = []; // small multiples function populates with normalized data
var jsonFile = "data/filt-500-n-inf_yelp_academic_dataset_reviews.json";
//var jsonFile = "data/test_reviews.json"; // only 2 plots

//.............................................................................
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

// Brush listener to change axis in meta plot
function brushed() {
  var value = brush.extent()[0]; // min and max are equal when brush is slider

  if (d3.event.sourceEvent) { // if this is a mouse click / not programmatic
    var value = xBrush.invert( d3.mouse(this)[0] );
    brush.extent([value, value]);
  }

  // Update slider position, then update x axis and actual meta lines
  sliderHandle.attr("cx", xBrush(value));
  xMeta.domain([0, value]);

  metaSVG.select(".x.axis").call(xAxisMeta);
  metaSVG.selectAll(".norm-avg path")
    .attr("d", function(d) { return metaLine(d.normavg); });
}

// move lines to the front on meta hover for emphasis
d3.selection.prototype.moveToFront = function() {
  return this.each(function() {
    this.parentNode.appendChild(this); 
  });
}

//.............................................................................
// small multiple parameters 
var smNCutoff = null; // set to null if the x domain should be set for each plot
var margin = { top: 25, right: 45, bottom: 20, left: 35 },
    width  = 205 - margin.left - margin.right,
    height = 130 - margin.top  - margin.bottom;

var x = d3.scale.linear() // domain is small-multiple-specific
  .clamp(true)
  .range([0, width]);
  
var y = d3.scale.linear() // yelp = 0-5 stars, always
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

var line = d3.svg.line() // moving average line
  .x(function(d,i) { return x(i) + margin.left; })
  .y(function(d,i) { return y(d) + margin.top; });

//.............................................................................
// meta plot parameters, x domain will fit data
var metaM = { top: 20, right: 50, bottom: 40, left: 50 },
    metaW = 600 - metaM.left - metaM.right,
    metaH = 400 - metaM.top  - metaM.bottom;

var xMeta = d3.scale.linear()
  .clamp(true)
  .range([0,metaW]);

var yMeta = d3.scale.linear()
  .clamp(true)
  .domain([1.2,-1.2]) // by eye, nothing much outside this
  .range([0,metaH]);

var xAxisMeta = d3.svg.axis()
  .ticks(5)
  .tickFormat(d3.format(".0f"))
  .scale(xMeta)
  .orient("bottom");

var yAxisMeta = d3.svg.axis()
  .ticks(3)
  .tickFormat(d3.format(".0f"))
  .scale(yMeta)
  .orient("left");

var metaLine = d3.svg.line() // meta plot line
  .x(function(d,i) { return xMeta(i) + metaM.left; })
  .y(function(d,i) { return yMeta(d) + metaM.top; })

//.............................................................................
// brush parameters, domain will match xMeta
// will function as a slider, ala http://bl.ocks.org/mbostock/6452972
var brushH = 40;
var xBrush = d3.scale.linear()
  .clamp(true) // else can go out of bounds
  .range([0,metaW]);
  
var brush = d3.svg.brush() 
  .x(xBrush)
  .extent([0,0]) // start at 0; nb: extent 
  .on("brush", brushed);

//.............................................................................
// Chart functions
function makeMeta() { // constructs meta/normalized cum. average plot and slider

  // First make meta plot, then slider
  metaSVG.append("g") // x axis and label
    .attr("class", "x axis")
    .attr("transform", "translate(" + metaM.left + "," + (metaH + metaM.top) + ")")
    .call(xAxisMeta)
   .append("text")
    .attr("class", "x meta label")
    .style("text-anchor", "middle")
    .attr("x", metaW / 2)
    .attr("y", 35)
    .text("Cumulative number of reviews (control with slider)");

  metaSVG.append("g") // y axis and label
    .attr("class", "y axis")
    .attr("transform", "translate(" + metaM.left + "," + metaM.top + ")") 
    .call(yAxisMeta)
   .append("text")
    .attr("class", "y meta label")
    .style("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -(metaH / 2))
    .attr("y", -(metaM.left / 2))
    .text("Stars from mean rating");

  var meta = metaSVG.selectAll(".norm-avg") 
    .data(metaCumAvgs)
   .enter().append("g")
    .attr("class", "norm-avg")
    .on("mouseover", function(d) {
      d3.select(this).select("text").style("visibility", "visible");
      d3.select(this).select("path").style("stroke", function(d) { return d.fill; });
      d3.select(this).select("path").style("stroke-width", "4px");
      d3.select(this).style("opacity", 1);
      d3.select(this).moveToFront(); 
    })
    .on("mouseout", function(d) { 
      d3.select(this).select("text").style("visibility", "hidden");
      d3.select(this).select("path").style("stroke", "black");
      d3.select(this).select("path").style("stroke-width", "1.5px");
      d3.select(this).style("opacity", 0.6);
    })
    .on("click", function(d) { d.callback(); });

  meta.append("path") // actual line
    .attr("d", function(d) { return metaLine(d.normavg); });
  
  meta.append("text") // display toggled by event listeners defined on parent g^
    .attr("class", "meta label")
    .style("stroke", "none")
    .style("fill", function(d) { return d.fill; })
    .attr("visibility", "hidden")
    .style("text-anchor", "end")
    .attr("x", function(d) { return metaW + metaM.left; })
    .attr("y", function(d) { return metaH; })
    .text(function(d) { 
      return d.name + " (avg= " + d.avg + ", n= " + d.n + ")"; 
    });

  metaSVG.append("line") // zero line
    .attr("class", "line zero")
    .attr("y1", yMeta(0) + metaM.top)
    .attr("y2", yMeta(0) + metaM.top)
    .attr("x1", xMeta(0) + metaM.left)
    .attr("x2", xMeta(metaXMax) + metaM.left);
     
  metaSVG.append("text") // meta label
    .attr("class", "meta label title")
    .attr("x", metaW + metaM.left)
    .attr("y", 2*metaM.top)
    .style("text-anchor", "end")
    .text("Meta plot (" + nBusinesses + " businesses, " + nReviews + " reviews)");

  var sliderAxis = sliderContainer.append("g") // slider for x domain
    .attr("class", "slide x axis")
    .attr("transform", "translate(" + metaM.left + "," + brushH / 3 + ")")
    .call(
      d3.svg.axis().scale(xBrush)
        .orient("bottom").tickSize(0).ticks(4)
        .tickPadding(10)
    )
   .select(".domain")
   .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
    .attr("class", "scale slide");

  var slider = sliderContainer.append("g") 
    .attr("class", "slider")
    .attr("transform", "translate(" + metaM.left + ",0)")
    .call(brush);

  slider // brushes typically support extent and re-sizing, not used here
    .selectAll(".extent,.resize")
    .remove();

  slider.select(".background") // sliders have this attr by default
    .attr("height", brushH)

  sliderHandle = slider.append("circle")
    .attr("class", "sliderHandle")
    .attr("transform", "translate(0," + brushH / 3 + ")")
    .attr("cx", xBrush(metaXMax))
    .attr("r", 5);
  
  slider.call(brush.event) // sweet intro!
   .transition()
    .ease("cubic")
    .duration(5000)
    .call(brush.extent([metaXMax, metaXMax]))
    .call(brush.event);
}

function smallMultiple(d, i) { // creates a single small multiple chart
  var g = d3.select(this).append("g");
  var fill = color(i);

  if (smNCutoff == null) { 
    x.domain([0,d.values.length]); 
  }
  
  d.values.sort(function(a,b) { // for cumulative average
    return parseDate(a.date) - parseDate(b.date);
  });

  // Compute the average rating
  var avg = d3.mean(d.values, function(r) { return r.stars; });

  // Compute the moving average
  var mvAvg = cumAvg(d.values, function(r) { return r.stars; });
  
  // normalize and add to the global array
  // these object are used as data for the meta plot
  metaCumAvgs.push(
    { "normavg": mvAvg.map(function(d) { return d-avg; }),
      "name" : d.key,
      "avg"  : d3.round(avg,1),
      "n"    : d.values.length,
      "fill" : fill,
      "callback"   : (function() {
        // first move there on the page
        document.getElementById("multiple" + i).scrollIntoView(true);

        // now emphasize it by changing the background color (temporarily)
        var thisDiv = d3.select("#multiple" + i); // nb: this i matches the id's i
        var startBGColor = thisDiv.attr("background-color");
        thisDiv.transition()
          .duration(1000)
          .style("background-color", fill)
         .transition()
          .duration(3000)
          .style("background-color", startBGColor);
      })
    }
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

  g.append("text") // text to each small multiple
    .attr("class", "business-name label")
    .attr("x", (width / 2) + margin.left )
    .attr("y", 15)
    .style("text-anchor", "middle")
    .text(function(d) { return d.key; });
 
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

//.............................................................................
// load data asynchronously then make charts
d3.json(jsonFile, function(data) { 
  d3.select("div#loading").remove(); 
 
  // split data by business
  var businesses = d3.nest()
    .key(function(d) { return d.name; })
    .entries(data);
 
  metaSVG = d3.select("#vis").append("div") // meta is made after individuals
    .attr("class", "meta")
   .append("svg")
    .attr("width",  metaW + metaM.left + metaM.right)
    .attr("height", metaH + metaM.top  + metaM.bottom)
    .attr("transform", "translate(" + metaM.left + "," + metaM.top + ")");

  sliderContainer = d3.select("#vis").append("div")
    .attr("class", "slider-container")
   .append("svg")
    .attr("width",  metaW + metaM.left + metaM.right)
    .attr("height", brushH)
    .attr("transform", "translate(" + metaM.left + ",0)");
 
  var divs = d3.select("#vis").append("div") // 1 small multiple per business
    .attr("class", "small-multiple-container")
    .selectAll(".small-multiple")
    .data(businesses)
   .enter().append("div")
    .attr("class", "small-multiple")
    .attr("id", function(d,i) { return "multiple" + i; });

  var svgs = divs.append("svg")
    .attr("width",  width + margin.left + margin.right)
    .attr("height", height + margin.top  + margin.bottom)
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // update shared vars
  metaXMax = d3.max(businesses, function(d) { return d.values.length; }); 
  xMeta.domain([0, metaXMax]); // set domains
  xBrush.domain([0,metaXMax]);
  nBusinesses = businesses.length;
  nReviews    = data.length;
 
  svgs.each(smallMultiple);
  makeMeta(); // depends on data parsing in small multiples
});

