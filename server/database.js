const sqlite3 = require('sqlite3').verbose();
const DBSOURCE = "db.sqlite";

let db = new sqlite3.Database(DBSOURCE, (err) => {
    if (err) {
      console.error(err.message);
      throw err;
    } else {
        console.log('Connected to the SQLite database.');

        db.run("PRAGMA foreign_keys = ON;", (pragmaErr) => {
            if (pragmaErr) {
                console.error("Error enabling foreign keys:", pragmaErr.message);
            } else {
                console.log("Foreign key enforcement is ON.");
            }
        });

        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) console.error("Error creating projects table", err.message);
            });
            
            db.run(`CREATE TABLE IF NOT EXISTS activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                requirementGroupId INTEGER,
                project TEXT NOT NULL,
                requirementUserIdentifier TEXT NOT NULL,
                status TEXT NOT NULL,
                statusDate TEXT NOT NULL,
                comment TEXT,
                sprint TEXT,
                link TEXT,
                type TEXT,
                tags TEXT,
                key TEXT,
                isCurrent INTEGER DEFAULT 0,
                created_at TEXT,
                updated_at TEXT
            )`, (err) => {
                if (err) console.error("Error creating activities table", err.message);
                else {
                    db.all("PRAGMA table_info(activities)", (pragmaErr, tableColumns) => {
                        if (pragmaErr) return;
                        
                        const columnsToAdd = [
                            { name: 'created_at', type: 'TEXT' },
                            { name: 'updated_at', type: 'TEXT' },
                            { name: 'type', type: 'TEXT' },
                            { name: 'tags', type: 'TEXT' },
                            { name: 'key', type: 'TEXT' }
                        ];

                        columnsToAdd.forEach(col => {
                            if (!tableColumns.some(c => c.name === col.name)) {
                                db.run(`ALTER TABLE activities ADD COLUMN ${col.name} ${col.type}`, (alterErr) => {
                                    if (alterErr) console.error(`Error adding ${col.name} column to activities:`, alterErr.message);
                                });
                            }
                        });
                    });
                }
            });

            db.run(`CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project TEXT NOT NULL,
                noteDate TEXT NOT NULL,
                noteText TEXT,
                UNIQUE(project, noteDate)
            )`, (err) => {
                if (err) console.error("Error creating notes table", err.message);
            });

            db.run(`CREATE TABLE IF NOT EXISTS retrospective_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project TEXT NOT NULL,
                column_type TEXT NOT NULL CHECK(column_type IN ('well', 'wrong', 'improve')),
                description TEXT NOT NULL,
                item_date TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) console.error("Error creating retrospective_items table", err.message);
            });

            db.run(`CREATE TABLE IF NOT EXISTS defects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                area TEXT NOT NULL,
                status TEXT NOT NULL CHECK(status IN ('Under Developer', 'To Be Tested', 'Done', 'Closed')),
                link TEXT,
                created_date TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) console.error("Error creating defects table", err.message);
            });

            db.run(`CREATE TABLE IF NOT EXISTS defect_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                defect_id INTEGER NOT NULL,
                changes_summary TEXT,
                comment TEXT,
                changed_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (defect_id) REFERENCES defects(id) ON DELETE CASCADE
            )`, (err) => {
                if (err) console.error("Error creating defect_history table", err.message);
            });

            db.run(`CREATE TABLE IF NOT EXISTS defect_requirement_links (
                defect_id INTEGER NOT NULL,
                requirement_group_id INTEGER NOT NULL,
                PRIMARY KEY (defect_id, requirement_group_id),
                FOREIGN KEY (defect_id) REFERENCES defects(id) ON DELETE CASCADE
            )`, (err) => {
                if (err) console.error("Error creating defect_requirement_links table", err.message);
            });

            console.log("All table checks/creations complete.");
        });
    }
});

module.exports = db;