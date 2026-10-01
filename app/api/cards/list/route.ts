import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getReadableBlobUrl, isAzureBlobUrl } from '@/lib/azure-blob-storage';
import { cardVisibilityClause, getAccessContext } from '@/lib/access';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const access = await getAccessContext(session);

    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const visibility = cardVisibilityClause(access);
    const cards = (await query(
      `SELECT bc.*, u.name as uploaded_by, d.name as department_name
       FROM business_cards bc
       JOIN users u ON bc.user_id = u.id
       LEFT JOIN departments d ON bc.department_id = d.id
       WHERE ${visibility.sql}
       ORDER BY bc.created_at DESC`,
      visibility.params
    )) as any[];

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
