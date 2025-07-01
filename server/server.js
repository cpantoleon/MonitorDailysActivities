const express = require('express');
const cors = require('cors');
const db = require('./database.js');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const xlsx = require('xlsx');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const upload = multer({ storage: multer.memoryStorage() });

const swaggerDocument = JSON.parse(fs.readFileSync(path.join(__dirname, 'swagger.json'), 'utf8'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const processExcelData = (fileBuffer) => {
    const validTypes = ['Change Request', 'Task', 'Bug', 'Story'];
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { defval: "" });

    const results = {
        validRows: [],
        skippedCount: 0,
    };

    data.forEach(row => {
        const summary = row['Summary'] ? String(row['Summary']).trim() : '';
        if (!summary) return;
        const type = row['T'] ? String(row['T']).trim() : '';
        if (!validTypes.includes(type)) {
            results.skippedCount++;
            return;
        }
        const linkRegex = /\[(.*?)\]/;
        const title = summary.replace(linkRegex, '').trim();
        const key = row['Key'] ? String(row['Key']).trim() : '';
        const tags = row['Sprint'] ? String(row['Sprint']).trim() : null;
        const link = key ? `https://jira.example.com/browse/${key}` : null;
        results.validRows.push({ title, type, tags, link, key });
    });
    return results;
};

const processDefectExcelData = (fileBuffer) => {
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { defval: "" });

    const results = {
        validRows: [],
        skippedCount: 0,
    };

    data.forEach(row => {
        const type = row['T'] ? String(row['T']).trim() : '';
        if (type !== 'Defect') {
            results.skippedCount++;
            return;
        }

        const title = row['Summary'] ? String(row['Summary']).trim() : '';
        if (!title) {
            results.skippedCount++;
            return;
        }

        const key = row['Key'] ? String(row['Key']).trim() : '';
        const link = key ? `https://jira.example.com/browse/${key}` : null;

        results.validRows.push({ title, link });
    });

    return results;
};


app.get("/api/projects", (req, res) => {
    const sql = "SELECT name FROM projects ORDER BY name ASC";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ message: "success", data: rows.map(row => row.name) });
    });
});

app.post("/api/projects", (req, res) => {
    const { name } = req.body;
    if (!name || name.trim() === '') return res.status(400).json({ error: "Project name is required." });
    const trimmedName = name.trim();
    const sql = `INSERT INTO projects (name) VALUES (?)`;
    db.run(sql, [trimmedName], function(err) {
        if (err) {
            if (err.message.includes("UNIQUE constraint failed")) return res.status(409).json({ "error": `Project '${trimmedName}' already exists.` });
            return res.status(400).json({ "error": err.message });
        }
        res.status(201).json({ message: "Project added successfully", data: { id: this.lastID, name: trimmedName } });
    });
});

app.delete("/api/projects/:name", (req, res) => {
    const projectName = decodeURIComponent(req.params.name);
    if (!projectName) return res.status(400).json({ error: "Project name is required." });

    db.serialize(() => {
        db.run("BEGIN", (err) => { if (err) return res.status(500).json({ error: err.message }); });
        const tables = ['activities', 'notes', 'defects', 'retrospective_items', 'releases', 'projects'];
        let totalChanges = 0, completed = 0;
        const checkCompletion = () => {
            completed++;
            if (completed === tables.length) {
                db.run("COMMIT", (commitErr) => {
                    if (commitErr) return res.status(500).json({ error: commitErr.message });
                    if (totalChanges === 0) return res.status(404).json({ error: `Project '${projectName}' not found.` });
                    res.json({ message: `Project '${projectName}' and all its associated data have been deleted.`, changes: totalChanges });
                });
            }
        };
        const handleError = (err) => {
            db.run("ROLLBACK");
            res.status(500).json({ error: `Failed to delete data for project '${projectName}': ${err.message}` });
        };
        db.run(`DELETE FROM activities WHERE project = ?`, [projectName], function(err) { if (err) return handleError(err); totalChanges += this.changes; checkCompletion(); });
        db.run(`DELETE FROM notes WHERE project = ?`, [projectName], function(err) { if (err) return handleError(err); totalChanges += this.changes; checkCompletion(); });
        db.run(`DELETE FROM defects WHERE project = ?`, [projectName], function(err) { if (err) return handleError(err); totalChanges += this.changes; checkCompletion(); });
        db.run(`DELETE FROM retrospective_items WHERE project = ?`, [projectName], function(err) { if (err) return handleError(err); totalChanges += this.changes; checkCompletion(); });
        db.run(`DELETE FROM releases WHERE project = ?`, [projectName], function(err) { if (err) return handleError(err); totalChanges += this.changes; checkCompletion(); });
        db.run(`DELETE FROM projects WHERE name = ?`, [projectName], function(err) { if (err) return handleError(err); totalChanges += this.changes; checkCompletion(); });
    });
});

