import hashlib
from io import StringIO
from base64 import b64encode, b64decode
import re

class PasswordError(Exception):
    pass

# Not a standard MD5 encrypted password, which does 1000 passes, etc,
# but just a direct md5(pw+salt). If the password is good, should
# be fine, especially if the crypted value is secret.

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

def random_bytes(len) -> bytes:
    f = open("/dev/random", "rb");
    r = f.read(len)
    f.close()

    return r

def crypt_password(pw):
    salt = random_bytes(6)
    m = hashlib.md5()
    m.update(pw.encode("UTF-8"))
    m.update(salt)
    return "MD5$"+b64encode(salt, b"+_").decode("UTF-8")+"$"+encode_128(m.digest())

def check_password(crypted, pw):
    if len(pw) > 32:
        raise PasswordError("Password too long")

    m = re.match("MD5\$([^\$]+)\$([^\$]+)$", crypted)
    if m == None:
        raise PasswordError("Crypted password not in expected format")

    salt = b64decode(m.group(1), b"+_")
    expected = decode_128(m.group(2))
    m = hashlib.md5()
    m.update(pw.encode("UTF-8"))
    m.update(salt)
    if m.digest() != expected:
        raise PasswordError("Password doesn't match")

if __name__ == '__main__':
    pw ="Apple"
    crypted = crypt_password(pw)
    check_password(crypted, pw)
    failed = False
    try:
        check_password(crypted, "Bad")
    except PasswordError:
        failed = True
    assert failed == True


