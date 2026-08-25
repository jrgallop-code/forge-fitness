import {
    createBackupSnapshot,
    verifyBackupSnapshot
}
from "./backup-manager.js?v=backup-complete-6";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const ZIP_MIME = "application/zip";
const MAX_EXCEL_CELL_LENGTH = 32767;

const CORE_DATA_KEYS = new Set([
    "forge_workout_sessions",
    "level_up_active_workout",
    "forge_weight_entries",
    "level_up_nutrition_phases",
    "level_up_nutrition_plan",
    "level_up_current_goal",
    "level_up_nutrition_goal",
    "level_up_body_measurements",
    "level_up_sleep_entries",
    "level_up_water_entries",
    "level_up_nutrition_habits",
    "forge_workout_plans",
    "forge_custom_exercises"
]);

export function initializeDataSpreadsheetExport() {
    document.getElementById("export-data-workbook")
        ?.addEventListener("click", exportDataWorkbook);
    document.getElementById("export-data-csv-bundle")
        ?.addEventListener("click", exportDataCsvBundle);
}

export function buildLevelUpSheets(backup) {
    const data = backup?.data && typeof backup.data === "object" ? backup.data : {};
    const sheets = [];
    const add = (name, records, emptyHeaders = ["status"]) => {
        sheets.push(recordsToSheet(name, records, emptyHeaders));
    };

    const workoutRows = buildWorkoutRows(asArray(data.forge_workout_sessions));
    const activeWorkout = objectValue(data.level_up_active_workout);
    const activeWorkoutRows = Object.keys(activeWorkout).length ? buildWorkoutRows([activeWorkout]) : [];
    const workoutSummaryRows = buildWorkoutSummaryRows(asArray(data.forge_workout_sessions));
    const weightRows = asArray(data.forge_weight_entries).map(flattenRecord);
    const calorieRows = buildCalorieRows(data);
    const measurementRows = asArray(data.level_up_body_measurements).map(flattenRecord);
    const sleepRows = asArray(data.level_up_sleep_entries).map(flattenRecord);
    const waterRows = asArray(data.level_up_water_entries).map(flattenRecord);
    const nutritionRows = buildNutritionRows(data.level_up_nutrition_habits);
    const planRows = buildPlanRows(asArray(data.forge_workout_plans));
    const customExerciseRows = asArray(data.forge_custom_exercises).map(flattenRecord);
    const photoRows = buildPhotoRows(backup?.externalData?.photos);
    const settingsRows = buildSettingsRows(data);
    const rawRows = buildAllDataRows(backup);

    add("Summary", buildSummaryRows(backup, {
        workouts: workoutSummaryRows.length,
        activeWorkout: Object.keys(activeWorkout).length ? 1 : 0,
        workoutSets: workoutRows.filter(row => row.set_number !== "").length,
        weighIns: weightRows.length,
        calorieRecords: calorieRows.length,
        measurements: measurementRows.length,
        sleepEntries: sleepRows.length,
        waterEntries: waterRows.length,
        nutritionCheckIns: nutritionRows.length,
        workoutPlanRows: planRows.length,
        customExercises: customExerciseRows.length,
        photos: photoRows.length
    }), ["category", "records"]);
    add("Workouts", workoutRows, ["session_id", "date", "exercise_name", "set_number", "set.weight", "set.reps"]);
    add("Active Workout", activeWorkoutRows, ["session_id", "date", "exercise_name", "set_number", "set.weight", "set.reps"]);
    add("Workout Summary", workoutSummaryRows, ["session_id", "date", "plan_name", "training_day", "completed_sets"]);
    add("Weight", weightRows, ["date", "weight"]);
    add("Calories", calorieRows, ["record_type", "date", "calories"]);
    add("Measurements", measurementRows, ["date", "neck", "shoulders", "chest", "waist", "hips", "upperArm", "forearm", "thigh", "calf"]);
    add("Sleep", sleepRows, ["date", "bedtime", "wakeTime", "duration", "quality", "note"]);
    add("Water", waterRows, ["date", "amount"]);
    add("Nutrition Log", nutritionRows, ["date", "habits", "notes"]);
    add("Workout Plans", planRows, ["plan_id", "plan_name", "day_number", "day_name", "exercise_name", "set_number"]);
    add("Custom Exercises", customExerciseRows, ["id", "name", "muscleGroup", "equipment"]);
    add("Photo Log", photoRows, ["id", "date", "note", "createdAt", "image_in_json_backup"]);
    add("Profile & Settings", settingsRows, ["storage_key", "value"]);
    add("All Recorded Data", rawRows, ["storage_area", "storage_key", "data_path", "value"]);

    return sheets;
}

