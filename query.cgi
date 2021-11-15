#!/usr/bin/python3

import calendar
import cgi
import json
import os
import re
import sys
import time

import config
from tunedb import TuneDB

def do_query(db, ref=None, tune_id=None):
    first = True
    sys.stdout.write("[")
    for values in db.query_tunes(ref=ref, tune_id=tune_id):
        if not first:
            sys.stdout.write(",\n")
        else:
            first = False

        json.dump(values, sys.stdout);
    sys.stdout.write("]\n")

# Adapted from http://stackoverflow.com/questions/225086/rfc-1123-date-representation-in-python
def format_http_date(t):
    """Return a string representation of a date according to RFC 1123
    (HTTP/1.1).
    """

    dt = time.gmtime(t)

    weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][dt.tm_wday]
    month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep",
             "Oct", "Nov", "Dec"][dt.tm_mon - 1]
    return "%s, %02d %s %04d %02d:%02d:%02d GMT" % (weekday, dt.tm_mday, month,
                                                    dt.tm_year, dt.tm_hour, dt.tm_min, dt.tm_sec)

def parse_http_date(datestr):
    # Something like Sun, 01 Feb 2009 22:24:12 GMT
    if not re.search(r"\s+GMT\s*$", datestr):
        return None
    datestr = re.sub(r"\s+GMT\s*$", "", datestr)

    try:
        dt = time.strptime(datestr, "%a, %d %b %Y %H:%M:%S")
    except ValueError:
        return None

    return calendar.timegm(dt)

form = cgi.FieldStorage()

def get_field(fieldname):
    res = form.getfirst(fieldname, "").strip()
    if res == "":
        return None
    else:
        return res

ref = get_field('ref');
tune_id = get_field('id')

s = os.stat(config.TUNES_DB)
last_modified = s.st_mtime

# For testing ease, include this script in the modified time
s = os.stat(sys.argv[0])
if s.st_mtime > last_modified:
    last_modified = s.st_mtime

# mod_cgi has some handling of last_modified, but that's going to happen after
# we do the query, so we handle If-Modified-Since ourselves for optimium
# responsiveness
if 'HTTP_IF_MODIFIED_SINCE' in os.environ:
    if_modified_since = parse_http_date(os.environ['HTTP_IF_MODIFIED_SINCE'])
    if if_modified_since != None and if_modified_since >= last_modified:
        print("Last-Modified: " + format_http_date(last_modified))
        print("Status: 304 Not Modified")
        print()
        sys.exit(0)

db = TuneDB()

print("Content-Type: text/plain")
print("Last-Modified: " + format_http_date(last_modified))
print()

do_query(db, ref=ref, tune_id=tune_id)
db.close()
