import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { unlink } from 'fs/promises';
import { join } from 'path';

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
    
    // First, get the card to verify it belongs to the organization and get image path
    const card = await query(
      `SELECT * FROM business_cards WHERE id = ? AND organization_id = ?`,
      [cardId, organizationId]
    ) as any[];
    
    if (!card || card.length === 0) {
      return NextResponse.json({ error: 'Card not found or unauthorized' }, { status: 404 });
    }
    
    // Delete the image file if it exists
    if (card[0].image_url) {
      try {
        const imagePath = join(process.cwd(), 'public', card[0].image_url);
        await unlink(imagePath);
      } catch (error) {
        // Ignore file deletion errors (file might not exist)
        console.warn('Failed to delete image file:', error);
      }
    }
    
    // Delete the card from database
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


