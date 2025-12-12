# Business Card Scanner

A comprehensive business card scanning application built with Next.js, featuring OCR, MySQL storage, organization-based sharing, and intelligent name matching.

## Features

- **OCR Scanning**: Upload business card images and extract contact information using Tesseract.js
- **MySQL Storage**: Direct MySQL database integration for storing business cards and user data
- **Organization Management**: Users belong to organizations and can view cards from colleagues in the same organization
- **Admin Panel**: Admins can create and manage users
- **Name Matching**: Intelligent duplicate detection - when scanning a card with an existing name, the system asks if you want to update the existing entry
- **Cloud Storage Ready**: Structure in place for AWS S3 integration (optional)
- **Zybo Tech CRM Integration**: Ready for CRM integration endpoints

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

1a. **Configure Azure Vision API**
   - Azure Vision API credentials are already configured in `.env.local`
   - The API key and endpoint are set up automatically
   - No additional installation required - it's a cloud-based service

2. **Database Setup**
   - Make sure your MySQL server is running
   - The connection string is already configured in `.env.local`
   - Run the SQL initialization script:
   ```bash
   mysql -u root < lib/db-init.sql
   ```
   Or manually execute the SQL in `lib/db-init.sql`

3. **Environment Variables**
   - Create `.env.local` file (already created with defaults)
   - Update `NEXTAUTH_SECRET` with a secure random string
   - Optional: Configure AWS S3 credentials for cloud storage
   - Optional: Configure Zybo Tech CRM API credentials

4. **Create Uploads Directory**
   ```bash
   mkdir -p public/uploads
   ```

5. **Run Development Server**
   ```bash
   npm run dev
   ```

6. **Access the Application**
   - Open [http://localhost:3000](http://localhost:3000)
   - Default admin credentials:
     - Email: `admin@example.com`
     - Password: `admin123` (change immediately in production)

## Database Schema

- **organizations**: Stores organization information
- **users**: User accounts with roles (admin/user) and organization associations
- **business_cards**: Stores scanned business card data with OCR-extracted information

## API Endpoints

- `POST /api/cards/scan` - Scan and process a business card image
- `POST /api/cards/update` - Update an existing business card
- `GET /api/cards/list` - List all business cards in user's organization
- `POST /api/users/create` - Create a new user (admin only)
- `GET /api/users/list` - List all users in organization (admin only)
- `GET /api/organizations/list` - List all organizations (admin only)

## Features in Detail

### Name Matching
When you scan a business card, the system:
1. Extracts text using OCR
2. Checks if a similar name exists in your organization
3. If found, shows a confirmation dialog asking if you want to update the existing card or create a new one
4. Uses Levenshtein distance algorithm for fuzzy name matching

### Organization-Based Sharing
- Users in the same organization can view each other's business cards
- Cards are filtered by organization_id automatically
- Admins can assign users to organizations

### Cloud Storage
The application is structured to support cloud storage:
- Images are currently stored locally in `public/uploads`
- AWS S3 integration can be added using the existing structure
- Update the scan API to upload to S3 instead of local storage

### Zybo Tech CRM Integration
Structure is in place for CRM integration:
- Add API endpoints in `app/api/zybo/` directory
- Use environment variables for API credentials
- Integrate with card creation/update workflows

## Production Considerations

1. Change default admin password immediately
2. Set a strong `NEXTAUTH_SECRET` in production
3. Configure proper database backups
4. Set up cloud storage (AWS S3) for images
5. Configure proper file upload limits in Next.js
6. Add rate limiting to API endpoints
7. Set up SSL/TLS for production
8. Configure proper CORS policies if needed
9. Add error logging and monitoring
10. Test OCR accuracy with your specific use case and adjust parsing logic

## Technology Stack

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type safety
- **NextAuth.js**: Authentication
- **MySQL2**: Direct MySQL database access
- **Azure Document Intelligence**: OCR for text extraction (cloud-based, highly accurate, optimized for structured documents)
- **Tailwind CSS**: Styling
- **React Dropzone**: File uploads
- **Lucide React**: Icons
