import re


class ValidationError(RuntimeError):
    pass


RHYTHMS = set([
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
    if not re.match(r"\d+$", v):
        raise ValidationError(f"Bad id '{v}'")


def validate_key(v):
    if not re.match(r"[ABCDEFG][b#]?(maj|min|mix|dor)$", v):
        raise ValidationError(f"Bad key '{v}'")


def validate_rhythm(v):
    if v not in RHYTHMS:
        raise ValidationError(f"Bad rhythm '{v}'")


def validate_since(v):
    if not re.match(r"<?\d\d\d\d$", v):
        raise ValidationError(f"Bad since '{v}'")


def validate_structure(v):
    if not re.match(r"[A-Z]+$", v):
        raise ValidationError(f"Bad structure '{v}'")


def validate_study(v):
    if v != '1' and v != '0':
        raise ValidationError(f"Bad study '{v}'")


def validate_level(v):
    if not re.match(r"[12345]$", v):
        raise ValidationError(f"Bad level '{v}'")


MANDATORY = ['key', 'level', 'name', 'rhythm']

VALIDATORS = {
    'aka': [],
    'composer': [],
    'id': [validate_id],
    'incipit': [],
    'key': [validate_key],
    'level': [validate_level],
    'maxlevel': [validate_level],
    'name': [],
    'notes': [],
    'refs': [],
    'rhythm': [validate_rhythm],
    'since': [validate_since],
    'structure': [validate_structure],
    'study': [validate_study]
}


def validate_key_value(k, v):
    if k not in VALIDATORS:
        raise ValidationError(f"Bad key '{k}'")

    for validator in VALIDATORS[k]:
        validator(v)


def validate_mandatory(d):
    for k in MANDATORY:
        if k not in d:
            raise ValidationError(f"Missing mandatory key '{k}'")


def validate_dict(d):
    for (k, v) in d.items():
        validate_key_value(k, v)

    validate_mandatory(d)