app.get("/api/requirements", (req, res) => {
    const activitiesSql = `SELECT
                    act.id as activityDbId, act.requirementGroupId, act.project,
                    act.requirementUserIdentifier, act.status, act.statusDate,
                    act.comment, act.sprint, act.link, act.type, act.tags, act.isCurrent,
                    act.created_at, act.release_id,
                    rel.name as release_name, rel.release_date
                 FROM activities act
                 LEFT JOIN releases rel ON act.release_id = rel.id
                 ORDER BY act.requirementGroupId, act.created_at DESC`;
    
    const linksSql = `SELECT l.requirement_group_id, d.id as defect_id, d.title as defect_title
                      FROM defect_requirement_links l
                      JOIN defects d ON l.defect_id = d.id
                      WHERE d.status != 'Closed'`;

    Promise.all([
        new Promise((resolve, reject) => db.all(activitiesSql, [], (err, rows) => err ? reject(err) : resolve(rows))),
        new Promise((resolve, reject) => db.all(linksSql, [], (err, rows) => err ? reject(err) : resolve(rows)))
    ]).then(([activityRows, linkRows]) => {
        const linksMap = new Map();
        linkRows.forEach(link => {
            if (!linksMap.has(link.requirement_group_id)) {
                linksMap.set(link.requirement_group_id, []);
            }
            linksMap.get(link.requirement_group_id).push({ id: link.defect_id, title: link.defect_title });
        });

        const requirementsGroupMap = new Map();
        activityRows.forEach(row => {
            let groupId = row.requirementGroupId;
            if (!groupId && groupId !== 0) {
                groupId = `${row.project}_${row.requirementUserIdentifier}`;
            }
            if (!requirementsGroupMap.has(groupId)) {
                requirementsGroupMap.set(groupId, {
                    id: groupId,
                    project: row.project ? row.project.trim() : 'Unknown Project',
                    requirementUserIdentifier: row.requirementUserIdentifier ? row.requirementUserIdentifier.trim() : 'Unknown Identifier',
                    history: [],
                    currentStatusDetails: {},
                    linkedDefects: linksMap.get(groupId) || []
                });
            }
            const reqGroupEntry = requirementsGroupMap.get(groupId);
            if (reqGroupEntry) {
                reqGroupEntry.history.push({
                    activityId: row.activityDbId, status: row.status, date: row.statusDate,
                    comment: row.comment, sprint: row.sprint ? row.sprint.trim() : row.sprint,
                    link: row.link, type: row.type, tags: row.tags, isCurrent: row.isCurrent === 1,
                    createdAt: row.created_at,
                    releaseId: row.release_id,
                    releaseName: row.release_name,
                    releaseDate: row.release_date
                });
            }
        });

        const processedRequirements = [];
        requirementsGroupMap.forEach(reqGroup => {
            if (reqGroup.history.length > 0) {
                reqGroup.currentStatusDetails = reqGroup.history.find(h => h.isCurrent) || reqGroup.history[0];
            }
            processedRequirements.push(reqGroup);
        });
        res.json({ message: "success", data: processedRequirements });

    }).catch(err => {
        res.status(400).json({"error": err.message});
    });
});

app.post("/api/activities", (req, res) => {
    let { project, requirementName, status, statusDate, comment, sprint, link, existingRequirementGroupId, type, tags, key, release_id } = req.body;
    if (!project || !requirementName || !status || !statusDate || !sprint) {
        return res.status(400).json({ error: "Missing required fields (project, requirementName, status, statusDate, sprint)" });
    }
    project = project.trim();
    const requirementUserIdentifier = requirementName.trim();
    status = status.trim();
    sprint = sprint.trim();
    comment = comment ? comment.trim() : null;
    link = link ? link.trim() : null;
    type = type ? type.trim() : null;
    tags = tags ? tags.trim() : null;
    const itemKey = key ? key.trim() : null;
    const finalReleaseId = release_id || null;
    const now = new Date().toISOString();

    db.serialize(() => {
        const insertSql = `INSERT INTO activities (project, requirementUserIdentifier, status, statusDate, comment, sprint, link, type, tags, key, release_id, isCurrent, requirementGroupId, created_at, updated_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, ?, ?)`;
        db.run(insertSql, [project, requirementUserIdentifier, status, statusDate, comment, sprint, link, type, tags, itemKey, finalReleaseId, now, now], function(err) {
            if (err) {
                return res.status(400).json({ error: "Failed to insert activity: " + err.message });
            }
            const newActivityDbId = this.lastID;
            let finalRequirementGroupId;

            if (existingRequirementGroupId) {
                finalRequirementGroupId = existingRequirementGroupId;
            } else {
                finalRequirementGroupId = newActivityDbId;
            }

            db.run(`UPDATE activities SET requirementGroupId = ? WHERE id = ?`,
                [finalRequirementGroupId, newActivityDbId],
                (updateGroupIdErr) => {
                    if (updateGroupIdErr) console.error("Error setting requirementGroupId:", updateGroupIdErr.message);
                    
                    const updateOldSql = `UPDATE activities SET isCurrent = 0 WHERE requirementGroupId = ? AND id != ?`;
                    db.run(updateOldSql, [finalRequirementGroupId, newActivityDbId], (updateOldErr) => {
                        if (updateOldErr) console.error("Error updating old current status:", updateOldErr.message);
                        
                        res.json({
                            message: "success",
                            data: {
                                activityDbId: newActivityDbId, requirementGroupId: finalRequirementGroupId,
                                project, requirementUserIdentifier, status, statusDate, comment, sprint, link, isCurrent: 1, type, tags, release_id: finalReleaseId
                            }
                        });
                    });
                }
            );
        });
    });
});

