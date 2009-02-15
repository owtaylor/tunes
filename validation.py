import re

class ValidationError(RuntimeError):
    pass

RHYTHMS=set([
        'air',
        'barn dance',
        'fling',
        'highland',
        'hornpipe',
        'jig',
        'march',
        'mazurka',
        'piece',
        'polka',
        'reel',
        'schottiche',
        'set dance',
        'slide',
        'slip jig',
        'set dance',
        'strathspey',
        'waltz'
        ])

def validate_id(v):
    if not re.match("\d+$", v):
        raise ValidationError("Bad id '%s'" % v)

def validate_key(v):
    if not re.match("[ABCDEFG][b#]?(maj|min|mix|dor)$", v):
        raise ValidationError("Bad key '%s'" % v)

def validate_rhythm(v):
    if not v in RHYTHMS:
        raise ValidationError("Bad rhythm '%s'" % v)

def validate_since(v):
    if not re.match("<?\d\d\d\d$", v):
        raise ValidationError("Bad since '%s'" % v)

def validate_structure(v):
    if not re.match("[A-Z]+$", v):
        raise ValidationError("Bad structure '%s'" % v)

def validate_study(v):
    if v != '1' and v != '0':
        raise ValidationError("Bad study '%s'" % v)

def validate_level(v):
    if not re.match("[12345]$", v):
        raise ValidationError("Bad level '%s'" % v)

MANDATORY = ['key', 'level', 'name', 'rhythm' ]

VALIDATORS = {
    'aka' : [],
    'composer' : [],
    'id' : [validate_id],
    'incipit' : [],
    'key' : [validate_key],
    'level' : [validate_level],
    'maxlevel' : [validate_level],
    'name' : [],
    'notes' : [],
    'refs' : [],
    'rhythm' : [validate_rhythm],
    'since' : [validate_since],
    'structure' : [validate_structure],
    'study' : [validate_study]
}

def validate_key_value(k, v):
    if k not in VALIDATORS:
        raise ValidationError("Bad key '%s'"% k)

    for validator in VALIDATORS[k]:
        validator(v)

def validate_mandatory(d):
    for k in MANDATORY:
        if not k in d:
            raise ValidationError("Missing mandatory key '%s'" % k)

def validate_dict(d):
    for (k,v) in d.iteritems():
        validate_key_value(k,v)

    validate_mandatory(d)
