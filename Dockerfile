FROM ubi8:latest

RUN yum -y module enable nodejs:16 && \
    yum -y update && \
    yum -y install git httpd npm python39 python39-pip python39-pyyaml sqlite

RUN pip-3.9 install flake8

COPY tunes.conf /etc/httpd/conf.d/

RUN rm /etc/httpd/conf.d/welcome.conf
RUN sed -i \
    -e "s|^ErrorLog .*|ErrorLog /dev/stderr|" \
    -e "s|^ *CustomLog .*|CustomLog /dev/stdout combined|" \
    -e "s|^\(Listen .*\)|# \1|" \
    /etc/httpd/conf/httpd.conf && \
    chown -R apache:apache /var/run/httpd

ENV TUNES_CONFIG=/srv/tunes-data/config.yaml

RUN mkdir -p /srv/tunes
WORKDIR /srv/tunes

ADD package.json /srv/tunes
RUN npm install

ADD tools /srv/tunes/tools
ADD tunes /srv/tunes/tunes
ADD \
    README.md \
    config.example.yaml example.data \
    .eslintrc.yml .flake8 rollup.config.js tsconfig.json \
    dependencies.js tunes.js \
    *.cgi *.html *.css \
    /srv/tunes

RUN ./node_modules/.bin/rollup -c && \
    mkdir /srv/tunes-data && \
    cp config.example.yaml /srv/tunes-data/config.yaml && \
    sqlite3 /srv/tunes-data/tunes.sqlite < example.data && \
    chown -R apache:apache /srv/tunes-data/

CMD httpd -D FOREGROUND
