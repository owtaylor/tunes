#!/usr/bin/python3

from tunedb import TuneDB

import cgi
import http.cookies
import json
import os
import sys

from validation import validate_dict, ValidationError
import site_auth

STATUS_TEXTS = {
    400: "Bad Request",
    403: "Forbidden"
}


def raise_error(status, message):
    print("Status: %d %s" % (status, STATUS_TEXTS[status]))
    print("Content-Type: text/plain")
    print()
    print(message)
    sys.exit(1)


cookiedb = http.cookies.BaseCookie()
if 'HTTP_COOKIE' in os.environ:
    cookiedb.load(os.environ['HTTP_COOKIE'])

try:
    username = site_auth.check_auth_cookie(cookiedb)
except site_auth.AuthError:
    raise_error(403, "Not logged in")

form = cgi.FieldStorage()

if 'charset' not in form.type_options or \
        form.type_options['charset'].lower() not in ('utf8', 'utf-8'):
    raise_error(400, 'Only UTF-8 encoded form submissions are accepted')


def get_field(fieldname):
    res = form.getfirst(fieldname, "").strip()
    if res == "":
        return None
    elif isinstance(res, str):
        return res
    else:
        return res.decode('UTF-8')


action = get_field('action')
if action is None:
    action = 'update'
action = action.lower()

db = TuneDB()

if action == 'delete':
    tune_id = get_field('id')
    if tune_id is None:
        raise_error(400, "No ID specified")

    try:
        db.delete_tune(tune_id)
    except Exception as e:
        import traceback
        traceback.print_exc(None, sys.stderr)
        raise_error(400, str(e))

    print("Content-Type: text/plain")
    print()
    print(tune_id)
elif action == 'update':
    values = {
        'id': get_field('id'),
        'aka': get_field('aka'),
        'composer': get_field('composer'),
        'incipit': get_field('incipit'),
        'key': get_field('key'),
        'level': get_field('level'),
        'maxlevel': get_field('maxlevel'),
        'name': get_field('name'),
        'notes': get_field('notes'),
        'refs': get_field('refs'),
        'rhythm': get_field('rhythm'),
        'since': get_field('since'),
        'structure': get_field('structure'),
        'study': get_field('study')
    }

    to_delete = []
    for k, v in values.items():
        if v is None:
            to_delete.append(k)

    for k in to_delete:
        del values[k]

    try:
        validate_dict(values)
    except ValidationError as e:
        raise_error(400, str(e))

    # As a courtesy, we don't consider this validation, but just fix the maxlevel
    if ('maxlevel' not in values or int(values['level']) < int(values['maxlevel'])):
        values['maxlevel'] = values['level']

    try:
        if 'id' in values:
            tune_id = values['id']
            db.update_tune(tune_id, values)
        else:
            tune_id = db.insert_tune(values)
    except Exception as e:
        import traceback
        traceback.print_exc(None, sys.stderr)
        raise_error(400, str(e))

    new_values = db.query_tune(tune_id)

    print("Content-Type: text/plain")
    print()
    json.dump(new_values, sys.stdout)

db.close()