export function buildLevelUpWorkbook(backup) {
    return buildXlsx(buildLevelUpSheets(backup), backup?.exportedAt);
}

export function buildLevelUpCsvBundle(backup) {
    const entries = buildLevelUpSheets(backup).map(sheet => ({
        name: `${safeFilename(sheet.name)}.csv`,
        data: sheetToCsv(sheet)
    }));
    entries.unshift({
        name: "README.txt",
        data: "Level Up data export\r\n\r\nEach CSV file contains one recorded data category. The JSON backup remains the complete restore format and includes binary photo data when present.\r\n"
    });
    return createZip(entries);
}

async function exportDataWorkbook() {
    await runExport({
        preparing: "Preparing complete spreadsheet…",
        filename: `level-up-data-${localDate()}.xlsx`,
        mime: XLSX_MIME,
        build: buildLevelUpWorkbook,
        success: "Spreadsheet exported with a separate tab for each data category."
    });
}

async function exportDataCsvBundle() {
    await runExport({
        preparing: "Preparing CSV files…",
        filename: `level-up-csv-data-${localDate()}.zip`,
        mime: ZIP_MIME,
        build: buildLevelUpCsvBundle,
        success: "CSV bundle exported with one file for each data category."
    });
}

async function runExport({ preparing, filename, mime, build, success }) {
    try {
        setMessage(preparing);
        const backup = await createBackupSnapshot();
        verifyBackupSnapshot(backup);
        const bytes = build(backup);
        const blob = new Blob([bytes], { type: mime });
        const file = typeof File === "function" ? new File([blob], filename, { type: mime }) : null;

        if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
            try {
                await navigator.share({ files: [file], title: "Level Up Data Export" });
                setMessage(success, "success");
                return;
            }
            catch (error) {
                if (error?.name === "AbortError") {
                    setMessage("Export cancelled before saving.");
                    return;
                }
            }
        }

        downloadBlob(blob, filename);
        setMessage(success, "success");
    }
    catch (error) {
        console.error("Data export failed:", error);
        setMessage(error?.message || "The data export could not be created.", "error");
    }
}

function buildWorkoutRows(sessions) {
    const rows = [];
    sessions.forEach((session, sessionIndex) => {
        const sessionFields = flattenRecord(withoutKeys(session, ["exercises"]), "session");
        const exercises = asArray(session?.exercises);
        if (!exercises.length) {
            rows.push({
                session_number: sessionIndex + 1,
                session_id: session?.id || "",
                date: session?.date || "",
                exercise_number: "",
                exercise_name: "",
                set_number: "",
                ...sessionFields
            });
            return;
        }

        exercises.forEach((exercise, exerciseIndex) => {
            const exerciseFields = flattenRecord(withoutKeys(exercise, ["sets"]), "exercise");
            const sets = asArray(exercise?.sets);
            const base = {
                session_number: sessionIndex + 1,
                session_id: session?.id || "",
                date: session?.date || "",
                plan_name: session?.planName || "",
                training_day: session?.trainingDayName || "",
                exercise_number: exerciseIndex + 1,
                exercise_id: exercise?.exerciseId || exercise?.id || "",
                exercise_name: exercise?.name || exercise?.exerciseName || exercise?.exerciseId || "",
                ...sessionFields,
                ...exerciseFields
            };
            if (!sets.length) {
                rows.push({ ...base, set_number: "" });
                return;
            }
            sets.forEach((set, setIndex) => {
                rows.push({
                    ...base,
                    set_number: setIndex + 1,
                    ...flattenRecord(set, "set")
                });
            });
        });
    });
    return rows;
}