app.put("/api/activities/:activityId", (req, res) => {
    let { comment, statusDate, link, type, tags, release_id } = req.body;
    const activityDbId = req.params.activityId;
    if (comment === undefined && statusDate === undefined && link === undefined && type === undefined && tags === undefined && release_id === undefined) {
        return res.status(400).json({ error: "No fields to update provided" });
    }
    let fieldsToUpdate = [];
    let params = [];
    if (comment !== undefined) { fieldsToUpdate.push("comment = ?"); params.push(comment); }
    if (statusDate !== undefined) { fieldsToUpdate.push("statusDate = ?"); params.push(statusDate); }
    if (link !== undefined) { fieldsToUpdate.push("link = ?"); params.push(link); }
    if (type !== undefined) { fieldsToUpdate.push("type = ?"); params.push(type); }
    if (tags !== undefined) { fieldsToUpdate.push("tags = ?"); params.push(tags); }
    if (release_id !== undefined) { fieldsToUpdate.push("release_id = ?"); params.push(release_id); }

    fieldsToUpdate.push("updated_at = ?");
    params.push(new Date().toISOString());
    params.push(activityDbId);
    const sql = `UPDATE activities SET ${fieldsToUpdate.join(", ")} WHERE id = ?`;
    db.run(sql, params, function(err) {
        if (err) return res.status(400).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: `Activity with id ${activityDbId} not found.` });
        res.json({ message: "success", data: { id: activityDbId, changes: this.changes }});
    });
});

app.put("/api/requirements/:requirementGroupId/rename", (req, res) => {
    const groupId = parseInt(req.params.requirementGroupId, 10);
    let { newRequirementName } = req.body;
    if (isNaN(groupId)) {
        return res.status(400).json({ error: "Invalid requirementGroupId format." });
    }
    if (!newRequirementName || !newRequirementName.trim()) {
        return res.status(400).json({ error: "New requirement name is required." });
    }
    const trimmedNewName = newRequirementName.trim();
    const sql = `UPDATE activities SET requirementUserIdentifier = ? WHERE requirementGroupId = ?`;
    db.run(sql, [trimmedNewName, groupId], function(err) {
        if (err) {
            return res.status(500).json({ error: "Database error while updating requirement name." });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: `Requirement group with ID ${groupId} not found or name unchanged.` });
        }
        res.json({
            message: `Requirement name updated for group ${groupId}. New name: '${trimmedNewName}'. Rows affected: ${this.changes}`,
            changes: this.changes
        });
    });
});

app.put("/api/requirements/:requirementGroupId/set-release", (req, res) => {
    const groupId = req.params.requirementGroupId;
    const { release_id } = req.body;

    const sql = `UPDATE activities SET release_id = ? WHERE requirementGroupId = ?`;
    db.run(sql, [release_id, groupId], function(err) {
        if (err) {
            return res.status(500).json({ error: "Database error while updating release." });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: `Requirement group with ID ${groupId} not found.` });
        }
        res.json({
            message: `Release updated for requirement group ${groupId}.`,
            changes: this.changes
        });
    });
});

app.delete("/api/requirements/:requirementGroupId", (req, res) => {
    const groupId = parseInt(req.params.requirementGroupId, 10);
    if (isNaN(groupId)) {
        return res.status(400).json({ error: "Invalid requirementGroupId format." });
    }
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        const deleteLinksSql = "DELETE FROM defect_requirement_links WHERE requirement_group_id = ?";
        db.run(deleteLinksSql, [groupId], function(deleteLinksErr) {
            if (deleteLinksErr) {
                db.run("ROLLBACK");
                return res.status(400).json({ error: deleteLinksErr.message });
            }
            const deleteActivitiesSql = "DELETE FROM activities WHERE requirementGroupId = ?";
            db.run(deleteActivitiesSql, [groupId], function(deleteActivitiesErr) {
                if (deleteActivitiesErr) {
                    db.run("ROLLBACK");
                    return res.status(400).json({ error: deleteActivitiesErr.message });
                }
                if (this.changes === 0) {
                    db.run("ROLLBACK");
                    return res.status(404).json({ error: `Requirement group with ID ${groupId} not found.` });
                }
                db.run("COMMIT");
                res.json({
                    message: `Requirement group ${groupId} and its activities/links deleted.`,
                    changes: this.changes
                });
            });
        });
    });
});

