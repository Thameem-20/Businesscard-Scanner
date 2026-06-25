import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getReadableBlobUrl, isAzureBlobUrl } from '@/lib/azure-blob-storage';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const organizationId = (session.user as any).organizationId;
    
    const cards = await query(
      `SELECT bc.*, u.name as uploaded_by 
       FROM business_cards bc
       JOIN users u ON bc.user_id = u.id
       WHERE bc.organization_id = ?
       ORDER BY bc.created_at DESC`,
      [organizationId]
    ) as any[];

    const cardsWithDisplayUrls = await Promise.all(
      cards.map(async (card) => {
        if (card.image_url && isAzureBlobUrl(card.image_url)) {
          return {
            ...card,
            image_display_url: await getReadableBlobUrl(card.image_url),
          };
        }
        return {
          ...card,
          image_display_url: card.image_url,
        };
      })
    );
    
    return NextResponse.json({ cards: cardsWithDisplayUrls });
    
  } catch (error: any) {
    console.error('List cards error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch business cards' },
      { status: 500 }
    );
  }
}

