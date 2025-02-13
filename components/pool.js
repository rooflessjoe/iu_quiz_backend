/** 
 * Middleware für PostgreSQL-Datenbankverbindung
 * @module PostgreSQL
 */

const {Pool} = require('pg');

/**
 * Erstellt einen neuen Pool für die Datenbankverbindungen.
 * @constant {Pool} pool - Der Pool für die Datenbankverbindungen.
 */

/**
 * Die Konfigurationsoptionen für den Pool.
 * @typedef {Object} PoolConfig
 * @property {string} connectionString - Die Verbindungszeichenfolge zur Datenbank, bereitgestellt durch die Umgebungsvariable.
 * @property {Object} ssl - Die SSL-Konfigurationsoptionen.
 * @property {boolean} ssl.require - Gibt an, ob SSL erforderlich ist.
 * @property {boolean} ssl.rejectUnauthorized - Gibt an, ob nicht autorisierte Zertifikate abgelehnt werden sollen.
 * @memberof module:PostgreSQL
 */

/**
 * @type {PoolConfig}
 * @memberof module:PostgreSQL
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,  // Server stellt diese Umgebungsvariable bereit
  ssl: {
    require: true,
    rejectUnauthorized: false,  // Setze dies auf true für Produktionsumgebungen -> benötigt ein Zertifikat
  }
  //idleTimeoutMillis: 5000, // Zeit in Millisekunden, bevor eine inaktive Verbindung geschlossen wird
});

module.exports = pool;