function buildWorkoutSummaryRows(sessions) {
    return sessions.map((session, index) => {
        const exercises = asArray(session?.exercises);
        const completedSets = exercises.reduce((total, exercise) =>
            total + asArray(exercise?.sets).filter(isRecordedSet).length, 0);
        return {
            session_number: index + 1,
            session_id: session?.id || "",
            date: session?.date || "",
            plan_name: session?.planName || "",
            training_day: session?.trainingDayName || "",
            exercise_count: exercises.length,
            completed_sets: completedSets,
            duration_minutes: session?.durationMinutes ?? "",
            started_at: session?.startedAt || "",
            completed_at: session?.completedAt || "",
            is_demo: session?.isDemo === true,
            ...flattenRecord(withoutKeys(session, ["exercises", "planSnapshot"]), "session")
        };
    });
}

function buildPlanRows(plans) {
    const rows = [];
    plans.forEach((plan, planIndex) => {
        const planFields = flattenRecord(withoutKeys(plan, ["days"]), "plan");
        asArray(plan?.days).forEach((day, dayIndex) => {
            const dayFields = flattenRecord(withoutKeys(day, ["exercises"]), "day");
            asArray(day?.exercises).forEach((exercise, exerciseIndex) => {
                const exerciseFields = flattenRecord(withoutKeys(exercise, ["sets"]), "exercise");
                const sets = asArray(exercise?.sets);
                const base = {
                    plan_number: planIndex + 1,
                    plan_id: plan?.id || "",
                    plan_name: plan?.name || "",
                    day_number: dayIndex + 1,
                    day_name: day?.name || "",
                    exercise_number: exerciseIndex + 1,
                    exercise_id: exercise?.exerciseId || exercise?.id || "",
                    exercise_name: exercise?.name || exercise?.exerciseName || exercise?.exerciseId || "",
                    ...planFields,
                    ...dayFields,
                    ...exerciseFields
                };
                if (!sets.length) rows.push({ ...base, set_number: "" });
                else sets.forEach((set, setIndex) => rows.push({
                    ...base,
                    set_number: setIndex + 1,
                    ...flattenRecord(set, "set")
                }));
            });
        });
    });
    return rows;
}

function buildCalorieRows(data) {
    const rows = [];
    const plan = objectValue(data.level_up_nutrition_plan);
    const goal = objectValue(data.level_up_nutrition_goal);
    const currentGoal = objectValue(data.level_up_current_goal);
    const activeSnapshot = objectValue(data.level_up_active_calorie_target_snapshot);

    if (Object.keys(plan).length || Object.keys(goal).length || Object.keys(currentGoal).length || Object.keys(activeSnapshot).length) {
        rows.push({
            record_type: "current calorie settings",
            date: activeSnapshot.updatedAt || plan.updatedAt || goal.updatedAt || "",
            calories: plan.calculatedCalories ?? plan.currentCalories ?? activeSnapshot.calories ?? "",
            maintenance_calories: data.level_up_manual_maintenance_calories ?? "",
            goal_weight: data.level_up_goal_weight ?? currentGoal.targetWeight ?? "",
            weekly_rate: data.level_up_custom_weekly_rate ?? "",
            ...flattenRecord(plan, "nutrition_plan"),
            ...flattenRecord(goal, "nutrition_goal"),
            ...flattenRecord(currentGoal, "current_goal"),
            ...flattenRecord(activeSnapshot, "active_target")
        });
    }

    asArray(data.level_up_nutrition_phases).forEach((phase, index) => {
        rows.push({
            record_type: "nutrition phase",
            date: phase?.startDate || phase?.createdAt || "",
            phase_number: index + 1,
            calories: phase?.currentCalories ?? phase?.startCalories ?? "",
            maintenance_calories: phase?.maintenanceCalories ?? "",
            ...flattenRecord(withoutKeys(phase, ["adjustments"]), "phase")
        });
        asArray(phase?.adjustments).forEach((adjustment, adjustmentIndex) => rows.push({
            record_type: "phase calorie adjustment",
            date: adjustment?.date || "",
            phase_number: index + 1,
            adjustment_number: adjustmentIndex + 1,
            calories: adjustment?.newCalories ?? "",
            maintenance_calories: adjustment?.maintenanceCalories ?? "",
            ...flattenRecord(adjustment, "adjustment")
        }));
    });

    asArray(plan.adjustmentHistory).forEach((adjustment, index) => rows.push({
        record_type: "calorie target adjustment",
        date: adjustment?.date || "",
        adjustment_number: index + 1,
        calories: adjustment?.newCalories ?? "",
        ...flattenRecord(adjustment, "adjustment")
    }));

    return rows;
}

