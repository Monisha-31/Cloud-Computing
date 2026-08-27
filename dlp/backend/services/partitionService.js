const fs = require('fs');
const path = require('path');

const STORAGE_ROOT = path.join(__dirname, '..', 'data-lake');
const RAW_DIR = path.join(STORAGE_ROOT, 'raw');
const COMPACTED_DIR = path.join(STORAGE_ROOT, 'compacted');
const ARCHIVE_DIR = path.join(STORAGE_ROOT, 'archive');

// Make sure the base folders exist (they're gitignored — created on first run).
[STORAGE_ROOT, RAW_DIR, COMPACTED_DIR, ARCHIVE_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/**
 * Turns an uploaded file's raw buffer into an array of plain record objects.
 * Supports .json (an array of objects) and simple .csv (comma-separated, header row).
 * Every record MUST include a `timestamp` field (ISO 8601 date string) —
 * that's what the pipeline partitions on.
 */
function parseFileContent(buffer, originalName) {
  const text = buffer.toString('utf-8').trim();
  const ext = path.extname(originalName).toLowerCase();

  if (ext === '.json') {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error('JSON file must contain an array of record objects');
    }
    return parsed;
  }

  if (ext === '.csv') {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) throw new Error('CSV file needs a header row plus at least one data row');
    const headers = lines[0].split(',').map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const cells = line.split(',').map((c) => c.trim());
      const record = {};
      headers.forEach((h, i) => (record[h] = cells[i]));
      return record;
    });
  }

  throw new Error('Unsupported file type — upload a .json or .csv file');
}

/**
 * Groups records by calendar date (derived from each record's `timestamp` field)
 * into a "YYYY/MM/DD" partition key — the same Hive-style layout real data lakes
 * (S3 + Athena/Glue, Hadoop/Hive) use so query engines can skip irrelevant partitions.
 */
function groupByDatePartition(records) {
  const groups = {};

  records.forEach((record, index) => {
    if (!record.timestamp) {
      throw new Error(`Record at index ${index} is missing a "timestamp" field`);
    }
    const date = new Date(record.timestamp);
    if (isNaN(date.getTime())) {
      throw new Error(`Record at index ${index} has an invalid timestamp: ${record.timestamp}`);
    }

    const key = [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, '0'),
      String(date.getUTCDate()).padStart(2, '0'),
    ].join('/');

    if (!groups[key]) groups[key] = [];
    groups[key].push(record);
  });

  return groups;
}

function partitionKeyToDir(baseDir, partitionKey) {
  const [year, month, day] = partitionKey.split('/');
  return path.join(baseDir, `year=${year}`, `month=${month}`, `day=${day}`);
}

/**
 * Writes one partition's worth of records to a new raw file on disk.
 * Returns the metadata the caller stores in MongoDB (PartitionFile).
 */
function writeRawPartitionFile(partitionKey, records, sourceLabel) {
  const dir = partitionKeyToDir(RAW_DIR, partitionKey);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const safeLabel = sourceLabel.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const fileName = `${safeLabel}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  const filePath = path.join(dir, fileName);
  const content = JSON.stringify(records, null, 2);

  fs.writeFileSync(filePath, content);

  return {
    partitionKey,
    fileName,
    relativePath: path.relative(STORAGE_ROOT, filePath),
    sizeBytes: Buffer.byteLength(content),
    recordCount: records.length,
  };
}

module.exports = {
  STORAGE_ROOT,
  RAW_DIR,
  COMPACTED_DIR,
  ARCHIVE_DIR,
  parseFileContent,
  groupByDatePartition,
  partitionKeyToDir,
  writeRawPartitionFile,
};
