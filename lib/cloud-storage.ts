// Cloud storage utilities for AWS S3 (optional)
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

export async function uploadToS3(
  file: Buffer,
  filename: string,
  contentType: string = 'image/jpeg'
): Promise<string> {
  if (!process.env.AWS_S3_BUCKET) {
    throw new Error('AWS_S3_BUCKET not configured');
  }

  const params: AWS.S3.PutObjectRequest = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: `business-cards/${Date.now()}-${filename}`,
    Body: file,
    ContentType: contentType,
    ACL: 'public-read',
  };

  const result = await s3.upload(params).promise();
  return result.Location;
}

export async function deleteFromS3(key: string): Promise<void> {
  if (!process.env.AWS_S3_BUCKET) {
    throw new Error('AWS_S3_BUCKET not configured');
  }

  await s3.deleteObject({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  }).promise();
}

