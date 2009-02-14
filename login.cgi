#!/usr/bin/python

import cgi
import cgitb
import Cookie
import os
import sys

import config
import site_auth

# Turn on verbose exception handling
cgitb.enable()

cookiedb = Cookie.BaseCookie()
if 'HTTP_COOKIE' in os.environ:
    cookiedb.load(os.environ['HTTP_COOKIE'])

try:
    username = site_auth.check_auth_cookie(cookiedb)
except site_auth.AuthError:
    username = None

form = cgi.FieldStorage()

username = form.getfirst("username", "").strip()
password = form.getfirst("password", "").strip()

try:
    if username == "":
        raise site_auth.AuthError("Username not provided")
    if password == "":
        raise site_auth.AuthError("Password not provided")

    site_auth.set_auth_cookie(cookiedb, username, password)
except site_auth.AuthError, e:
    print "Status: 403 Forbidden"
    print "Content-Type: text/html"
    print
    print "<head><title>Owen Taylor's Tunebook</title></head>"
    print "<body>"
    print "<h1>Error logging in</h1>"
    print "<p>%s</p>" % cgi.escape(str(e))
    print "</body>"
    sys.exit(1)

print "Status: 303 See Other"
print "Content-Type: text/html"
print "Location: " + config.BASE_URL
print cookiedb.output()
print
print "<head><title>Owen Taylor's Tunebook</title></head>"
print "<body>"
print "<p>Successfully logged in as %s</p>" % cgi.escape(username)
print "</body>"
