import { BlobServiceClient, BlobSASPermissions } from '@azure/storage-blob';

function getBlobServiceClient(): BlobServiceClient {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING not configured');
  }
  return BlobServiceClient.fromConnectionString(connectionString);
}

export function getContainerName(): string {
  return process.env.AZURE_STORAGE_CONTAINER_NAME || 'businesscardimages';
}

export async function uploadToBlob(
  file: Buffer,
  filename: string,
  contentType: string = 'image/jpeg'
): Promise<{ url: string; blobName: string }> {
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(getContainerName());
  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const blobName = `business-cards/${Date.now()}-${safeFilename}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(file, {
    blobHTTPHeaders: { blobContentType: contentType },
  });

  return { url: blockBlobClient.url, blobName };
}

export function getBlobNameFromUrl(imageUrl: string): string | null {
  try {
    const containerName = getContainerName();
    const url = new URL(imageUrl.split('?')[0]);
    const prefix = `/${containerName}/`;
    const index = url.pathname.indexOf(prefix);
    if (index === -1) return null;
    return decodeURIComponent(url.pathname.slice(index + prefix.length));
  } catch {
    return null;
  }
}

export async function deleteBlobByName(blobName: string): Promise<boolean> {
  const client = getBlobServiceClient();
  const blockBlobClient = client
    .getContainerClient(getContainerName())
    .getBlockBlobClient(blobName);
  const result = await blockBlobClient.deleteIfExists();
  return result.succeeded;
}

export function isAzureBlobUrl(imageUrl: string): boolean {
  return imageUrl.startsWith('http://') || imageUrl.startsWith('https://');
}

export async function getReadableBlobUrl(imageUrl: string): Promise<string> {
  if (!isAzureBlobUrl(imageUrl)) {
    return imageUrl;
  }

  const blobName = getBlobNameFromUrl(imageUrl);
  if (!blobName) {
    return imageUrl;
  }

  const client = getBlobServiceClient();
  const blobClient = client
    .getContainerClient(getContainerName())
    .getBlockBlobClient(blobName);

  return blobClient.generateSasUrl({
    permissions: BlobSASPermissions.parse('r'),
    expiresOn: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
}

export async function deleteFromBlob(imageUrl: string): Promise<boolean> {
  if (!isAzureBlobUrl(imageUrl)) return false;

  const blobName = getBlobNameFromUrl(imageUrl);
  if (!blobName) {
    console.warn('Could not parse blob name from URL:', imageUrl);
    return false;
  }

  return deleteBlobByName(blobName);
}

export async function downloadBlobAsBuffer(blobName: string): Promise<Buffer> {
  const client = getBlobServiceClient();
  const blobClient = client
    .getContainerClient(getContainerName())
    .getBlockBlobClient(blobName);

  return blobClient.downloadToBuffer();
}

export async function getCardImageBuffer(card: {
  image_url?: string | null;
  cloud_storage_url?: string | null;
}): Promise<Buffer | null> {
  if (card.cloud_storage_url) {
    try {
      return await downloadBlobAsBuffer(card.cloud_storage_url);
    } catch (error) {
      console.error('Failed to download blob by name:', card.cloud_storage_url, error);
    }
  }

  if (card.image_url && isAzureBlobUrl(card.image_url)) {
    const blobName = getBlobNameFromUrl(card.image_url);
    if (blobName) {
      try {
        return await downloadBlobAsBuffer(blobName);
      } catch (error) {
        console.error('Failed to download blob from image URL:', card.image_url, error);
      }
    }

    try {
      const readableUrl = await getReadableBlobUrl(card.image_url);
      const response = await fetch(readableUrl);
      if (response.ok) {
        return Buffer.from(await response.arrayBuffer());
      }
    } catch (error) {
      console.error('Failed to fetch image via SAS URL:', card.image_url, error);
    }
  }

  return null;
}
