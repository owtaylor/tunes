#!/usr/bin/python

from tunedb import TuneDB

import cgi
import cgitb
import Cookie
import os
import sys
import simplejson as json
import sqlite3 as sqlite

import config
from validation import validate_dict, ValidationError
import site_auth

# Turn on verbose exception handling
cgitb.enable()

cookiedb = Cookie.BaseCookie()
if 'HTTP_COOKIE' in os.environ:
    cookiedb.load(os.environ['HTTP_COOKIE'])

try:
    username = site_auth.check_auth_cookie(cookiedb)
except site_auth.AuthError:
    print "Status: 403 Forbidden"
    print "Content-Type: text/plain"
    print
    print "Not logged in"
    sys.exit(1)

conn = sqlite.connect(config.TUNES_DB)

form = cgi.FieldStorage()

def get_field(fieldname):
    res = form.getfirst(fieldname, "").strip()
    if res == "":
        return None
    else:
        return res

values = {
    'id' : get_field('id'),
    'aka' : get_field('aka'),
    'composer' : get_field('composer'),
    'incipit' : get_field('incipit'),
    'key' : get_field('key'),
    'level' : get_field('level'),
    'maxlevel' : get_field('maxlevel'),
    'name' : get_field('name'),
    'notes' : get_field('notes'),
    'refs' : get_field('refs'),
    'rhythm' : get_field('rhythm'),
    'since' : get_field('since'),
    'structure' : get_field('structure'),
    'study' : get_field('study')
};

to_delete = []
for k, v in values.iteritems():
    if v is None:
        to_delete.append(k)

for k in to_delete:
    del values[k]

try:
    validate_dict(values)
except ValidationError, e:
    print "Status: 400 Bad Request"
    print "Content-Type: text/plain"
    print
    print str(e)
    sys.exit(1)

db = TuneDB()

try:
    if 'id' in values:
        tune_id = values['id']
        db.update_tune(tune_id, values)
    else:
        tune_id = db.insert_tune(values)
except Exception, e:
    import traceback
    traceback.print_exc(None, sys.stderr)
    print "Status: 400 Bad Request"
    print "Content-Type: text/plain"
    print
    print str(e)
    sys.exit(1)

new_values = db.query_tune(tune_id)

print "Content-Type: text/plain"
print
json.dump(new_values, sys.stdout);
