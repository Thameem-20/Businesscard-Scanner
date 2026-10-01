import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { canAccessCard, getAccessContext } from '@/lib/access';
import { getPrimaryDepartmentId } from '@/lib/departments';

async function getUserScanCountry(userId: number): Promise<string | null> {
  const users = (await query(
    'SELECT scan_country FROM users WHERE id = ?',
    [userId]
  )) as { scan_country: string | null }[];

  const country = users[0]?.scan_country;
  return country?.trim() ? country : null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const access = await getAccessContext(session);

    if (!access || !access.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { cardId, cardData, imageUrl, blobName, createNew } = body;

    if (createNew && cardData) {
      const scanCountry = await getUserScanCountry(access.id);
      const departmentId = await getPrimaryDepartmentId(access.id);

      const result = (await query(
        `INSERT INTO business_cards 
         (user_id, organization_id, department_id, name, company, job_title, email, phone, address, country, website, image_url, cloud_storage_url, raw_text)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          access.id,
          access.organizationId,
          departmentId,
          cardData.name,
          cardData.company || null,
          cardData.jobTitle || null,
          cardData.email || null,
          cardData.phone || null,
          cardData.address || null,
          scanCountry,
          cardData.website || null,
          imageUrl || null,
          blobName || null,
          cardData.rawText || null,
        ]
      )) as { insertId: number };

      return NextResponse.json({ success: true, cardId: result.insertId });
    }

    if (!cardId) {
      return NextResponse.json({ error: 'Card ID required' }, { status: 400 });
    }

    if (!(await canAccessCard(access, Number(cardId)))) {
      return NextResponse.json({ error: 'Card not found or unauthorized' }, { status: 404 });
    }

    await query(
      `UPDATE business_cards 
       SET name = ?, company = ?, job_title = ?, email = ?, phone = ?, address = ?, website = ?, image_url = COALESCE(?, image_url), cloud_storage_url = COALESCE(?, cloud_storage_url), raw_text = ?
       WHERE id = ? AND organization_id = ?`,
      [
        cardData.name,
        cardData.company || null,
        cardData.jobTitle || null,
        cardData.email || null,
        cardData.phone || null,
        cardData.address || null,
        cardData.website || null,
        imageUrl || null,
        blobName || null,
        cardData.rawText || null,
        cardId,
        access.organizationId,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update business card' },
      { status: 500 }
    );
  }
}
