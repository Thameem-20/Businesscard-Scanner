import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { unlink } from 'fs/promises';
import { join } from 'path';
import {
  deleteBlobByName,
  deleteFromBlob,
  getBlobNameFromUrl,
  isAzureBlobUrl,
} from '@/lib/azure-blob-storage';

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get('id');
    
    if (!cardId) {
      return NextResponse.json({ error: 'Card ID required' }, { status: 400 });
    }
    
    const organizationId = typeof (session.user as any).organizationId === 'string'
      ? parseInt((session.user as any).organizationId)
      : (session.user as any).organizationId;
    
    const card = await query(
      `SELECT * FROM business_cards WHERE id = ? AND organization_id = ?`,
      [cardId, organizationId]
    ) as any[];
    
    if (!card || card.length === 0) {
      return NextResponse.json({ error: 'Card not found or unauthorized' }, { status: 404 });
    }

    const cardRecord = card[0];
    
    if (cardRecord.cloud_storage_url) {
      const deleted = await deleteBlobByName(cardRecord.cloud_storage_url);
      if (!deleted) {
        console.warn('Blob not found for deletion:', cardRecord.cloud_storage_url);
      }
    } else if (cardRecord.image_url) {
      if (isAzureBlobUrl(cardRecord.image_url)) {
        const deleted = await deleteFromBlob(cardRecord.image_url);
        if (!deleted) {
          const blobName = getBlobNameFromUrl(cardRecord.image_url);
          console.warn('Failed to delete Azure blob:', blobName || cardRecord.image_url);
        }
      } else {
        try {
          const imagePath = join(process.cwd(), 'public', cardRecord.image_url);
          await unlink(imagePath);
        } catch (error) {
          console.warn('Failed to delete local image file:', error);
        }
      }
    }
    
    await query(
      `DELETE FROM business_cards WHERE id = ? AND organization_id = ?`,
      [cardId, organizationId]
    );
    
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('Delete card error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete business card' },
      { status: 500 }
    );
  }
}
