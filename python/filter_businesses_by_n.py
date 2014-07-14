#!/usr/bin/env python 
info="""This program filters yelp academic dataset review json objects based
        on a cutoff for the number of reviews the business must have received.
        It expects two separte json files: one for business type objects, and 
        one for review type objects.

        Additionally, when filtering reviews, it converts the business ID
        to a business name. If the scramble option is specified, the name is
        scrambled
     """

__author__ = "ccwilliams"
__date__   = "2014-06-19"

import os
import json
import random
import argparse
import datetime as dt

REVIEW_KEYS = set( ["stars", "date"] ) # will add name manually

#...............................................................................
#   Define input arguments 
prsr = argparse.ArgumentParser(description=info) 
prsr.add_argument("businesses",
                  help="yelp json file with business review counts, and IDs")
prsr.add_argument("reviews",
                  help="The input review json file to be parsed")
prsr.add_argument("-min", "--n_min", type=int, default=50,
                  help="The minimum number of reviews a business must have"\
                       "for their reviews not to be filtered")
prsr.add_argument("-max", "--n_max", type=float, default=float("Inf"),
                  help="The maximum number of reviews a business can have"\
                       "for their reviews not to be filtered")
prsr.add_argument("-s", "--scramble", action="store_true",
                  help="If this option is specified, business names will be "\
                       "scrambled")
prsr.add_argument("-t", "--tests_only", action="store_true",
                  help="If this option is specified, only unit tests executed")

#...............................................................................
# Helper functions
def filter_businesses(json_businesses, min_reviews, max_reviews):
    """Counts the number of unique businesses parsed and filters any not within 
       the defined. Returns a dict mapping filtered business ids to business 
       names

       @param json_businesses business data in json, expects each business to 
                              have "business_id", "name", and "review_count" 
                              keys
       @param n_min           businesses with fewer reviews than this are filt
       @param n_max           businesses with more reviews than this are filt
       @return { business_id : business_name , ... }
    """
    valid_businesses = {}
    
    for biz in json_businesses:
        if biz["review_count"] >= min_reviews and \
           biz["review_count"] <= max_reviews:

            valid_businesses[ biz["business_id"] ] = biz["name"]

    print "%i/%i businesses met %.0f <= n <= %.0f criteria" % \
        (len(valid_businesses), len(json_businesses), min_reviews, max_reviews)

    return valid_businesses

def filter_reviews(reviews_json, filt_businesses, scramble):
    """Filters reviews for businesses which met count criteria, whose IDs are 
       passed in. 
       keys
    """
    filt_reviews  = []
    biz_scrambled = {} # for consistent name scrambling

    for review in reviews_json: 
        business_id = review["business_id"]

        if business_id in filt_businesses:
            business      = filt_businesses[business_id]    
            not_scrambled = business
            
            if scramble: # map consistently to the scrambled name
                if biz_scrambled.has_key( not_scrambled ):
                    business = biz_scrambled[not_scrambled]   
                else: # new key
                    business = \
                        "".join( random.sample(not_scrambled, len(not_scrambled)) )
                    biz_scrambled[ not_scrambled ] = business
        
            filt_review = { key : review[key] for key in REVIEW_KEYS }
            filt_review["name"] = business 
            filt_reviews.append( filt_review ) # [{}, {}, ...]

    print "%i / %i reviews of valid businesses" % \
        (len(filt_reviews), len(reviews_json))

    return filt_reviews

def write_reviews(fh_out, filt_reviews):
    """Writes filtered reviews out to an open file handle object in json, 
       in the utf-8 encoding for space.

       @param fh_out        Open file handle to which to write
       @param filt_reviews  json-like object which will be dumped to file
       @return 
    """
    with fh_out as outfile: # utf-8 not ascii for file size
                            # http://stackoverflow.com/a/14870531/1933266
        json.dump(filt_reviews, outfile)

    print "reviews written to %s" % fh_out.name
    return

