import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { processBusinessCard } from '@/lib/ocr';
import { findMatchingCards, checkDuplicateName } from '@/lib/card-matching';
import { query, queryOne } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Process OCR
    const cardData = await processBusinessCard(file);
    
    if (!cardData.name) {
      return NextResponse.json({ 
        error: 'Could not extract name from business card' 
      }, { status: 400 });
    }
    
    const userId = parseInt((session.user as any).id);
    const organizationId = typeof (session.user as any).organizationId === 'string'
      ? parseInt((session.user as any).organizationId)
      : (session.user as any).organizationId;
    
    if (!organizationId || isNaN(organizationId)) {
      return NextResponse.json({ 
        error: 'Organization ID is required' 
      }, { status: 400 });
    }
    
    // Save image locally first (needed for both new and update flows)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }
    
    const filename = `${Date.now()}-${file.name}`;
    const filepath = join(uploadsDir, filename);
    await writeFile(filepath, buffer);
    
    const imageUrl = `/uploads/${filename}`;
    
    // Check for duplicate name (only within the same organization)
    const duplicate = await checkDuplicateName(cardData.name, organizationId);
    
    if (duplicate) {
      return NextResponse.json({
        duplicate: true,
        matchedCard: duplicate,
        extractedData: cardData,
        imageUrl: imageUrl,
      }, { status: 200 });
    }
    
    // Don't save automatically - return extracted data for user to review and save manually
    return NextResponse.json({
      success: true,
      extractedData: cardData,
      imageUrl: imageUrl,
    });
    
  } catch (error: any) {
    console.error('Scan error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process business card' },
      { status: 500 }
    );
  }
}