function buildNutritionRows(value) {
    const data = objectValue(value);
    return Object.entries(data)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, entry]) => ({
            date,
            habits: asArray(entry?.habits).join(", "),
            notes: entry?.notes || "",
            ...flattenRecord(entry, "entry")
        }));
}

function buildPhotoRows(value) {
    return asArray(value).map(photo => ({
        ...flattenRecord(withoutKeys(photo, ["image"])),
        image_in_json_backup: photo?.image ? "Yes" : "No",
        image_data_characters: typeof photo?.image === "string" ? photo.image.length : 0
    }));
}

function buildSettingsRows(data) {
    return Object.keys(data)
        .filter(key => !CORE_DATA_KEYS.has(key))
        .sort()
        .map(key => ({
            storage_key: key,
            value: safeJson(data[key])
        }));
}

function buildAllDataRows(backup) {
    const rows = [];
    Object.keys(backup?.data || {}).sort().forEach(key => {
        flattenRawValue(rows, "Local storage", key, "", backup.data[key]);
    });
    Object.keys(backup?.externalData || {}).sort().forEach(key => {
        flattenRawValue(rows, "External storage", key, "", backup.externalData[key], { omitImages: true });
    });
    return rows;
}

function flattenRawValue(rows, storageArea, storageKey, path, value, options = {}) {
    if (options.omitImages && path.endsWith(".image")) {
        rows.push({
            storage_area: storageArea,
            storage_key: storageKey,
            data_path: path,
            value: "[Binary image data is included in the JSON backup]"
        });
        return;
    }
    if (Array.isArray(value)) {
        if (!value.length) rows.push({ storage_area: storageArea, storage_key: storageKey, data_path: path, value: "[]" });
        value.forEach((item, index) => flattenRawValue(rows, storageArea, storageKey, `${path}[${index}]`, item, options));
        return;
    }
    if (value && typeof value === "object") {
        const entries = Object.entries(value);
        if (!entries.length) rows.push({ storage_area: storageArea, storage_key: storageKey, data_path: path, value: "{}" });
        entries.forEach(([key, item]) => flattenRawValue(rows, storageArea, storageKey, path ? `${path}.${key}` : key, item, options));
        return;
    }
    rows.push({ storage_area: storageArea, storage_key: storageKey, data_path: path || "value", value });
}

function buildSummaryRows(backup, counts) {
    return [
        { category: "Exported at", records: backup?.exportedAt || new Date().toISOString() },
        { category: "Completed workouts", records: counts.workouts },
        { category: "Active workouts", records: counts.activeWorkout },
        { category: "Recorded workout sets", records: counts.workoutSets },
        { category: "Weight entries", records: counts.weighIns },
        { category: "Calorie and phase records", records: counts.calorieRecords },
        { category: "Measurement entries", records: counts.measurements },
        { category: "Sleep entries", records: counts.sleepEntries },
        { category: "Water entries", records: counts.waterEntries },
        { category: "Nutrition check-ins", records: counts.nutritionCheckIns },
        { category: "Workout plan rows", records: counts.workoutPlanRows },
        { category: "Custom exercises", records: counts.customExercises },
        { category: "Photo records", records: counts.photos },
        { category: "Saved app sections", records: backup?.storageKeyCount ?? Object.keys(backup?.data || {}).length },
        { category: "Restore format", records: "Use Export Backup (.json) for a complete restorable copy" }
    ];
}

