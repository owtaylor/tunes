import config
import sqlite3 as sqlite

class TuneDB:
    def __init__(self):
        self.conn = sqlite.connect(config.TUNES_DB)

    def query_tunes(self, id=None):
        cursor = self.conn.cursor()

        if id != None:
            where = "where id=:id"
            values = { 'id' : id }
        else:
            where = ""
            values = {}

        cursor.execute(r"""
SELECT id, aka, composer, incipit, `key`, level, maxlevel, name, notes, refs, rhythm, since, structure, study
  FROM Tune
"""
                       + where +
                       r"""
ORDER BY id""", values);

        while True:
            row = cursor.fetchone()
            if row == None:
                break
            (id, aka, composer, incipit, key, level, maxlevel, name, notes, refs, rhythm, since, structure, study) = row

            values = {'id': id,
                      'aka' : aka,
                      'composer' : composer,
                      'incipit' : incipit,
                      'key' : key,
                      'level' : level,
                      'maxlevel' : maxlevel,
                      'name' : name,
                      'notes' : notes,
                      'refs' : refs,
                      'rhythm' : rhythm,
                      'since' : since,
                      'structure' : structure,
                      'study' : study};

            for k in values.keys():
                if values[k] is None:
                    del values[k]

            yield values

        cursor.close()

    def _insert_tune(self, cursor, tune):
        values = dict(tune)
        for key in ('aka', 'composer', 'incipit', 'maxlevel', 'notes', 'refs', 'since', 'structure', 'study'):
            if not key in values:
                values[key] = None

        cursor.execute(r"""
INSERT INTO Tune
    ( aka,  composer,  incipit,  key,  level,  maxlevel,  name,  notes,  refs,  rhythm,  since,  structure,  study)
VALUES
    (:aka, :composer, :incipit, :key, :level, :maxlevel, :name, :notes, :refs, :rhythm, :since, :structure, :study);
""", values)

    def insert_tunes(self, tunes):
        cursor = self.conn.cursor()

        for tune in tunes:
            self._insert_tune(cursor, tune)

        self.conn.commit()
        cursor.close()

    def insert_tune(self, tune):
        cursor = self.conn.cursor()
        self._insert_tune(cursor, tune)
        self.conn.commit()
        rowid = cursor.lastrowid
        cursor.close()

        return rowid

    def close(self):
        self.conn.close()
        self.conn = None

