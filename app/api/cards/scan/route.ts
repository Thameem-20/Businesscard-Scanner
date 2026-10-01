import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { processBusinessCard } from '@/lib/ocr';
import { checkDuplicateName } from '@/lib/card-matching';
import { uploadToBlob, getReadableBlobUrl } from '@/lib/azure-blob-storage';
import { cardVisibilityClause, getAccessContext } from '@/lib/access';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const access = await getAccessContext(session);

    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Process OCR
    const cardData = await processBusinessCard(file);
    
    const organizationId = access.organizationId;

    if (!organizationId) {
      return NextResponse.json({ 
        error: 'Organization ID is required' 
      }, { status: 400 });
    }
    
    // Upload image to Azure Blob Storage
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const { url: imageUrl, blobName } = await uploadToBlob(buffer, file.name, file.type || 'image/jpeg');
    const imageDisplayUrl = await getReadableBlobUrl(imageUrl);
    
    const visibility = cardVisibilityClause(access);
    const duplicate = cardData.name
      ? await checkDuplicateName(cardData.name, organizationId, undefined, visibility)
      : null;
    
    if (duplicate) {
      return NextResponse.json({
        duplicate: true,
        matchedCard: duplicate,
        extractedData: cardData,
        imageUrl: imageUrl,
        imageDisplayUrl: imageDisplayUrl,
        blobName: blobName,
      }, { status: 200 });
    }
    
    // Don't save automatically - return extracted data for user to review and save manually
    return NextResponse.json({
      success: true,
      extractedData: cardData,
      imageUrl: imageUrl,
      imageDisplayUrl: imageDisplayUrl,
      blobName: blobName,
    });
    
  } catch (error: any) {
    console.error('Scan error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process business card' },
      { status: 500 }
    );
  }
}
