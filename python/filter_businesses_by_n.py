#!/usr/bin/env python 
info="""This program filters yelp academic dataset review json objects based
        on a cutoff for the number of reviews the business must have received.
        It expects two separte json files: one for business type objects, and 
        one for review type objects.

        Additionally, when filtering reviews, it converts the business ID
        to a business name
     """

__author__ = "ccwilliams"
__date__   = "2014-06-19"

import re
import argparse

RE_BUSINESS_ID   = '"business_id": "(.*?)"' # *? = NOT greedy
RE_BUSINESS_NAME = '"name": "(.*?)"'
RE_REVIEW_CT     = '"review_count": ([\d]*),'
RE_REVIEW_FILT   = '.*("stars":.*"date":.*?"),'

#...............................................................................
#   Define input arguments 
prsr = argparse.ArgumentParser(description=info) 
prsr.add_argument("businesses",
                  help="yelp json file with business review counts, and IDs")
prsr.add_argument("reviews",
                  help="The input review json file to be parsed")
prsr.add_argument("-n", type=int, default=20,
                  help="The minimum number of reviews a business must have"\
                       "for their reviews not to be filtered")

# TODO: add option to log actual #reviews/business ascending to see min cts

#...............................................................................
def main():
    valid_businesses = {}

    f_businesses  = open(args.businesses, "r")
    f_reviews     = open(args.reviews,    "r")
    f_reviews_out = open("filt-%i_%s" % (args.n, args.reviews), "w")

    # collect valid businesses
    ct_businesses = 0
    for business in f_businesses.readlines(): # big file
        review_ct = re.findall(RE_REVIEW_CT, business)

        # Take first value if match
        if len(review_ct) > 0 and int(review_ct[0]) >= args.n:
            new_id = re.findall(RE_BUSINESS_ID, business)[0]
            valid_businesses[new_id] = re.findall(RE_BUSINESS_NAME, business)[0]

        ct_businesses += 1
        
    print "%i/%i businesses met n >= %i criteria" % \
            (len(valid_businesses), ct_businesses, args.n)

    # filter reviews by valid businesses
    review_ct_written, review_ct_total = 0, 0
    f_reviews_out.write("[")
    
    for review in f_reviews.readlines():
        review_ct_total += 1
        business_id = re.findall(RE_BUSINESS_ID, review)
        if len(business_id) > 0 and business_id[0] in valid_businesses:
            review_min  = ",\n" if review_ct_written > 0 else ""
            review_min += '{ %s, "name": "%s" }' % \
                    ( re.findall(RE_REVIEW_FILT, review)[0], 
                      valid_businesses[ business_id[0] ] )

            f_reviews_out.write(review_min)
            review_ct_written += 1

    f_reviews_out.write("]")

    f_businesses.close()
    f_reviews.close()
    f_reviews_out.close()

    print "%i/%i reviews met n >= %i criteria, written to %s" % \
            (review_ct_written, review_ct_total, args.n, f_reviews_out.name)

if __name__ == "__main__":
    args   = prsr.parse_args()
    main()