function recordsToSheet(name, records, emptyHeaders) {
    const safeRecords = Array.isArray(records) ? records : [];
    const headers = [];
    const seen = new Set();
    safeRecords.forEach(record => Object.keys(record || {}).forEach(key => {
        if (!seen.has(key)) {
            seen.add(key);
            headers.push(key);
        }
    }));
    (emptyHeaders || []).forEach(key => {
        if (!seen.has(key)) headers.push(key);
    });
    return {
        name,
        headers,
        rows: safeRecords.map(record => headers.map(header => record?.[header] ?? ""))
    };
}

function flattenRecord(value, prefix = "") {
    const output = {};
    const visit = (item, path) => {
        if (Array.isArray(item)) {
            output[path] = safeJson(item);
            return;
        }
        if (item && typeof item === "object") {
            const entries = Object.entries(item);
            if (!entries.length && path) output[path] = "{}";
            entries.forEach(([key, nested]) => visit(nested, path ? `${path}.${key}` : key));
            return;
        }
        if (path) output[path] = item ?? "";
    };
    visit(value, prefix);
    return output;
}

function withoutKeys(value, keys) {
    const source = objectValue(value);
    return Object.fromEntries(Object.entries(source).filter(([key]) => !keys.includes(key)));
}

function isRecordedSet(set) {
    return Number(set?.reps) > 0 || Number(set?.weight) > 0 || Number(set?.duration) > 0 || Number(set?.durationMinutes) > 0;
}

function asArray(value) {
    return Array.isArray(value) ? value : [];
}

