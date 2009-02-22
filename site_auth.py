#!/usr/bin/python

import config
import hmac
import password_utils
import re
import sha
import time

class AuthError(Exception):
    pass

site_secret = None

# For testing
_force_crypted_password = None

def get_site_secret():
    f = open(config.SITE_SECRET, "r")
    secret = password_utils.decode_128(f.read().strip())
    f.close()

    return secret

def make_auth(username, t=None):
    if t == None:
        t = time.time()
    message = "%s,%d" % (username, t)
    hm = hmac.new(get_site_secret(), message, sha.new)
    return message + "," +  password_utils.encode_160(hm.digest())

def check_auth(auth):
    auth = auth.strip()

    m = re.match("([A-Za-z._]+),(\d+),.*", auth)
    if (m == None):
        raise AuthError("Bad format for auth cookie")

    username = m.group(1)

    # Validate username against current "user database"
    if (username != config.ADMIN_USERNAME):
        raise AuthError("Unknown user in auth cookie")

    # Could check timestamp here for expiration
    expected = make_auth(username, t=int(m.group(2)))
    if (expected != auth):
        raise AuthError("Invalid auth cookie")

    return username

def set_auth_cookie(cookiedb, username, pw):
    if (username != config.ADMIN_USERNAME):
        raise AuthError("Unknown user")

    crypted = config.ADMIN_PASSWORD

    if _force_crypted_password != None:
        crypted = _force_crypted_password

    try:
        password_utils.check_password(crypted, pw)
    except password_utils.PasswordError, e:
        raise AuthError(str(e))

    cookiedb['tunes_auth'] = make_auth(username)
    cookiedb['tunes_auth']['path'] = config.BASE_URL
    cookiedb['tunes_auth']['max-age'] = 356 * 24 * 60 * 60 # One year

def check_auth_cookie(cookiedb):
    if not 'tunes_auth' in cookiedb:
        raise AuthError("No auth cookie")

    return check_auth(cookiedb['tunes_auth'].value)

if __name__ == '__main__':
    import Cookie

    TEST_PASSWORD = "asdfa"

    _force_crypted_password = password_utils.crypt_password(TEST_PASSWORD)

    auth = make_auth(config.ADMIN_USERNAME)
    assert check_auth(auth) == config.ADMIN_USERNAME

    cookiedb = Cookie.BaseCookie()
    set_auth_cookie(cookiedb, config.ADMIN_USERNAME, TEST_PASSWORD)

    assert check_auth_cookie(cookiedb) == config.ADMIN_USERNAME

    cookiedb['tunes_auth'] = cookiedb['tunes_auth'].value + "junk"
    failed = False
    try:
        check_auth_cookie(cookiedb)
    except AuthError, e:
        failed = True
    assert failed
