import hashlib
from base64 import b64encode, b64decode
import re


class PasswordError(Exception):
    pass


# The quality of crypting here doesn't *really* matter, since we aren't
# storing a database of public passwords, but use scrypt so that we model
# decent practices.


def encode_128(inval: bytes) -> str:
    assert len(inval) == 16
    # Strip off two padding ==
    return b64encode(inval, b"+_")[:-2].decode("UTF-8")


def decode_128(inval: str) -> bytes:
    assert len(inval) == 22
    return b64decode(inval + "==", b"+_")


def encode_256(inval: bytes) -> str:
    assert len(inval) == 32
    # Strip off padding =
    return b64encode(inval, b"+_")[:-1].decode("UTF-8")


def decode_256(inval: bytes) -> str:
    assert len(inval) == 43
    return b64decode(inval + "=", b"+_")


def random_bytes(len) -> bytes:
    f = open("/dev/urandom", "rb")
    r = f.read(len)
    f.close()

    return r


# scrypt parameters - this is about as large as you can use with the
# default max_mem, but isn't particularly strong.
N = 16384
R = 8
P = 1


def crypt_password(pw):
    salt = random_bytes(16)
    crypted = hashlib.scrypt(pw.encode("UTF-8"), salt=salt, n=N, r=R, p=P)
    return f"{N}${R}${P}${encode_128(salt)}${encode_256(crypted[:32])}"


def check_password(crypted, pw):
    if len(pw) > 32:
        raise PasswordError("Password too long")

    m = re.match(r"(\d+)\$(\d+)\$(\d+)\$([^\$]+)\$([^\$]+)$", crypted)
    if not m:
        raise PasswordError("Crypted password not in expected format")

    n = int(m.group(1))
    r = int(m.group(2))
    p = int(m.group(3))
    salt = decode_128(m.group(4))
    expected = decode_256(m.group(5))
    crypted = hashlib.scrypt(pw.encode("UTF-8"), salt=salt, n=n, r=r, p=p)
    if crypted[:32] != expected:
        raise PasswordError("Password doesn't match")


if __name__ == '__main__':
    pw = "Apple"
    crypted = crypt_password(pw)
    check_password(crypted, pw)
    failed = False
    try:
        check_password(crypted, "Bad")
    except PasswordError:
        failed = True
    assert failed
