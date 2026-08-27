const fs = require('fs');
const path = require('path');
const PartitionFile = require('../models/PartitionFile');
const { STORAGE_ROOT, COMPACTED_DIR, ARCHIVE_DIR, partitionKeyToDir } = require('./partitionService');

/**
 * The "small file problem": data lakes accumulate many tiny files per partition
 * (one per upload/ingest batch), which slows down query engines that have to open
 * every file. Compaction periodically merges all raw files in a partition into a
 * single larger file — this function is that job.
 *
 * A partition only gets compacted once it has at least `threshold` raw files,
 * so we don't waste effort compacting partitions that are still small.
 */
async function runCompaction({ threshold, triggeredBy }) {
  const startedAt = new Date();
  const logs = [];
  let partitionsAffected = 0;
  let filesBefore = 0;
  let filesAfter = 0;
  let sizeBeforeBytes = 0;
  let sizeAfterBytes = 0;

  try {
    const rawFiles = await PartitionFile.find({ status: 'raw' });

    // Group raw files by partition key
    const byPartition = {};
    rawFiles.forEach((f) => {
      if (!byPartition[f.partitionKey]) byPartition[f.partitionKey] = [];
      byPartition[f.partitionKey].push(f);
    });

    const eligibleKeys = Object.keys(byPartition).filter((key) => byPartition[key].length >= threshold);

    if (eligibleKeys.length === 0) {
      logs.push(`No partition currently has ${threshold}+ raw files — nothing to compact.`);
    }

    for (const partitionKey of eligibleKeys) {
      const files = byPartition[partitionKey];

      // Read and merge every raw file's records in this partition
      let mergedRecords = [];
      let partitionSizeBefore = 0;
      for (const fileDoc of files) {
        const absPath = path.join(STORAGE_ROOT, fileDoc.relativePath);
        const content = fs.readFileSync(absPath, 'utf-8');
        mergedRecords = mergedRecords.concat(JSON.parse(content));
        partitionSizeBefore += fileDoc.sizeBytes;
      }

      // Write the single compacted file
      const compactedDir = partitionKeyToDir(COMPACTED_DIR, partitionKey);
      if (!fs.existsSync(compactedDir)) fs.mkdirSync(compactedDir, { recursive: true });

      const compactedFileName = `compacted-${Date.now()}.json`;
      const compactedPath = path.join(compactedDir, compactedFileName);
      const compactedContent = JSON.stringify(mergedRecords, null, 2);
      fs.writeFileSync(compactedPath, compactedContent);
      const compactedSize = Buffer.byteLength(compactedContent);

      // Move the original raw files into the archive folder instead of deleting them —
      // keeps an audit trail while getting them out of the "active raw" set.
      const archiveDir = partitionKeyToDir(ARCHIVE_DIR, partitionKey);
      if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });

      for (const fileDoc of files) {
        const absPath = path.join(STORAGE_ROOT, fileDoc.relativePath);
        const archivedPath = path.join(archiveDir, fileDoc.fileName);
        if (fs.existsSync(absPath)) fs.renameSync(absPath, archivedPath);

        fileDoc.status = 'archived';
        fileDoc.relativePath = path.relative(STORAGE_ROOT, archivedPath);
        await fileDoc.save();
      }

      // Record the new compacted file
      await PartitionFile.create({
        partitionKey,
        fileName: compactedFileName,
        relativePath: path.relative(STORAGE_ROOT, compactedPath),
        sizeBytes: compactedSize,
        recordCount: mergedRecords.length,
        status: 'compacted',
      });

      partitionsAffected += 1;
      filesBefore += files.length;
      filesAfter += 1;
      sizeBeforeBytes += partitionSizeBefore;
      sizeAfterBytes += compactedSize;

      logs.push(
        `Partition ${partitionKey}: merged ${files.length} files (${partitionSizeBefore} bytes) into 1 file (${compactedSize} bytes)`
      );
    }

    return {
      status: 'completed',
      threshold,
      partitionsAffected,
      filesBefore,
      filesAfter,
      sizeBeforeBytes,
      sizeAfterBytes,
      logs,
      triggeredBy,
      startedAt,
      completedAt: new Date(),
    };
  } catch (err) {
    logs.push(`Pipeline failed: ${err.message}`);
    return {
      status: 'failed',
      threshold,
      partitionsAffected,
      filesBefore,
      filesAfter,
      sizeBeforeBytes,
      sizeAfterBytes,
      logs,
      triggeredBy,
      startedAt,
      completedAt: new Date(),
    };
  }
}

module.exports = { runCompaction };
