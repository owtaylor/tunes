#!/usr/bin/python3

import termios
import sys

from .password_utils import crypt_password


# From the termios docs
def getpass(prompt="Password: "):
    fd = sys.stdin.fileno()
    old = termios.tcgetattr(fd)
    new = termios.tcgetattr(fd)
    new[3] = new[3] & ~termios.ECHO  # lflags
    try:
        termios.tcsetattr(fd, termios.TCSADRAIN, new)
        passwd = input(prompt)
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old)
    return passwd


pw = getpass("New password: ")
print()
pw2 = getpass("Repeat: ")
print()

if pw != pw2:
    print("Passwords don't match", file=sys.stderr)
    sys.exit(1)

print(crypt_password(pw))
