const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { STORAGE_ROOT } = require('./partitionService');

function isConfigured() {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_S3_BUCKET
  );
}

function getClient() {
  return new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Uploads one partition file (usually a compacted one) to S3, under a key that
 * mirrors the same Hive-style partition layout used on local disk — this is the
 * step that would, in a real deployment, hand the compacted data off to the
 * actual cloud data lake (S3 + Athena/Glue) for querying.
 */
async function uploadFileToS3(fileDoc) {
  if (!isConfigured()) {
    throw new Error(
      'AWS is not configured. Add AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_S3_BUCKET to your .env to enable this feature.'
    );
  }

  const absPath = path.join(STORAGE_ROOT, fileDoc.relativePath);
  const body = fs.readFileSync(absPath);
  const key = `data-lake/year=${fileDoc.partitionKey.split('/')[0]}/month=${fileDoc.partitionKey.split('/')[1]}/day=${fileDoc.partitionKey.split('/')[2]}/${fileDoc.fileName}`;

  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: 'application/json',
    })
  );

  return key;
}

module.exports = { isConfigured, uploadFileToS3 };
