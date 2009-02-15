#!/usr/bin/python

import simplejson as json
import sqlite3 as sqlite
import re
import sys

from validation import ValidationError, validate_key_value, validate_mandatory

have_error = False
tunes = []

KEY_START = "(?:$|(?:,\s*|\s+)(?:(?:ng|ts|(?:hn[a-z]+))\d+|[a-z]+:))"

def compile_re(s):
    return re.compile(s % {
            'key_start' : KEY_START
            }, re.VERBOSE)

TUNE_SPEC = compile_re(r"""
([*+~,x])\s+
(.*?)
(%(key_start)s.*)
""")

KEY_SPEC = compile_re(r"""
\s*,?\s*
(?:
notes:\s*(.*?)\s*$
|
([a-z]+):\s*(.*?)\s*(?=%(key_start)s)
|
((?:ng|ts|hn(?:[a-z]+))\d+)\s*
)

""")

class ParseError(RuntimeError):
    pass

LEVELS = {
    '*' : 1,
    '+' : 2,
    '~' : 3,
    ',' : 4,
    'x' : 5
}


def iter_keys(s):
    pos = 0
    while pos < len(s):
        m = KEY_SPEC.match(s, pos)
        if m == None:
            raise ParseError("Can't parse key at: %s"  % (s[pos:],))
        if m.group(1) != None:
            k,v = ('notes', m.group(1))
        elif m.group(2) != None:
            k,v = (m.group(2), m.group(3))
        else:
            k,v = ('refs', m.group(4))

        validate_key_value(k, v);

        yield k,v

        pos = m.end()

def update_defaults(s, defaults):
    for (k,v) in iter_keys(s):
        defaults[k] = v

def validate_name(title):
    if re.search(r"\Waka", title, re.IGNORECASE):
        raise ParseError("title '%s' contains aka" % (title,))

def parse_tune(s, defaults):
    m = TUNE_SPEC.match(s)
    if not m:
        raise ParseError("Bad tune line")
    validate_name(m.group(2))
    keys = dict(defaults)
    keys['name'] = m.group(2)
    keys['level'] = LEVELS[m.group(1)]
    for (k,v) in iter_keys(m.group(3)):
        if k == 'refs':
            if 'refs' in keys:
                keys['refs'] += ' ' + v
            else:
                keys['refs'] = v
        else:
            if k in keys:
                raise ValidationError("duplicate key '%s'", key)
            else:
                keys[k] = v

    validate_mandatory(keys);
    tunes.append(keys)

def read_tunes_from_file(filename):
    defaults = {}
    f = open(filename)
    lineno = 0
    for line in f:
        line = line.decode('UTF-8')
        lineno += 1
        line = line.strip()
        try:
            if line == "":
                continue
            if line[0] == ":":
                update_defaults(line[1:], defaults)
            elif line[0] in "*+~,x":
                parse_tune(line, defaults)
            else:
                raise ParseError("Unrecognized line")
        except ParseError, e:
            print >>sys.stderr, "%s:%d: %s" % (filename, lineno, e)
            have_error = True
        except ValidationError, e:
            print >>sys.stderr, "%s:%d: %s" % (filename, lineno, e)
            have_error = True
    f.close()

# This sorts into "import order", so that the arbitrary integer IDs are a little
# more meaningful
def compare_tunes(a, b):
    if 'since' in a:
        if not 'since' in b:
            return -1
        sa = a['since']
        sb = b['since']
        if sa[0] == '<':
            sa = int(sa[1:]) - 0.5
        else:
            sa = int(sa)
        if sb[0] == '<':
            sb = int(sb[1:]) - 0.5
        else:
            sb = int(sb)

        if sa != sb:
            return cmp(sa, sb)
    elif 'since' in b:
        return 1

    rhythma = a['rhythm'].lower()
    rhythmb = b['rhythm'].lower()

    if rhythma != rhythmb:
        return cmp(rhythma,rhythmb)

    namea = a['name'].lower()
    nameb = b['name'].lower()

    if namea != nameb:
        return cmp(namea,nameb)

    return 0

def store_tunes(conn):
    cursor = conn.cursor()

    for tune in tunes:
        values = dict(tune)
        for key in ('aka', 'composer', 'incipit', 'maxlevel', 'notes', 'refs', 'since', 'structure', 'study'):
            if not key in values:
                values[key] = None

        cursor.execute(r"""
INSERT INTO Tune
    ( aka,  composer,  incipit,  key,  level,  maxlevel,  name,  notes,  refs,  rhythm,  since,  structure,  study)
VALUES
    (:aka, :composer, :incipit, :key, :level, :maxlevel, :name, :notes, :refs, :rhythm, :since, :structure, :study);
""", values)
    conn.commit()
    cursor.close()

output = None
i = 1
while i < len(sys.argv):
    filename = sys.argv[i]
    if filename == '-o':
        i += 1
        output = sys.argv[i]
    else:
        read_tunes_from_file(filename)
    i += 1

if have_error:
    sys.exit(1)

tunes.sort(compare_tunes)

if output != None:
    conn = sqlite.connect(output)
    store_tunes(conn)
    conn.close()
else:
    for tune in tunes:
        print json.dumps(tune)
