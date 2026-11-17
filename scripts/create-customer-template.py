"""Build an empty local SQLite template. This never connects to the live database."""
from pathlib import Path
import sqlite3
root = Path(__file__).resolve().parents[1]
target = root / 'database/customer-database-template.sqlite3'
if target.exists():
    target.unlink()
with sqlite3.connect(target) as db:
    for migration in sorted((root / 'migrations').glob('*.sql')):
        db.executescript(migration.read_text())
    assert db.execute('SELECT COUNT(*) FROM customer_directory').fetchone()[0] == 0
    assert db.execute('SELECT COUNT(*) FROM marketing_contacts').fetchone()[0] == 0
print(f'Created empty customer database template: {target.name}')