function objectValue(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function safeJson(value) {
    try {
        return JSON.stringify(value);
    }
    catch {
        return String(value ?? "");
    }
}

function buildXlsx(sheets, exportedAt) {
    const safeSheets = uniqueSheetNames(sheets);
    const workbookSheets = safeSheets.map((sheet, index) =>
        `<sheet name="${xmlEscape(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("");
    const relationships = safeSheets.map((_, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("");
    const worksheetOverrides = safeSheets.map((_, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
    const entries = [
        { name: "[Content_Types].xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>${worksheetOverrides}</Types>` },
        { name: "_rels/.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>` },
        { name: "docProps/app.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Level Up</Application><AppVersion>1.0</AppVersion></Properties>` },
        { name: "docProps/core.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Level Up Data Export</dc:title><dc:creator>Level Up</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${xmlEscape(exportedAt || new Date().toISOString())}</dcterms:created></cp:coreProperties>` },
        { name: "xl/workbook.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>` },
        { name: "xl/_rels/workbook.xml.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships}<Relationship Id="rId${safeSheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
        { name: "xl/styles.xml", data: workbookStyles() },
        ...safeSheets.map((sheet, index) => ({ name: `xl/worksheets/sheet${index + 1}.xml`, data: worksheetXml(sheet) }))
    ];
    return createZip(entries);
}

function worksheetXml(sheet) {
    const allRows = [sheet.headers, ...sheet.rows];
    const columnCount = Math.max(1, sheet.headers.length);
    const rowCount = Math.max(1, allRows.length);
    const dimension = `A1:${columnName(columnCount)}${rowCount}`;
    const widths = Array.from({ length: columnCount }, (_, columnIndex) => {
        const longest = allRows.reduce((max, row) => Math.max(max, String(row?.[columnIndex] ?? "").length), 0);
        return Math.max(10, Math.min(50, longest + 2));
    });
    const cols = widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("");
    const rows = allRows.map((row, rowIndex) => {
        const cells = Array.from({ length: columnCount }, (_, columnIndex) =>
            cellXml(row?.[columnIndex] ?? "", rowIndex + 1, columnIndex + 1, rowIndex === 0)).join("");
        return `<row r="${rowIndex + 1}">${cells}</row>`;
    }).join("");
    const autoFilter = sheet.headers.length ? `<autoFilter ref="A1:${columnName(columnCount)}${rowCount}"/>` : "";
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="${dimension}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${rows}</sheetData>${autoFilter}</worksheet>`;
}

function cellXml(value, row, column, header) {
    const ref = `${columnName(column)}${row}`;
    const style = header ? ' s="1"' : "";
    if (typeof value === "number" && Number.isFinite(value)) return `<c r="${ref}"${style}><v>${value}</v></c>`;
    if (typeof value === "boolean") return `<c r="${ref}" t="b"${style}><v>${value ? 1 : 0}</v></c>`;
    const text = String(value ?? "").slice(0, MAX_EXCEL_CELL_LENGTH);
    return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${xmlEscape(text)}</t></is></c>`;
}

function workbookStyles() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Aptos"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEF233C"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
}

function uniqueSheetNames(sheets) {
    const used = new Set();
    return sheets.map(sheet => {
        const base = String(sheet.name || "Sheet").replace(/[\\/?*\[\]:]/g, " ").trim().slice(0, 31) || "Sheet";
        let name = base;
        let suffix = 2;
        while (used.has(name.toLowerCase())) {
            const marker = ` ${suffix++}`;
            name = `${base.slice(0, 31 - marker.length)}${marker}`;
        }
        used.add(name.toLowerCase());
        return { ...sheet, name };
    });
}

function sheetToCsv(sheet) {
    return `\ufeff${[sheet.headers, ...sheet.rows]
        .map(row => row.map(csvCell).join(","))
        .join("\r\n")}`;
}

function csvCell(value) {
    const text = typeof value === "string" && /^[=+\-@]/.test(value)
        ? `'${value}`
        : String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
}

function createZip(entries) {
    const encoder = new TextEncoder();
    const date = new Date();
    const dosTime = ((date.getHours() & 31) << 11) | ((date.getMinutes() & 63) << 5) | ((Math.floor(date.getSeconds() / 2)) & 31);
    const dosDate = (((date.getFullYear() - 1980) & 127) << 9) | (((date.getMonth() + 1) & 15) << 5) | (date.getDate() & 31);
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    entries.forEach(entry => {
        const name = encoder.encode(entry.name);
        const data = entry.data instanceof Uint8Array ? entry.data : encoder.encode(String(entry.data));
        const checksum = crc32(data);
        const local = new Uint8Array(30 + name.length);
        const localView = new DataView(local.buffer);
        localView.setUint32(0, 0x04034b50, true);
        localView.setUint16(4, 20, true);
        localView.setUint16(6, 0x0800, true);
        localView.setUint16(8, 0, true);
        localView.setUint16(10, dosTime, true);
        localView.setUint16(12, dosDate, true);
        localView.setUint32(14, checksum, true);
        localView.setUint32(18, data.length, true);
        localView.setUint32(22, data.length, true);
        localView.setUint16(26, name.length, true);
        local.set(name, 30);
        localParts.push(local, data);

        const central = new Uint8Array(46 + name.length);
        const centralView = new DataView(central.buffer);
        centralView.setUint32(0, 0x02014b50, true);
        centralView.setUint16(4, 20, true);
        centralView.setUint16(6, 20, true);
        centralView.setUint16(8, 0x0800, true);
        centralView.setUint16(10, 0, true);
        centralView.setUint16(12, dosTime, true);
        centralView.setUint16(14, dosDate, true);
        centralView.setUint32(16, checksum, true);
        centralView.setUint32(20, data.length, true);
        centralView.setUint32(24, data.length, true);
        centralView.setUint16(28, name.length, true);
        centralView.setUint32(42, offset, true);
        central.set(name, 46);
        centralParts.push(central);
        offset += local.length + data.length;
    });

    const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(8, entries.length, true);
    endView.setUint16(10, entries.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, offset, true);
    return concatBytes([...localParts, ...centralParts, end]);
}

function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function concatBytes(parts) {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const output = new Uint8Array(total);
    let offset = 0;
    parts.forEach(part => {
        output.set(part, offset);
        offset += part.length;
    });
    return output;
}

function columnName(number) {
    let value = number;
    let result = "";
    while (value > 0) {
        value -= 1;
        result = String.fromCharCode(65 + (value % 26)) + result;
        value = Math.floor(value / 26);
    }
    return result || "A";
}

function xmlEscape(value) {
    return String(value ?? "")
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function safeFilename(value) {
    return String(value || "data").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "data";
}

function localDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function setMessage(message, type = "") {
    const element = document.getElementById("data-export-message");
    if (!element) return;
    element.textContent = message;
    element.dataset.status = type;
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
