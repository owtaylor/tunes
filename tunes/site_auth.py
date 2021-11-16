#!/usr/bin/python3

import hashlib
import hmac
import re
import time


from . import password_utils
from . import config


class AuthError(Exception):
    pass


site_secret = None

# For testing
_force_crypted_password = None


def get_site_secret():
    return password_utils.decode_128(config.SITE_SECRET)


def make_auth(username, t=None):
    if t is None:
        t = time.time()
    message = f"{username},{int(t)}"
    hm = hmac.new(get_site_secret(), message.encode("UTF-8"), hashlib.sha256)
    return message + "," + password_utils.encode_256(hm.digest())


def check_auth(auth):
    auth = auth.strip()

    m = re.match(r"([A-Za-z._]+),(\d+),.*", auth)
    if not m:
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

    if _force_crypted_password is not None:
        crypted = _force_crypted_password

    try:
        password_utils.check_password(crypted, pw)
    except password_utils.PasswordError as e:
        raise AuthError(str(e))

    cookiedb['tunes_auth'] = make_auth(username)
    cookiedb['tunes_auth']['path'] = config.BASE_URL
    cookiedb['tunes_auth']['max-age'] = 356 * 24 * 60 * 60  # One year


def check_auth_cookie(cookiedb):
    if 'tunes_auth' not in cookiedb:
        raise AuthError("No auth cookie")

    return check_auth(cookiedb['tunes_auth'].value)


if __name__ == '__main__':
    import http.cookies

    TEST_PASSWORD = "asdfa"

    _force_crypted_password = password_utils.crypt_password(TEST_PASSWORD)

    auth = make_auth(config.ADMIN_USERNAME)
    assert check_auth(auth) == config.ADMIN_USERNAME

    cookiedb = http.cookies.BaseCookie()
    set_auth_cookie(cookiedb, config.ADMIN_USERNAME, TEST_PASSWORD)

    assert check_auth_cookie(cookiedb) == config.ADMIN_USERNAME

    cookiedb['tunes_auth'] = cookiedb['tunes_auth'].value + "junk"
    failed = False
    try:
        check_auth_cookie(cookiedb)
    except AuthError:
        failed = True
    assert failed
