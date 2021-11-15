FROM ubi8:latest

RUN yum -y update && \
    yum -y install httpd python2 sqlite

COPY tunes.conf /etc/httpd/conf.d/

RUN rm /etc/httpd/conf.d/welcome.conf
RUN sed -i \
    -e "s|^ErrorLog .*|ErrorLog /dev/stderr|" \
    -e "s|^ *CustomLog .*|CustomLog /dev/stdout combined|" \
    /etc/httpd/conf/httpd.conf

ADD . /srv/tunes
WORKDIR /srv/tunes
RUN mkdir /srv/tunes-data && \
    cp config.py.redirect config.py && \
    cp config.py.example /srv/tunes-data/config_real.py && \
    sqlite3 /srv/tunes-data/tunes.sqlite < example.data && \
    echo "QUFBQUFBQUFBQUFBQUFBQQ" > /srv/tunes-data/site.secret && \
    chown -R apache:apache /srv/tunes-data/

CMD httpd -D FOREGROUND
