if [ -e tunes.sqlite ] ; then
    mv tunes.sqlite{,.bak}
fi

echo | sqlite3 tunes.sqlite <<EOF
create table Tune (
       id        INTEGER PRIMARY KEY,
       name	 TEXT,
       aka       TEXT,
       composer  TEXT,
       key       TEXT,
       rhythm    TEXT,
       structure TEXT,
       refs      TEXT,
       notes     TEXT,
       incipit   TEXT,
       level     INTEGER,
       maxlevel  INTEGER,
       study	 INTEGER,
       since	 TEXT
);
EOF

./importer.py -o tunes.sqlite data-other data-jigs data-hornpipes data-reels
