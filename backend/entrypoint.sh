#!/bin/sh
set -e

echo "Starting Automated Essay Scoring API backend..."

# Wait for database connectivity if DATABASE_SYNC_URL or DATABASE_URL is configured
echo "Verifying database connection..."
python -c "
import time, sys
from app.core.database import engine
from sqlalchemy import text

for i in range(30):
    try:
        with engine.connect() as conn:
            conn.execute(text('SELECT 1'))
        print('Database connection established successfully.')
        sys.exit(0)
    except Exception as e:
        print(f'Waiting for database connection ({i+1}/30)... {e}')
        time.sleep(1)
print('Warning: Database connection timeout reached, proceeding anyway...')
" || true

# Run idempotent seeds
echo "Executing prompt and user seed scripts..."
python -m app.scripts.seed_prompts || echo "Seed prompts completed or skipped."
python -m app.scripts.seed_users || echo "Seed users completed or skipped."

# Execute main process
exec "$@"