def main():
    start = dt.datetime.now() # speed

    os.chdir( os.getcwd() ) # make files in local dir
    outname = "filt-%.0f-n-%.0f%s_%s" % \
        (args.n_min, args.n_max, 
         "_name-scramble" if args.scramble else "", args.reviews)
        
    f_businesses  = open(args.businesses, "r") # open files
    f_reviews     = open(args.reviews,    "r")
    f_reviews_out = open(outname,         "w")

    # filter businesses based on n reviews, then filter reviews on those
    # businesses and write to file
    filt_businesses = filter_businesses(json.loads( f_businesses.read() ),
                                        args.n_min, args.n_max)
    filt_reviews    = filter_reviews(json.loads( f_reviews.read() ),
                                     filt_businesses, args.scramble)
    write_reviews(f_reviews_out, filt_reviews) 

    f_businesses.close() # close files!
    f_reviews.close()
    f_reviews_out.close()

    stop = dt.datetime.now() 
    print "Done in %.fs" % (stop -start).seconds

def test_all():
    test_filt_businesses()
    test_filt_reviews()
    print "\nall tests passed ..."
    return

def setup_businesses():
    biz = [ {"business_id":1, "review_count":1, "name":"one"},
            {"business_id":2, "review_count":2, "name":"two"},
            {"business_id":3, "review_count":3, "name":"three"} ]
    return biz

def setup_reviews():
    rev = [ { "business_id":1, "empty_key":"", "date":1, "stars": 1 },
            { "business_id":2, "empty_key":"", "date":2, "stars": 2 },
            { "business_id":3, "empty_key":"", "date":3, "stars": 3} ]
    return rev

def test_filt_businesses():
    bizs = setup_businesses()
    b1   = filter_businesses(bizs, 0, 5)
    b2   = filter_businesses(bizs, 5, 0)
    b3   = filter_businesses(bizs, 3, 4)
    b4   = filter_businesses(bizs, 3, 3)
    b5   = filter_businesses(bizs, 5, 9)
   
    assert b1 == { biz["business_id"]: biz["name"] for biz in bizs }
    assert b2 == { }
    assert b3 == { 3:"three" }
    assert b4 == { 3:"three" }
    assert b5 == { }

    print "filt_businesses passed ...\n"
    
def test_filt_reviews():
    rev = setup_reviews()
    bizs = setup_businesses()
    biz_dict = { biz["business_id"]: biz["name"] for biz in bizs }
    
    r1  = filter_reviews(rev, { 1: "one",   2: "two" }, False)
    r2  = filter_reviews(rev, { 3: "three", 2: "two" }, False)
    r3  = filter_reviews(rev, { 2: "two"  }, False)
    r4  = filter_reviews(rev, { 2: "two"  }, True)
    r5  = filter_reviews(rev, { 5: "five" }, False)
    r6  = filter_reviews(rev, { }, False)

    assert (r1 == [ {"name": "one", "date": 1, "stars": 1},
                    {"name": "two",   "date": 2, "stars": 2} ] ) or \
           (r1 == [ {"name": "two",   "date": 2, "stars": 2},
                    {"name": "one", "date": 1, "stars": 1} ] )
    assert (r2 == [ {"name": "three", "date": 3, "stars": 3},
                    {"name": "two",   "date": 2, "stars": 2} ] ) or \
           (r2 == [ {"name": "two",   "date": 2, "stars": 2},
                    { "name": "three", "date": 3, "stars": 3} ] )
    assert r3 == [ {"name": "two",   "date": 2, "stars": 2} ]
    assert set(r4[0]["name"])  == set("two") # scramble  
    assert r5 == [ ]
    assert r6 == [ ]
    
    print "filt_reviews passed ...\n"

if __name__ == "__main__": # if script, tests or program
    args   = prsr.parse_args()
    if args.tests_only:
        test_all()
    else:
        main()
