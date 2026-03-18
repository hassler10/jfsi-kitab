#!/bin/bash
# Database backup script for SQLite

BACKUP_DIR="backups"
DB_FILE="data/jfsi.db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/jfsi_$TIMESTAMP.db"

# Create backups directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Check if database exists
if [ ! -f "$DB_FILE" ]; then
  echo "❌ Database file not found: $DB_FILE"
  exit 1
fi

# Backup database
cp "$DB_FILE" "$BACKUP_FILE"
echo "✅ Database backed up: $BACKUP_FILE"

# Export SQL dump
sqlite3 "$DB_FILE" ".dump" > "$BACKUP_DIR/jfsi_$TIMESTAMP.sql"
echo "✅ SQL dump exported: $BACKUP_DIR/jfsi_$TIMESTAMP.sql"

# Keep only last 10 backups
echo "🗑️ Cleaning old backups..."
ls -t $BACKUP_DIR/jfsi_*.db | tail -n +11 | xargs rm -f

echo ""
echo "📊 Backup Summary:"
echo "  Database size: $(du -h $DB_FILE | cut -f1)"
echo "  Backup location: $BACKUP_FILE"
echo "  Total backups: $(ls $BACKUP_DIR/jfsi_*.db | wc -l)"
