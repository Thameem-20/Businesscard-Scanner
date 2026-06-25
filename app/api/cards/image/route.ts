import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import {
  getReadableBlobUrl,
  isAzureBlobUrl,
} from '@/lib/azure-blob-storage';

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const imageUrl = request.nextUrl.searchParams.get('url');

    if (!imageUrl || !isAzureBlobUrl(imageUrl)) {
      return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
    }

    const readableUrl = await getReadableBlobUrl(imageUrl);
    return NextResponse.redirect(readableUrl);
  } catch (error: any) {
    console.error('Image proxy error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load image' },
      { status: 500 }
    );
  }
}
