FROM ubi8:latest

RUN yum -y update && \
    yum -y install httpd python39 python39-pip python39-pyyaml sqlite

RUN pip-3.9 install flake8

COPY tunes.conf /etc/httpd/conf.d/

RUN rm /etc/httpd/conf.d/welcome.conf
RUN sed -i \
    -e "s|^ErrorLog .*|ErrorLog /dev/stderr|" \
    -e "s|^ *CustomLog .*|CustomLog /dev/stdout combined|" \
    /etc/httpd/conf/httpd.conf

ENV TUNES_CONFIG=/srv/tunes/config.yaml

ADD . /srv/tunes
WORKDIR /srv/tunes
RUN mkdir /srv/tunes-data && \
    cp config.example.yaml /srv/tunes-data/config.yaml && \
    sqlite3 /srv/tunes-data/tunes.sqlite < example.data && \
    chown -R apache:apache /srv/tunes-data/

CMD httpd -D FOREGROUND
