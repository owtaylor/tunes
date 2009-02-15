import config
import sqlite3 as sqlite

class TuneDB:
    def __init__(self):
        self.conn = sqlite.connect(config.TUNES_DB)

    def query_tunes(self, tune_id=None):
        cursor = self.conn.cursor()

        if tune_id != None:
            where = "where id=:id"
            values = { 'id' : tune_id }
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
            (tune_id, aka, composer, incipit, key, level, maxlevel, name, notes, refs, rhythm, since, structure, study) = row

            values = {'id': tune_id,
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

    def query_tune(self, tune_id):
        rows = [x for x in self.query_tunes(tune_id)]
        if len(rows) < 1:
            raise RuntimeError("No such tune ID")
        if len(rows) > 1:
            raise RuntimeError("Too many rows in result")
        return rows[0]

    def _get_tune_values(self, tune):
        values = dict(tune)
        for key in ('aka', 'composer', 'incipit', 'maxlevel', 'notes', 'refs', 'since', 'structure', 'study'):
            if not key in values:
                values[key] = None

        if 'id' in values:
            del values['id']

        return values

    def _insert_tune(self, cursor, tune):
        cursor.execute(r"""
INSERT INTO Tune
    ( aka,  composer,  incipit,  key,  level,  maxlevel,  name,  notes,  refs,  rhythm,  since,  structure,  study)
VALUES
    (:aka, :composer, :incipit, :key, :level, :maxlevel, :name, :notes, :refs, :rhythm, :since, :structure, :study);
""",
                       self._get_tune_values(tune))

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
        tune_id = cursor.lastrowid
        cursor.close()

        return tune_id

    def update_tune(self, tune_id, new_values):
        cursor = self.conn.cursor()

        values = self._get_tune_values(new_values)
        values['id'] = tune_id;

        cursor.execute(r"""
UPDATE Tune SET
    aka = :aka,
    composer = :composer,
    incipit = :incipit,
    key = :key,
    level = :level,
    maxlevel = :maxlevel,
    name = :name,
    notes = :notes,
    refs = :refs,
    rhythm = :rhythm,
    since = :since,
    structure = :structure,
    study = :study
WHERE id = :id""",
                       values);
        self.conn.commit()
        cursor.close()

    def delete_tune(self, tune_id):
        cursor = self.conn.cursor()

        cursor.execute(r"""DELETE FROM Tune WHERE id = :id""",
                       { 'id' : tune_id });
        self.conn.commit()
        cursor.close()

    def close(self):
        self.conn.close()
        self.conn = None

