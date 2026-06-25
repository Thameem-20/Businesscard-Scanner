import type { ExtractedCardData } from './types';

export type { ExtractedCardData };

async function optimizeImage(buffer: Buffer): Promise<Buffer> {
  try {
    const sharp = (await import('sharp')).default;
    const metadata = await sharp(buffer).metadata();
    
    let optimized = sharp(buffer);
    
    if (metadata.width && metadata.height) {
      const maxDimension = 2000;
      if (metadata.width > maxDimension || metadata.height > maxDimension) {
        optimized = optimized.resize(maxDimension, maxDimension, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }
    }
    
    const jpegBuffer = await optimized.jpeg({ quality: 85 }).toBuffer();
    
    if (jpegBuffer.length > 4 * 1024 * 1024) {
      return await optimized.jpeg({ quality: 70 }).toBuffer();
    }
    
    return jpegBuffer;
  } catch (error) {
    console.warn('Image optimization failed, using original:', error);
    return buffer;
  }
}

// Helper to convert title case
function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Helper to extract value from Azure field
function extractFieldValue(field: any): string | null {
  if (!field) return null;
  return field.valueString || field.content || field.value || null;
}

// Helper to extract array values from Azure field
function extractArrayValues(field: any): string[] {
  if (!field) return [];
  
  // Azure uses valueArray for arrays
  if (field.valueArray && Array.isArray(field.valueArray)) {
    return field.valueArray.map((item: any) => {
      // For ContactNames, structure has valueObject with FirstName/LastName
      if (item.valueObject) {
        const firstName = item.valueObject.FirstName?.valueString || item.valueObject.FirstName?.content || '';
        const lastName = item.valueObject.LastName?.valueString || item.valueObject.LastName?.content || '';
        if (firstName || lastName) {
          return `${firstName} ${lastName}`.trim();
        }
      }
      // For phone numbers, use valuePhoneNumber or content
      return item.content || item.valueString || item.valuePhoneNumber || item.value || '';
    }).filter((v: string) => v.length > 0);
  }
  
  // Single value fallback
  const single = extractFieldValue(field);
  return single ? [single] : [];
}

export async function processBusinessCard(imageFile: File): Promise<ExtractedCardData> {
  let endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT || '';
  const apiKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY || '';
  
  if (!apiKey || !endpoint) {
    throw new Error('Azure Document Intelligence API key and endpoint must be configured');
  }
  
  endpoint = endpoint.replace(/\/$/, '');

  // Convert File to buffer and optimize
  const arrayBuffer = await imageFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const optimizedBuffer = await optimizeImage(buffer);
  
  // Call Azure Business Card API
  const apiUrl = `${endpoint}/formrecognizer/documentModels/prebuilt-businessCard:analyze?api-version=2023-07-31`;
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Content-Type': 'application/octet-stream',
    },
    body: new Uint8Array(optimizedBuffer),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure API error: ${response.status} - ${errorText}`);
  }

  const operationLocation = response.headers.get('Operation-Location');
  if (!operationLocation) {
    throw new Error('No Operation-Location header in response');
  }

  // Poll for results
  let result;
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const resultResponse = await fetch(operationLocation, {
      headers: { 'Ocp-Apim-Subscription-Key': apiKey },
    });

    if (!resultResponse.ok) {
      throw new Error(`Failed to get results: ${resultResponse.status}`);
    }

    result = await resultResponse.json();
    
    if (result.status === 'succeeded') break;
    if (result.status === 'failed') {
      throw new Error('Azure processing failed');
    }
    
    attempts++;
  }

  if (!result || result.status !== 'succeeded') {
    throw new Error('Processing timed out');
  }

  // Extract data directly from Azure Business Card structured fields
  const data: ExtractedCardData = {
    rawText: result.analyzeResult?.content || '',
  };

  const document = result.analyzeResult?.documents?.[0];
  if (!document?.fields) {
    console.log('No structured fields found in Azure response');
    return data;
  }

  const fields = document.fields;
  
  // Log what Azure extracted for debugging
  console.log('Azure Business Card Fields:', JSON.stringify(fields, null, 2));

  // Extract Contact Name
  const contactNames = extractArrayValues(fields.ContactNames);
  if (contactNames.length > 0) {
    // Convert to title case if it's all caps
    let name = contactNames[0];
    if (name === name.toUpperCase()) {
      name = toTitleCase(name);
    }
    data.name = name;
    console.log('Extracted Name:', data.name);
  }

  // Extract Company Names
  const companyNames = extractArrayValues(fields.CompanyNames);
  if (companyNames.length > 0) {
    data.company = companyNames[0];
    console.log('Extracted Company:', data.company);
  }

  // Extract Job Titles
  const jobTitles = extractArrayValues(fields.JobTitles);
  if (jobTitles.length > 0) {
    // Convert to title case if all caps
    let title = jobTitles[0];
    if (title === title.toUpperCase()) {
      title = toTitleCase(title);
    }
    data.jobTitle = title;
    console.log('Extracted Job Title:', data.jobTitle);
  }

  // Extract Emails
  const emails = extractArrayValues(fields.Emails);
  if (emails.length > 0) {
    data.email = emails[0].toLowerCase();
    console.log('Extracted Email:', data.email);
  }

  // Extract Phone Numbers (WorkPhones, MobilePhones, OtherPhones)
  const workPhones = extractArrayValues(fields.WorkPhones);
  const mobilePhones = extractArrayValues(fields.MobilePhones);
  const otherPhones = extractArrayValues(fields.OtherPhones);
  const allPhones = [...workPhones, ...mobilePhones, ...otherPhones];
  
  if (allPhones.length > 0) {
    // Use the first phone number, prefer mobile or work
    data.phone = allPhones[0];
    console.log('Extracted Phone:', data.phone);
  }

  // Extract Websites
  const websites = extractArrayValues(fields.Websites);
  if (websites.length > 0) {
    let website = websites[0];
    // Clean up website
    website = website.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
    data.website = website;
    console.log('Extracted Website:', data.website);
  }

  // Extract Addresses
  const addresses = extractArrayValues(fields.Addresses);
  if (addresses.length > 0) {
    data.address = addresses[0];
    console.log('Extracted Address:', data.address);
  }

  // If no company but we have website, extract from domain
  if (!data.company && data.website) {
    const domainParts = data.website.split('.');
    if (domainParts.length >= 2) {
      const companyFromDomain = domainParts[0];
      if (companyFromDomain.length > 1) {
        data.company = companyFromDomain.charAt(0).toUpperCase() + companyFromDomain.slice(1).toLowerCase();
        console.log('Company from domain:', data.company);
      }
    }
  }

  // If no company but we have email, extract from email domain
  if (!data.company && data.email) {
    const emailDomain = data.email.split('@')[1];
    if (emailDomain) {
      const domainParts = emailDomain.split('.');
      if (domainParts.length > 0 && domainParts[0].length > 1) {
        data.company = domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1).toLowerCase();
        console.log('Company from email domain:', data.company);
      }
    }
  }

  console.log('Final extracted data:', data);
  return data;
}

// Keep these exports for backward compatibility
export async function extractTextFromImage(imageFile: File): Promise<string> {
  const result = await processBusinessCard(imageFile);
  return result.rawText;
}

export function parseBusinessCard(text: string): ExtractedCardData {
  // This is now a no-op since we use Azure's structured extraction
  return { rawText: text };
}
