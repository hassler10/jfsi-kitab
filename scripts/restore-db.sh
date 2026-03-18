#!/bin/bash
# Database restore script for SQLite

if [ -z "$1" ]; then
  echo "Usage: ./scripts/restore-db.sh <backup_file>"
  echo ""
  echo "Available backups:"
  ls -lhS backups/jfsi_*.db 2>/dev/null | awk '{print "  " $NF " (" $5 ")"}'
  exit 1
fi

BACKUP_FILE="$1"
DB_FILE="data/jfsi.db"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Create backup of current database (just in case)
if [ -f "$DB_FILE" ]; then
  cp "$DB_FILE" "$DB_FILE.bak.$(date +%s)"
  echo "💾 Current database backed up"
fi

# Restore
cp "$BACKUP_FILE" "$DB_FILE"
echo "✅ Database restored from: $BACKUP_FILE"
echo ""
echo "⚠️  Current database was saved as: $DB_FILE.bak.*"
echo "   Restart server: npm start"
