"""Export a PRIVATE local SQLite backup. Default: active marketing opt-ins only."""
from pathlib import Path
import argparse
import csv
import sqlite3
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('database', type=Path)
p.add_argument('output', type=Path)
p.add_argument('--all', action='store_true', help='All customer profiles, including people without marketing consent. Not a mailing list.')
a = p.parse_args()
query = '''SELECT full_name,email,country,datetime(consented_at,'unixepoch') AS consented_at_utc,consent_version,source,unsubscribe_path FROM marketing_contacts ORDER BY email'''
if a.all:
    query = '''SELECT c.full_name,c.email,c.phone,c.country,c.age,c.is_guest,c.is_inquiry,COALESCE(s.active,0) AS marketing_opt_in FROM customer_directory c LEFT JOIN marketing_subscribers s ON s.email=c.email ORDER BY c.email'''
def safe(value):
    if value is None:
        return ''
    value = str(value)
    return "'" + value if value.lstrip().startswith(('=', '+', '-', '@')) else value
with sqlite3.connect(a.database.resolve().as_uri() + '?mode=ro', uri=True) as db:
    cursor = db.execute(query)
    with a.output.open('w', newline='', encoding='utf-8-sig') as out:
        writer = csv.writer(out)
        writer.writerow([column[0] for column in cursor.description])
        count = 0
        for row in cursor:
            writer.writerow([safe(value) for value in row])
            count += 1
print(f'Exported {count} profiles. Keep this file private.')
if a.all:
    print('This includes nonsubscribers and must not be used as a marketing list.')
