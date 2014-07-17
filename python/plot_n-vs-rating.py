#!/usr/bin/env python
info="""Plots a 2D-histogram or scatter plot of yelp ratings versus n, using 
        yelp academic data set json
     """

__author__ = "ccwilliams"
__date__   = "2014-07-16"

import json
import argparse
import numpy as np
import matplotlib.pyplot as plt

KEY_N      = "review_count"
KEY_RATING = "stars"

#...............................................................................
#   Input args

prsr = argparse.ArgumentParser(description=info)
prsr.add_argument("businesses",
                  help="yelp json file with business review counts, and IDs")
prsr.add_argument("outbase", type=str,
                  help="The base name (including dir else pwd) of the plot")
prsr.add_argument("-s", "--scatter", action="store_true",
                  help="If specified, makes a scatter plot instead of a heatmap")
prsr.add_argument("-nbins", "--n_bins", type=int, default=15,
                  help="The number of bins for n values")
prsr.add_argument("-rbins", "--rating_bins", type=int, default=10,
                  help="The number of bins for rating/star values")
prsr.add_argument("-n", type=int,
                  help="If specified, draws a vertical line at the specified n")
prsr.add_argument("-l","--log", action="store_true",
                  help="If specified and a scatter plot is being made, uses a"\
                       " log scale for n")
#...............................................................................
#   helpers

def get_n_and_ratings(json_businesses):
    """Returns lists of n and ratings, with matched indices
       @param json_businesses
       @return list_n, list_ratings
    """
    n, ratings = [], [] 
    
    for biz in json_businesses:
        n.append( biz[KEY_N] )
        ratings.append( biz[KEY_RATING] )

    print "%i businesses parsed" % len(json_businesses)
    return n, ratings

def jitter(data, stdev=0.05):
    """Jitters data for use in overlapping points
    """
    return data + np.random.randn(len(data)) * stdev

def make_scatter(n, ratings):
    """Makes a scatter plot of n vs ratings
    """
    # File name
    vline   = "_cutoff-%s" % args.n if args.n else ""
    log     = "_log" if args.log else ""
    outfile = args.outbase + "_scatter_n-vs-rating%s%s.pdf" % \
              (vline, log)
   
    fig, ax  = plt.subplots()  
    ax.scatter(n, jitter(ratings), color="#e34a33", alpha=0.3)
   
    if args.log:
        ax.set_xscale("log")
        
    ax.set_xlim([0,np.max(n)])
    ax.set_ylim([0,5.5])

    ax.set_xlabel("Number of reviews (n)")
    ax.set_ylabel("Average rating (stars)")

    if args.n: # vline if specified
        plt.axvline(args.n, color="black", linestyle="--")
        ax.text(args.n + 50, 0.5, "cutoff", fontweight="bold") 

    fig.savefig(outfile)

    print "Scatter plot made at \n%s" % outfile 
    return

def make_heatmap(n, ratings):
    """Makes a 2d histogram of n vs ratings
    """
    # File name 
    vline   = "_cutoff-%s" % args.n if args.n else ""
    bins    = "_nbin-%i_rbin-%i" % (args.n_bins, args.rating_bins)
    outfile = args.outbase + "_heatmap_n-vs-rating%s%s.pdf" % (vline, bins)
    
    # Bin points
    heatmap, n_edges, rating_edges = \
        np.histogram2d(n, ratings, bins=(args.n_bins, args.rating_bins))

    heatmap = np.log10(heatmap + 1) # log space to see full spectrum
    extent  = [n_edges[0], n_edges[-1], 0, rating_edges[-1]]
       
    # plot 
    fig, ax  = plt.subplots()
    img      = ax.imshow(heatmap.T, extent=extent, aspect="auto", origin="lower", 
                         cmap="RdBu") 
    cbar     = plt.colorbar(img, ticks=[0,1,2,3])
    cbar.set_ticklabels([0,1000,2000,3000]) # easier to read 
    cbar.set_label("# businesses")
    ax.set_xlabel("Number of reviews (n)")
    ax.set_ylabel("Average rating (stars)")

    if args.n: # vline if specified
        plt.axvline(args.n, color="white", linestyle="--")
        ax.text(args.n + 50, 0.5, "cutoff", color="white", fontweight="bold") 
 
    fig.savefig(outfile)

    print "2D histogram made at \n%s" % outfile 
    return

#...............................................................................
#   main

def main():
    # Get data 
    print "Parsing json from %s" % args.businesses 
    f_businesses  = open(args.businesses, "r")
    n, ratings = get_n_and_ratings( json.loads( f_businesses.read() ) )
    
    # Plot   
    if args.scatter:
        make_scatter(n, ratings)
    else:
        make_heatmap(n, ratings)
    

if __name__ == "__main__":
    args = prsr.parse_args()
    main()
