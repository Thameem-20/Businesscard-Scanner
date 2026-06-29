import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getCardImageBuffer } from '@/lib/azure-blob-storage';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const organizationId = (session.user as any).organizationId;
    
    // Get all cards from the same organization
    const cards = await query(
      `SELECT bc.*, u.name as uploaded_by 
       FROM business_cards bc
       JOIN users u ON bc.user_id = u.id
       WHERE bc.organization_id = ?
       ORDER BY bc.created_at DESC`,
      [organizationId]
    ) as any[];
    
    if (cards.length === 0) {
      return NextResponse.json({ error: 'No cards to export' }, { status: 400 });
    }

    // Configure pdfkit to find font files BEFORE importing
    // Find pdfkit's data directory with font files using multiple strategies
    let fontDataPath: string | undefined;
    
    const possiblePaths = [
      // Strategy 1: Use require.resolve to find pdfkit
      (() => {
        try {
          const pdfkitPath = require.resolve('pdfkit/package.json');
          return path.join(path.dirname(pdfkitPath), 'js', 'data');
        } catch {
          return null;
        }
      })(),
      // Strategy 2: Try node_modules relative to cwd
      path.join(process.cwd(), 'node_modules', 'pdfkit', 'js', 'data'),
      // Strategy 3: Try node_modules relative to __dirname (if available)
      path.join(__dirname, '..', '..', '..', '..', 'node_modules', 'pdfkit', 'js', 'data'),
    ].filter(Boolean) as string[];
    
    for (const testPath of possiblePaths) {
      const resolvedPath = path.resolve(testPath);
      if (fs.existsSync(resolvedPath)) {
        fontDataPath = resolvedPath;
        break;
      }
    }
    
    if (fontDataPath) {
      // Set environment variable for pdfkit to find fonts (must be set before import)
      process.env.PDFKIT_STANDARD_FONTS = fontDataPath;
      // Also set on global object
      (global as any).PDFKIT_STANDARD_FONTS = fontDataPath;
      console.log('PDFKit font path set to:', fontDataPath);
    } else {
      console.warn('Warning: Could not find pdfkit font directory. PDF generation may fail.');
      console.warn('Searched paths:', possiblePaths);
    }

    // Dynamically import PDFDocument to ensure it's only loaded server-side
    const PDFDocument = (await import('pdfkit')).default;

    // Create PDF document
    const doc = new PDFDocument({
      margin: 50,
      size: 'LETTER',
    });

    // Collect PDF data chunks
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    
    return new Promise<NextResponse>((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        const headers = new Headers();
        headers.set('Content-Type', 'application/pdf');
        headers.set('Content-Disposition', `attachment; filename="business-cards-export-${Date.now()}.pdf"`);
        headers.set('Content-Length', pdfBuffer.length.toString());
        resolve(new NextResponse(pdfBuffer, { headers }));
      });

      doc.on('error', (error) => {
        reject(new NextResponse(JSON.stringify({ error: 'Failed to generate PDF' }), { status: 500 }));
      });

      // Page dimensions
      const pageWidth = doc.page.width - (doc.page.margins.left + doc.page.margins.right);
      const pageHeight = doc.page.height - (doc.page.margins.top + doc.page.margins.bottom);
      const cardWidth = pageWidth / 2 - 15; // Two cards per row, with spacing
      const cardHeight = pageHeight / 2 - 20; // Two rows, with spacing
      const cardsPerPage = 4;

      // Add title
      doc.fontSize(24).font('Helvetica-Bold').text('Business Cards Export', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).font('Helvetica').text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.fontSize(10).text(`Total Cards: ${cards.length}`, { align: 'center' });
      doc.moveDown();

      // Process cards - 4 per page in a 2x2 grid
      void (async () => {
        for (let index = 0; index < cards.length; index++) {
          const card = cards[index];

          if (index > 0 && index % cardsPerPage === 0) {
            doc.addPage();
          }

          const cardIndexOnPage = index % cardsPerPage;
          const row = Math.floor(cardIndexOnPage / 2);
          const col = cardIndexOnPage % 2;

          const x = doc.page.margins.left + (col * (cardWidth + 30));
          const y = doc.page.margins.top + 70 + (row * (cardHeight + 10));

          const savedX = doc.x;
          const savedY = doc.y;

          doc.x = x;
          doc.y = y;

          doc.fontSize(16).font('Helvetica-Bold').text(card.name || 'Unknown', {
            width: cardWidth - 10,
            ellipsis: true,
          });
          doc.moveDown(0.4);

          if (card.image_url || card.cloud_storage_url) {
            try {
              let imageBuffer: Buffer | null = null;

              imageBuffer = await getCardImageBuffer(card);

              if (!imageBuffer && card.image_url && !card.image_url.startsWith('http://') && !card.image_url.startsWith('https://')) {
                const imagePath = path.join(process.cwd(), 'public', card.image_url);
                if (fs.existsSync(imagePath)) {
                  imageBuffer = fs.readFileSync(imagePath);
                }
              }

              if (imageBuffer) {
                const imageWidth = cardWidth - 10;
                const imageHeight = 140;
                const imageY = doc.y;

                doc.image(imageBuffer, x, imageY, {
                  fit: [imageWidth, imageHeight],
                });
                doc.y = imageY + imageHeight + 10;
              }
            } catch (imageError) {
              console.error('Error loading image:', imageError);
            }
          }

          doc.fontSize(10).font('Helvetica');

          if (card.company) {
            doc.font('Helvetica-Bold').text('Company: ', { continued: true, width: cardWidth - 10 })
               .font('Helvetica').text(card.company, { width: cardWidth - 10 });
          }

          if (card.job_title) {
            doc.font('Helvetica-Bold').text('Job Title: ', { continued: true, width: cardWidth - 10 })
               .font('Helvetica').text(card.job_title, { width: cardWidth - 10 });
          }

          if (card.email) {
            doc.font('Helvetica-Bold').text('Email: ', { continued: true, width: cardWidth - 10 })
               .font('Helvetica').text(card.email, { width: cardWidth - 10 });
          }

          if (card.phone) {
            doc.font('Helvetica-Bold').text('Phone: ', { continued: true, width: cardWidth - 10 })
               .font('Helvetica').text(card.phone, { width: cardWidth - 10 });
          }

          if (card.website) {
            doc.font('Helvetica-Bold').text('Website: ', { continued: true, width: cardWidth - 10 })
               .font('Helvetica').text(card.website, { width: cardWidth - 10 });
          }

          doc.x = savedX;
          doc.y = savedY;
        }

        doc.end();
      })().catch((error) => {
        console.error('Export PDF generation error:', error);
        reject(new NextResponse(JSON.stringify({ error: 'Failed to generate PDF' }), { status: 500 }));
      });
    });
    
  } catch (error: any) {
    console.error('Export PDF error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export PDF' },
      { status: 500 }
    );
  }
}

