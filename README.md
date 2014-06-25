yelp-ratings-over-n
===================
learning d3 in the context of the yelp academic datase. see live [here](http://williaster.com/yelp).

**features**:
* [small multiple pattern, using selection.each()](http://bl.ocks.org/mbostock/9490313)
* [brush as a slider](http://bl.ocks.org/mbostock/6452972)
* transitions for brush intro, small multiple emphasis
* misc. javascript (e.g., scroll to small multiple, move meta plot lines to top of DOM, etc.)


I was interested in the number of Yelp reviews necessary before an average rating accurately reflects the **stabilized** average rating. Using Yelp's [academic dataset](https://www.yelp.com/academic_dataset) I filtered for businesses which had **&gt;500 reviews** and looked at cumulative averages as review counts increased. 


Each line in the meta plot represents a single business and illustrates how its rating has changed as a function of reviews, compared to the eventual **stabilized** rating. Hover over a line for summary information and a link to that business's histogram. The slider below the plot controls the upper limit for number of reviews for better exploration.


In general, the ratings stabilize with more reviews but it's rare that an average review is ever more than one star away from the eventual **stabilized** rating. The data also show that initial reviews are slightly skewed toward higher ratings compared to the **stabilized** rating.
