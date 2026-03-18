#!/bin/bash
# Script de migration SQLite → MySQL/PostgreSQL (futur besoin de scaling)

set -e

echo "🔄 Migration database script (preparation)..."
echo ""
echo "Quand vous aurez besoin de scale vers MySQL/PostgreSQL:"
echo ""
echo "1. Exporter les données SQLite:"
echo "   sqlite3 data/jfsi.db '.dump' > backup.sql"
echo ""
echo "2. Créer MySQL database:"
echo "   mysql -u root -p -e \"CREATE DATABASE jfsi_prod;\""
echo ""
echo "3. Importer dans MySQL:"
echo "   mysql -u root -p jfsi_prod < backup.sql"
echo ""
echo "4. Mettre à jour .env:"
echo "   DB_TYPE=mysql"
echo "   DB_HOST=your-mysql-host"
echo "   DB_USER=your-user"
echo "   DB_PASS=your-pass"
echo "   DB_NAME=jfsi_prod"
echo ""
echo "✅ Voir DEPLOYMENT.md pour instructions complètes"
