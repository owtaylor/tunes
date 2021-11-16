#!/usr/bin/python3

from .password_utils import encode_128, random_bytes

print(encode_128(random_bytes(16)))