app.post('/api/import/validate', upload.single('file'), (req, res) => {
    const { project } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    if (!project) return res.status(400).json({ error: 'Project is required.' });

    try {
        const { validRows, skippedCount } = processExcelData(req.file.buffer);

        const getExistingKeysSql = `SELECT key FROM activities WHERE project = ? AND key IS NOT NULL AND key != ''`;
        db.all(getExistingKeysSql, [project], (err, existingRows) => {
            if (err) return res.status(500).json({ error: "Failed to check for existing requirements." });

            const existingKeys = new Set(existingRows.map(r => r.key));
            
            const duplicates = validRows.filter(row => row.key && existingKeys.has(row.key));
            const newItems = validRows.filter(row => !row.key || !existingKeys.has(row.key));

            res.status(200).json({
                message: "Validation complete.",
                data: {
                    newCount: newItems.length,
                    duplicateCount: duplicates.length,
                    skippedCount: skippedCount,
                }
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process Excel file: ' + error.message });
    }
});

app.post('/api/import/requirements', upload.single('file'), (req, res) => {
    const { project, sprint, release_id } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    if (!project || !sprint) return res.status(400).json({ error: 'Project and Sprint are required.' });
    
    const finalReleaseId = release_id || null;

    try {
        const { validRows, skippedCount } = processExcelData(req.file.buffer);
        const now = new Date().toISOString();
        const statusDate = now.split('T')[0];

        const getExistingDataSql = `SELECT key, requirementUserIdentifier FROM activities WHERE project = ?`;
        db.all(getExistingDataSql, [project], (err, existingRows) => {
            if (err) return res.status(500).json({ error: "Failed to check for existing requirements." });
            
            const existingKeys = new Set(existingRows.map(r => r.key).filter(Boolean));
            const existingNames = new Set(existingRows.map(r => r.requirementUserIdentifier));

            let renamedCount = 0;

            const itemsToImport = validRows.map(item => {
                let newItem = { ...item };
                if (newItem.key && existingKeys.has(newItem.key)) {
                    renamedCount++;
                    let newTitle = newItem.title;
                    let counter = 1;
                    while (existingNames.has(newTitle)) {
                        newTitle = `${item.title} (${counter})`;
                        counter++;
                    }
                    newItem.title = newTitle;
                    existingNames.add(newTitle);
                }
                return newItem;
            });

            if (itemsToImport.length === 0) {
                let messageParts = ["Import finished. No valid items to import"];
                if (skippedCount > 0) messageParts.push(`Skipped: ${skippedCount}`);
                return res.status(200).json({ message: messageParts.join('. ') + '.' });
            }

            db.serialize(() => {
                db.run("BEGIN TRANSACTION");
                const insertSql = `INSERT INTO activities (project, requirementUserIdentifier, status, statusDate, sprint, link, type, tags, key, release_id, isCurrent, requirementGroupId, created_at, updated_at)
                                   VALUES (?, ?, 'To Do', ?, ?, ?, ?, ?, ?, ?, 1, NULL, ?, ?)`;
                
                let completedInserts = 0;
                let successfulInserts = 0;

                itemsToImport.forEach(item => {
                    db.run(insertSql, [project, item.title, statusDate, sprint, item.link, item.type, item.tags, item.key, finalReleaseId, now, now], function(err) {
                        if (err) {
                            console.error("Error inserting imported activity:", err.message);
                        } else {
                            successfulInserts++;
                            const newId = this.lastID;
                            db.run(`UPDATE activities SET requirementGroupId = ? WHERE id = ?`, [newId, newId]);
                        }
                        completedInserts++;
                        if (completedInserts === itemsToImport.length) {
                             db.run("COMMIT", (commitErr) => {
                                if (commitErr) return res.status(500).json({ error: "Failed to commit imported data: " + commitErr.message });
                                
                                let messageParts = [`Import complete. Imported: ${successfulInserts}`];
                                if (renamedCount > 0) messageParts.push(`Renamed ${renamedCount} duplicate(s)`);
                                if (skippedCount > 0) messageParts.push(`Skipped: ${skippedCount}`);

                                res.status(201).json({
                                    message: messageParts.join('. ') + '.',
                                    data: { imported: successfulInserts, renamed: renamedCount, skipped: skippedCount }
                                });
                            });
                        }
                    });
                });
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process Excel file: ' + error.message });
    }
});

app.post('/api/import/defects/validate', upload.single('file'), (req, res) => {
    const { project } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    if (!project) return res.status(400).json({ error: 'Project is required.' });

    try {
        const { validRows, skippedCount } = processDefectExcelData(req.file.buffer);

        const getExistingLinksSql = `SELECT link FROM defects WHERE project = ? AND link IS NOT NULL`;
        db.all(getExistingLinksSql, [project], (err, existingRows) => {
            if (err) return res.status(500).json({ error: "Failed to check for existing defects." });

            const existingLinks = new Set(existingRows.map(r => r.link));
            
            const duplicates = validRows.filter(row => row.link && existingLinks.has(row.link));
            const newItems = validRows.filter(row => !row.link || !existingLinks.has(row.link));

            res.status(200).json({
                message: "Validation complete.",
                data: {
                    newCount: newItems.length,
                    duplicateCount: duplicates.length,
                    skippedCount: skippedCount,
                }
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process Excel file for defects: ' + error.message });
    }
});

app.post('/api/import/defects', upload.single('file'), (req, res) => {
    const { project } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    if (!project) return res.status(400).json({ error: 'Project is required.' });

    try {
        const { validRows, skippedCount } = processDefectExcelData(req.file.buffer);
        const created_date = new Date().toISOString().split('T')[0];

        const getExistingDataSql = `SELECT link, title FROM defects WHERE project = ?`;
        db.all(getExistingDataSql, [project], (err, existingRows) => {
            if (err) return res.status(500).json({ error: "Failed to check for existing defects." });

            const existingLinks = new Set(existingRows.map(r => r.link).filter(Boolean));
            const existingTitles = new Set(existingRows.map(r => r.title));
            let renamedCount = 0;

            const itemsToImport = validRows.map(item => {
                let newItem = { ...item };
                if (newItem.link && existingLinks.has(newItem.link)) {
                    renamedCount++;
                    let newTitle = newItem.title;
                    let counter = 1;
                    while (existingTitles.has(newTitle)) {
                        newTitle = `${item.title} (${counter})`;
                        counter++;
                    }
                    newItem.title = newTitle;
                    existingTitles.add(newTitle);
                }
                return newItem;
            });

            if (itemsToImport.length === 0) {
                let message = "Import finished. No valid defects to import";
                if (skippedCount > 0) message += `. Skipped: ${skippedCount}`;
                return res.status(200).json({ message: message + '.' });
            }

            db.serialize(() => {
                db.run("BEGIN TRANSACTION");
                const insertDefectSql = `INSERT INTO defects (project, title, area, status, link, created_date) VALUES (?, ?, ?, ?, ?, ?)`;
                const insertHistorySql = `INSERT INTO defect_history (defect_id, changes_summary, comment) VALUES (?, ?, ?)`;
                
                let completedInserts = 0;
                let successfulInserts = 0;

                itemsToImport.forEach(item => {
                    const defaultArea = 'Imported';
                    const defaultStatus = 'Assigned to Developer';

                    db.run(insertDefectSql, [project, item.title, defaultArea, defaultStatus, item.link, created_date], function(err) {
                        if (err) {
                            console.error("Error inserting imported defect:", err.message);
                        } else {
                            successfulInserts++;
                            const defectId = this.lastID;
                            const creationSummary = JSON.stringify({
                                status: { old: null, new: defaultStatus }, title: { old: null, new: item.title }, area: { old: null, new: defaultArea }
                            });
                            db.run(insertHistorySql, [defectId, creationSummary, "Defect created via import."]);
                        }
                        completedInserts++;
                        if (completedInserts === itemsToImport.length) {
                             db.run("COMMIT", (commitErr) => {
                                if (commitErr) return res.status(500).json({ error: "Failed to commit imported defects: " + commitErr.message });
                                
                                let message = `Import complete. Imported: ${successfulInserts}`;
                                if (renamedCount > 0) message += `. Renamed ${renamedCount} duplicate(s)`;
                                if (skippedCount > 0) message += `. Skipped: ${skippedCount}`;

                                res.status(201).json({
                                    message: message + '.',
                                    data: { imported: successfulInserts, renamed: renamedCount, skipped: skippedCount }
                                });
                            });
                        }
                    });
                });
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process Excel file for defects: ' + error.message });
    }
});

app.get("/api/notes/:project", (req, res) => {
    let project = req.params.project;
    if (project) project = project.trim();
    const sql = "SELECT noteDate, noteText FROM notes WHERE project = ? ORDER BY noteDate DESC";
    db.all(sql, [project], (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });
        const notesMap = {};
        rows.forEach(row => { notesMap[row.noteDate] = row.noteText; });
        res.json({ message: "success", data: notesMap });
    });
});

app.post("/api/notes", (req, res) => {
    let { project, noteDate, noteText } = req.body;
    if (!project || !noteDate) {
        return res.status(400).json({ error: "Project and noteDate are required" });
    }
    project = project.trim();
    const trimmedNoteText = noteText.trim();
    if (trimmedNoteText === "") {
        const deleteSql = "DELETE FROM notes WHERE project = ? AND noteDate = ?";
        db.run(deleteSql, [project, noteDate], function(err) {
            if (err) return res.status(400).json({ error: err.message });
            if (this.changes > 0) {
                res.json({ message: "Note deleted successfully.", action: "deleted", data: { project, noteDate } });
            } else {
                res.json({ message: "No note found to delete.", action: "none", data: { project, noteDate } });
            }
        });
    } else {
        const upsertSql = `INSERT INTO notes (project, noteDate, noteText) VALUES (?, ?, ?)
                           ON CONFLICT(project, noteDate) DO UPDATE SET noteText = excluded.noteText;`;
        db.run(upsertSql, [project, noteDate, trimmedNoteText], function(err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ message: "Note saved successfully.", action: "saved", data: { project, noteDate, noteText: trimmedNoteText } });
        });
    }
});

app.get("/api/retrospective/:project", (req, res) => {
    const project = req.params.project.trim();
    const sql = "SELECT * FROM retrospective_items WHERE project = ? ORDER BY created_at DESC";
    db.all(sql, [project], (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ message: "success", data: rows });
    });
});

app.post("/api/retrospective", (req, res) => {
    let { project, column_type, description, item_date } = req.body;
    if (!project || !column_type || !description || !item_date) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    project = project.trim(); column_type = column_type.trim(); description = description.trim(); item_date = item_date.trim();
    const sql = `INSERT INTO retrospective_items (project, column_type, description, item_date) VALUES (?,?,?,?)`;
    db.run(sql, [project, column_type, description, item_date], function (err) {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ message: "success", data: { id: this.lastID, project, column_type, description, item_date } });
    });
});

app.put("/api/retrospective/:id", (req, res) => {
    const itemId = req.params.id;
    let { column_type, description, item_date } = req.body;
    if (!column_type && !description && !item_date) {
        return res.status(400).json({ error: "No fields provided to update." });
    }
    let setClauses = []; let params = [];
    if (column_type) { setClauses.push("column_type = ?"); params.push(column_type.trim()); }
    if (description) { setClauses.push("description = ?"); params.push(description.trim()); }
    if (item_date) { setClauses.push("item_date = ?"); params.push(item_date.trim()); }
    setClauses.push("updated_at = CURRENT_TIMESTAMP");
    params.push(itemId);
    const sql = `UPDATE retrospective_items SET ${setClauses.join(", ")} WHERE id = ?`;
    db.run(sql, params, function (err) {
        if (err) return res.status(400).json({ "error": err.message });
        if (this.changes === 0) return res.status(404).json({ error: `Item ${itemId} not found.`});
        res.json({ message: "success", data: { id: itemId, changes: this.changes } });
    });
});

app.delete("/api/retrospective/:id", (req, res) => {
    const itemId = req.params.id;
    const sql = 'DELETE FROM retrospective_items WHERE id = ?';
    db.run(sql, itemId, function (err) {
        if (err) return res.status(400).json({ "error": err.message });
        if (this.changes === 0) return res.status(404).json({ error: `Item ${itemId} not found.`});
        res.json({ message: "deleted", changes: this.changes });
    });
});

// START: Release Endpoints
app.get("/api/releases/:project", (req, res) => {
    const project = req.params.project.trim();
    const sql = "SELECT id, name, release_date, is_current, project FROM releases WHERE project = ? ORDER BY release_date DESC";
    db.all(sql, [project], (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ message: "success", data: rows });
    });
});

app.post("/api/releases", (req, res) => {
    let { project, name, release_date, is_current } = req.body;
    if (!project || !name || !release_date) {
        return res.status(400).json({ error: "Project, name, and release date are required." });
    }
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        if (is_current) {
            db.run(`UPDATE releases SET is_current = 0 WHERE project = ?`, [project]);
        }
        const sql = `INSERT INTO releases (project, name, release_date, is_current) VALUES (?, ?, ?, ?)`;
        db.run(sql, [project, name, release_date, is_current ? 1 : 0], function(err) {
            if (err) {
                db.run("ROLLBACK");
                if (err.message.includes("UNIQUE constraint failed")) {
                    return res.status(409).json({ "error": `A release named '${name}' already exists for project '${project}'.` });
                }
                return res.status(400).json({ "error": err.message });
            }
            const newId = this.lastID;
            db.run("COMMIT", (commitErr) => {
                if (commitErr) return res.status(500).json({ "error": "Failed to commit transaction: " + commitErr.message });
                res.status(201).json({ message: "Release created successfully", data: { id: newId, project, name, release_date, is_current } });
            });
        });
    });
});

app.put("/api/releases/:id", (req, res) => {
    const releaseId = req.params.id;
    const { name, release_date, is_current, project } = req.body;
    if (!name || !release_date || !project) {
        return res.status(400).json({ error: "Name, release date, and project are required for update." });
    }
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        if (is_current) {
            db.run(`UPDATE releases SET is_current = 0 WHERE project = ? AND id != ?`, [project, releaseId]);
        }
        const sql = `UPDATE releases SET name = ?, release_date = ?, is_current = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        db.run(sql, [name, release_date, is_current ? 1 : 0, releaseId], function(err) {
            if (err) {
                db.run("ROLLBACK");
                if (err.message.includes("UNIQUE constraint failed")) {
                    return res.status(409).json({ "error": `A release named '${name}' already exists for project '${project}'.` });
                }
                return res.status(400).json({ "error": err.message });
            }
            if (this.changes === 0) {
                db.run("ROLLBACK");
                return res.status(404).json({ error: `Release with id ${releaseId} not found.` });
            }
            db.run("COMMIT", (commitErr) => {
                if (commitErr) return res.status(500).json({ "error": "Failed to commit transaction: " + commitErr.message });
                res.json({ message: "Release updated successfully", data: { id: releaseId, changes: this.changes } });
            });
        });
    });
});

app.delete("/api/releases/:id", (req, res) => {
    const releaseId = req.params.id;
    const sql = 'DELETE FROM releases WHERE id = ?';
    db.run(sql, releaseId, function (err) {
        if (err) return res.status(400).json({ "error": err.message });
        if (this.changes === 0) return res.status(404).json({ error: `Release with id ${releaseId} not found.`});
        res.json({ message: "Release deleted successfully", changes: this.changes });
    });
});
// END: Release Endpoints

app.get("/api/defects/all", (req, res) => {
    const defectsSql = "SELECT * FROM defects ORDER BY created_at DESC";
    const linksSql = `SELECT l.defect_id, l.requirement_group_id, a.requirementUserIdentifier, a.sprint
                      FROM defect_requirement_links l
                      JOIN activities a ON l.requirement_group_id = a.requirementGroupId
                      WHERE a.isCurrent = 1`;

    Promise.all([
        new Promise((resolve, reject) => db.all(defectsSql, [], (err, rows) => err ? reject(err) : resolve(rows))),
        new Promise((resolve, reject) => db.all(linksSql, [], (err, rows) => err ? reject(err) : resolve(rows)))
    ]).then(([defectRows, linkRows]) => {
        const linksMap = new Map();
        linkRows.forEach(link => {
            if (!linksMap.has(link.defect_id)) {
                linksMap.set(link.defect_id, []);
            }
            linksMap.get(link.defect_id).push({
                groupId: link.requirement_group_id,
                name: link.requirementUserIdentifier,
                sprint: link.sprint
            });
        });

        const defectsWithLinks = defectRows.map(defect => ({
            ...defect,
            linkedRequirements: linksMap.get(defect.id) || []
        }));

        res.json({ message: "success", data: defectsWithLinks });
    }).catch(err => {
        res.status(400).json({ "error": err.message });
    });
});

app.get("/api/defects/:project", (req, res) => {
    const project = req.params.project.trim();
    const statusType = req.query.statusType || 'active';

    let defectsSql;
    if (statusType === 'closed') {
        defectsSql = "SELECT * FROM defects WHERE project = ? AND status = 'Closed' ORDER BY updated_at DESC";
    } else {
        defectsSql = "SELECT * FROM defects WHERE project = ? AND status != 'Closed' ORDER BY created_at DESC";
    }
    
    const linksSql = `SELECT l.defect_id, l.requirement_group_id, a.requirementUserIdentifier, a.sprint
                      FROM defect_requirement_links l
                      JOIN activities a ON l.requirement_group_id = a.requirementGroupId
                      WHERE a.isCurrent = 1 AND a.project = ?`;

    Promise.all([
        new Promise((resolve, reject) => db.all(defectsSql, [project], (err, rows) => err ? reject(err) : resolve(rows))),
        new Promise((resolve, reject) => db.all(linksSql, [project], (err, rows) => err ? reject(err) : resolve(rows)))
    ]).then(([defectRows, linkRows]) => {
        const linksMap = new Map();
        linkRows.forEach(link => {
            if (!linksMap.has(link.defect_id)) {
                linksMap.set(link.defect_id, []);
            }
            linksMap.get(link.defect_id).push({
                groupId: link.requirement_group_id,
                name: link.requirementUserIdentifier,
                sprint: link.sprint
            });
        });

        const defectsWithLinks = defectRows.map(defect => ({
            ...defect,
            linkedRequirements: linksMap.get(defect.id) || []
        }));

        res.json({ message: "success", data: defectsWithLinks });
    }).catch(err => {
        res.status(400).json({ "error": err.message });
    });
});

app.get("/api/defects/:defectId/history", (req, res) => {
    const defectId = req.params.defectId;
    const sql = "SELECT * FROM defect_history WHERE defect_id = ? ORDER BY changed_at ASC";
    db.all(sql, [defectId], (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ message: "success", data: rows });
    });
});

app.get("/api/defects/:project/return-counts", (req, res) => {
    const project = req.params.project.trim();
    const statusType = req.query.statusType || 'active';

    let statusCondition = "d.status != 'Closed'";
    if (statusType === 'closed') {
        statusCondition = "d.status = 'Closed'";
    }

    const sql = `
        SELECT
            d.id,
            d.title,
            COUNT(h.id) as return_count
        FROM
            defects d
        JOIN
            defect_history h ON d.id = h.defect_id
        WHERE
            d.project = ?
            AND ${statusCondition}
            AND h.changes_summary LIKE '%"new":"Assigned to Developer"%'
        GROUP BY
            d.id, d.title
        HAVING
            return_count > 0
        ORDER BY
            return_count DESC
    `;
    db.all(sql, [project], (err, rows) => {
        if (err) {
            return res.status(400).json({ "error": err.message });
        }
        res.json({ message: "success", data: rows });
    });
});

app.post("/api/defects", (req, res) => {
    let { project, title, description, area, status, link, created_date, comment, linkedRequirementGroupIds } = req.body;
    if (!project || !title || !area || !status || !created_date) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    project = project.trim(); title = title.trim(); area = area.trim(); status = status.trim();
    created_date = new Date(created_date).toISOString().split('T')[0];
    link = link ? link.trim() : null; description = description ? description.trim() : null;
    comment = comment ? comment.trim() : null;

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        const insertDefectSql = `INSERT INTO defects (project, title, description, area, status, link, created_date) VALUES (?,?,?,?,?,?,?)`;
        const defectParams = [project, title, description, area, status, link, created_date];
        
        db.run(insertDefectSql, defectParams, function(err) {
            if (err) {
                db.run("ROLLBACK");
                return res.status(400).json({ "error": err.message });
            }
            const defectId = this.lastID;
            
            if (linkedRequirementGroupIds && linkedRequirementGroupIds.length > 0) {
                const linkInsertSql = `INSERT INTO defect_requirement_links (defect_id, requirement_group_id) VALUES (?, ?)`;
                linkedRequirementGroupIds.forEach(reqId => {
                    db.run(linkInsertSql, [defectId, reqId], (linkErr) => {
                        if (linkErr) console.error("Error creating defect-requirement link:", linkErr.message);
                    });
                });
            }

            const initialCommentForHistory = comment || "Defect created.";
            const creationSummary = JSON.stringify({
                status: { old: null, new: status }, title: { old: null, new: title }, area: { old: null, new: area }
            });
            const insertHistorySql = `INSERT INTO defect_history (defect_id, changes_summary, comment) VALUES (?, ?, ?)`;
            db.run(insertHistorySql, [defectId, creationSummary, initialCommentForHistory], (histErr) => {
                if (histErr) console.error("Error inserting initial defect history:", histErr.message);
            });

            db.run("COMMIT");
            res.json({ message: "Defect created successfully", data: { id: defectId, project, title, status, created_date } });
        });
    });
});

app.put("/api/defects/:id", (req, res) => {
    const defectId = parseInt(req.params.id, 10);
    const { title, description, area, status, link, created_date, comment, linkedRequirementGroupIds } = req.body;

    db.get("SELECT * FROM defects WHERE id = ?", [defectId], (err, currentDefect) => {
        if (err) return res.status(500).json({ error: "Error fetching current defect state." });
        if (!currentDefect) return res.status(404).json({ error: `Defect with id ${defectId} not found.` });

        let updates = [];
        let updateParamsList = [];
        let changedFieldsForSummary = {};
        
        const addChange = (field, newValue, oldValue) => {
            const normalizedNewValue = (newValue === undefined || newValue === null) ? null : String(newValue).trim();
            const normalizedOldValue = (oldValue === undefined || oldValue === null) ? null : String(oldValue).trim();
            if (normalizedNewValue !== normalizedOldValue) {
                updates.push(`${field} = ?`);
                updateParamsList.push(normalizedNewValue);
                changedFieldsForSummary[field] = { old: normalizedOldValue, new: normalizedNewValue };
            }
        };

        addChange("title", title, currentDefect.title);
        addChange("description", description, currentDefect.description);
        addChange("area", area, currentDefect.area);
        addChange("status", status, currentDefect.status);
        addChange("link", link, currentDefect.link);

        const formattedNewDate = created_date ? new Date(created_date).toISOString().split('T')[0] : currentDefect.created_date;
        addChange("created_date", formattedNewDate, currentDefect.created_date);

        const hasFieldChanges = Object.keys(changedFieldsForSummary).length > 0;
        const hasComment = comment && comment.trim() !== "";

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            const deleteLinksSql = `DELETE FROM defect_requirement_links WHERE defect_id = ?`;
            db.run(deleteLinksSql, [defectId], (deleteErr) => {
                if(deleteErr) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: "Failed to update links." });
                }
                if (linkedRequirementGroupIds && linkedRequirementGroupIds.length > 0) {
                    const insertLinkSql = `INSERT INTO defect_requirement_links (defect_id, requirement_group_id) VALUES (?, ?)`;
                    linkedRequirementGroupIds.forEach(reqId => {
                        db.run(insertLinkSql, [defectId, reqId]);
                    });
                }
            });
            
            const historyComment = comment ? comment.trim() : null;
            if (hasFieldChanges || historyComment) {
                const changesSummaryString = hasFieldChanges ? JSON.stringify(changedFieldsForSummary) : null;
                const historySql = `INSERT INTO defect_history (defect_id, changes_summary, comment) VALUES (?, ?, ?)`;
                db.run(historySql, [defectId, changesSummaryString, historyComment]);
            }

            if (hasFieldChanges) {
                updates.push("updated_at = CURRENT_TIMESTAMP");
                const sqlUpdate = `UPDATE defects SET ${updates.join(", ")} WHERE id = ?`;
                updateParamsList.push(defectId);
                db.run(sqlUpdate, updateParamsList);
            }
            
            db.run("COMMIT", (commitErr) => {
                if(commitErr) return res.status(500).json({ error: "Failed to commit transaction." });
                res.json({ message: "Defect updated successfully.", defectId: defectId });
            });
        });
    });
});

app.delete("/api/defects/:id", (req, res) => {
    const defectId = req.params.id;
    const sql = 'DELETE FROM defects WHERE id = ?';
    db.run(sql, defectId, function (err) {
        if (err) return res.status(400).json({ "error": err.message });
        if (this.changes === 0) return res.status(404).json({ error: `Defect with id ${defectId} not found.`});
        res.json({ message: "Defect deleted successfully", changes: this.changes });
    });
});

app.use(function(req, res){
    res.status(404).json({"error": "Endpoint not found"});
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});