import type { ExtractedCardData } from './types';

export type { ExtractedCardData };

async function optimizeImage(buffer: Buffer): Promise<Buffer> {
  try {
    // Dynamically import sharp only on server-side
    const sharp = (await import('sharp')).default;
    
    // Get image metadata
    const metadata = await sharp(buffer).metadata();
    
    // Resize if image is too large (Azure Vision API limit is 4MB, max 50MP)
    let optimized = sharp(buffer);
    
    if (metadata.width && metadata.height) {
      const maxDimension = 2000; // Azure Vision works well up to 2000px
      if (metadata.width > maxDimension || metadata.height > maxDimension) {
        optimized = optimized.resize(maxDimension, maxDimension, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }
    }
    
    // Ensure image size is under 4MB (Azure Vision limit)
    // Convert to JPEG with quality adjustment if needed
    const jpegBuffer = await optimized.jpeg({ quality: 85 }).toBuffer();
    
    // If still too large, reduce quality further
    if (jpegBuffer.length > 4 * 1024 * 1024) {
      return await optimized.jpeg({ quality: 70 }).toBuffer();
    }
    
    return jpegBuffer;
  } catch (error) {
    // If sharp fails, return original buffer
    console.warn('Image optimization failed, using original:', error);
    return buffer;
  }
}

export async function extractTextFromImage(imageFile: File): Promise<string> {
  let endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT || 'https://thameem-20.cognitiveservices.azure.com';
  const apiKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY || 'F76yLJIBIizn7QA031cwoux7A3tloY9CEuK4zAw8MVmikFo2vBUzJQQJ99BLACYeBjFXJ3w3AAALACOGsVhL';
  
  if (!apiKey || !endpoint) {
    throw new Error('Azure Document Intelligence API key and endpoint must be configured');
  }
  
  // Ensure endpoint doesn't have trailing slash
  endpoint = endpoint.replace(/\/$/, '');

  // Convert File to buffer
  const arrayBuffer = await imageFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Optimize image for Azure Document Intelligence API
  const optimizedBuffer = await optimizeImage(buffer);
  
  try {
    // Use prebuilt-businessCard model for structured business card extraction
    // This provides better accuracy for business card fields
    const apiUrl = `${endpoint}/formrecognizer/documentModels/prebuilt-businessCard:analyze?api-version=2023-07-31`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/octet-stream',
      },
      body: optimizedBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure Document Intelligence API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Get the operation location
    const operationLocation = response.headers.get('Operation-Location');
    if (!operationLocation) {
      throw new Error('No Operation-Location header in response');
    }

    // Poll for results (Azure Document Intelligence is asynchronous)
    let result;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max wait time
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      const resultResponse = await fetch(operationLocation, {
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
        },
      });

      if (!resultResponse.ok) {
        throw new Error(`Failed to get OCR results: ${resultResponse.status}`);
      }

      result = await resultResponse.json();
      
      // Check if processing is complete
      if (result.status === 'succeeded') {
        break;
      } else if (result.status === 'failed') {
        throw new Error('Azure Document Intelligence OCR processing failed');
      }
      
      attempts++;
    }

    if (!result || result.status !== 'succeeded') {
      throw new Error('OCR processing timed out');
    }

    // Extract text from Azure Document Intelligence response
    // The businessCard model provides structured fields, but we also need raw text for parsing
    const textLines: string[] = [];
    const structuredData: any = {}; // Store structured fields separately
    
    if (result.analyzeResult) {
      // Try to extract from documents (structured fields from businessCard model)
      if (result.analyzeResult.documents && result.analyzeResult.documents.length > 0) {
        const document = result.analyzeResult.documents[0];
        // Extract structured fields from business card model
        if (document.fields) {
          // Contact names from structured fields (most reliable)
          if (document.fields.ContactNames && document.fields.ContactNames.values) {
            structuredData.contactNames = document.fields.ContactNames.values.map((val: any) => val.content || val.value);
          } else if (document.fields.ContactNames && document.fields.ContactNames.content) {
            structuredData.contactNames = [document.fields.ContactNames.content];
          } else if (document.fields.ContactNames && document.fields.ContactNames.value) {
            structuredData.contactNames = [document.fields.ContactNames.value];
          }
          
          // Company names from structured fields
          if (document.fields.CompanyNames && document.fields.CompanyNames.values) {
            structuredData.companyNames = document.fields.CompanyNames.values.map((val: any) => val.content || val.value);
          } else if (document.fields.CompanyNames && document.fields.CompanyNames.content) {
            structuredData.companyNames = [document.fields.CompanyNames.content];
          } else if (document.fields.CompanyNames && document.fields.CompanyNames.value) {
            structuredData.companyNames = [document.fields.CompanyNames.value];
          }
          
          // Job titles from structured fields
          if (document.fields.JobTitles && document.fields.JobTitles.values) {
            structuredData.jobTitles = document.fields.JobTitles.values.map((val: any) => val.content || val.value);
          } else if (document.fields.JobTitles && document.fields.JobTitles.content) {
            structuredData.jobTitles = [document.fields.JobTitles.content];
          } else if (document.fields.JobTitles && document.fields.JobTitles.value) {
            structuredData.jobTitles = [document.fields.JobTitles.value];
          }
          
          // Phone numbers from structured fields (most reliable)
          if (document.fields.PhoneNumbers && document.fields.PhoneNumbers.values) {
            structuredData.phoneNumbers = document.fields.PhoneNumbers.values.map((val: any) => val.content || val.value);
          } else if (document.fields.PhoneNumbers && document.fields.PhoneNumbers.content) {
            structuredData.phoneNumbers = [document.fields.PhoneNumbers.content];
          } else if (document.fields.PhoneNumbers && document.fields.PhoneNumbers.value) {
            structuredData.phoneNumbers = [document.fields.PhoneNumbers.value];
          }
          
          // Emails from structured fields
          if (document.fields.Emails && document.fields.Emails.values) {
            structuredData.emails = document.fields.Emails.values.map((val: any) => val.content || val.value);
          } else if (document.fields.Emails && document.fields.Emails.content) {
            structuredData.emails = [document.fields.Emails.content];
          } else if (document.fields.Emails && document.fields.Emails.value) {
            structuredData.emails = [document.fields.Emails.value];
          }
          
          // Websites from structured fields
          if (document.fields.Websites && document.fields.Websites.values) {
            structuredData.websites = document.fields.Websites.values.map((val: any) => val.content || val.value);
          } else if (document.fields.Websites && document.fields.Websites.content) {
            structuredData.websites = [document.fields.Websites.content];
          } else if (document.fields.Websites && document.fields.Websites.value) {
            structuredData.websites = [document.fields.Websites.value];
          }
          
          // Extract all field values as text for parsing (fallback)
          Object.values(document.fields).forEach((field: any) => {
            if (field && field.content) {
              textLines.push(field.content);
            } else if (field && field.value) {
              textLines.push(field.value);
            } else if (field && field.values) {
              field.values.forEach((val: any) => {
                if (val.content) textLines.push(val.content);
                if (val.value) textLines.push(val.value);
              });
            }
          });
        }
      }
      
      // Also extract from paragraphs for complete text
      if (result.analyzeResult.paragraphs) {
        for (const paragraph of result.analyzeResult.paragraphs) {
          if (paragraph.content && !textLines.includes(paragraph.content)) {
            textLines.push(paragraph.content);
          }
        }
      }
      
      // Extract from pages if paragraphs aren't available
      if (textLines.length === 0 && result.analyzeResult.pages) {
        for (const page of result.analyzeResult.pages) {
          if (page.lines) {
            for (const line of page.lines) {
              if (line.content) {
                textLines.push(line.content);
              }
            }
          }
        }
      }
      
      // Fallback: use raw content
      if (textLines.length === 0 && result.analyzeResult.content) {
        textLines.push(result.analyzeResult.content);
      }
    }

    // Store structured data in the text so parseBusinessCard can access it
    // We'll pass structured data as a special marker so parseBusinessCard can prioritize it
    const fullText = textLines.join('\n');
    
    // Store structured data in a way that parseBusinessCard can access it
    // We'll append it to the text with special markers (parseBusinessCard will extract it)
    let enhancedText = fullText;
    
    if (structuredData.contactNames && structuredData.contactNames.length > 0) {
      enhancedText += '\n__STRUCTURED_CONTACT_NAMES__: ' + structuredData.contactNames.join(' | ');
    }
    if (structuredData.companyNames && structuredData.companyNames.length > 0) {
      enhancedText += '\n__STRUCTURED_COMPANY_NAMES__: ' + structuredData.companyNames.join(' | ');
    }
    if (structuredData.jobTitles && structuredData.jobTitles.length > 0) {
      enhancedText += '\n__STRUCTURED_JOB_TITLES__: ' + structuredData.jobTitles.join(' | ');
    }
    if (structuredData.phoneNumbers && structuredData.phoneNumbers.length > 0) {
      enhancedText += '\n__STRUCTURED_PHONE_NUMBERS__: ' + structuredData.phoneNumbers.join(' | ');
    }
    if (structuredData.emails && structuredData.emails.length > 0) {
      enhancedText += '\n__STRUCTURED_EMAILS__: ' + structuredData.emails.join(' | ');
    }
    if (structuredData.websites && structuredData.websites.length > 0) {
      enhancedText += '\n__STRUCTURED_WEBSITES__: ' + structuredData.websites.join(' | ');
    }
    
    return enhancedText;
    
  } catch (error: any) {
    console.error('Azure Document Intelligence OCR error:', error);
    throw new Error(`OCR failed: ${error.message || 'Unknown error'}`);
  }
}

export function parseBusinessCard(text: string): ExtractedCardData {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const data: ExtractedCardData = { rawText: text };
  
  // Extract structured data from special markers
  const structuredData: any = {};
  const structuredLines = lines.filter(line => line.startsWith('__STRUCTURED_'));
  const regularLines = lines.filter(line => !line.startsWith('__STRUCTURED_'));
  
  structuredLines.forEach(line => {
    if (line.includes('__STRUCTURED_CONTACT_NAMES__:')) {
      structuredData.contactNames = line.split(':')[1]?.split('|').map(s => s.trim()).filter(s => s.length > 0) || [];
    } else if (line.includes('__STRUCTURED_COMPANY_NAMES__:')) {
      structuredData.companyNames = line.split(':')[1]?.split('|').map(s => s.trim()).filter(s => s.length > 0) || [];
    } else if (line.includes('__STRUCTURED_JOB_TITLES__:')) {
      structuredData.jobTitles = line.split(':')[1]?.split('|').map(s => s.trim()).filter(s => s.length > 0) || [];
    } else if (line.includes('__STRUCTURED_PHONE_NUMBERS__:')) {
      structuredData.phoneNumbers = line.split(':')[1]?.split('|').map(s => s.trim()).filter(s => s.length > 0) || [];
    } else if (line.includes('__STRUCTURED_EMAILS__:')) {
      structuredData.emails = line.split(':')[1]?.split('|').map(s => s.trim()).filter(s => s.length > 0) || [];
    } else if (line.includes('__STRUCTURED_WEBSITES__:')) {
      structuredData.websites = line.split(':')[1]?.split('|').map(s => s.trim()).filter(s => s.length > 0) || [];
    }
  });
  
  // Use regular lines (without structured markers) for parsing
  const textForParsing = regularLines.join('\n');
  
  // Patterns
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
  // Enhanced phone pattern - captures various formats:
  // - US: (555) 123-4567, 555-123-4567, 555.123.4567, 5551234567
  // - International: +1 555 123 4567, +44 20 1234 5678
  // - With extensions: 555-123-4567 ext 123, 555-123-4567 x123
  // - Spaces and dashes: 555 123 4567, 555-123-4567
  const phonePattern = /(\+?\d{1,4}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}([-.\s]?(ext|extension|x|ex|xt)[-.\s]?\d{1,6})?/gi;
  const websitePattern = /(https?:\/\/)?(www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
  const addressKeywords = ['street', 'st', 'avenue', 'ave', 'road', 'rd', 'drive', 'dr', 'boulevard', 'blvd', 'suite', 'ste', 'lane', 'ln', 'way', 'circle', 'cir', 'parkway', 'pkwy'];
  const jobTitleKeywords = ['manager', 'director', 'president', 'ceo', 'cto', 'cfo', 'vp', 'vice president', 'lead', 'senior', 'junior', 'associate', 'executive', 'coordinator', 'specialist', 'engineer', 'developer', 'designer', 'analyst', 'consultant', 'officer', 'chief', 'head', 'supervisor', 'coordinator', 'administrator', 'advisor'];
  const companyIndicators = ['inc', 'llc', 'ltd', 'corp', 'corporation', 'company', 'co', 'group', 'associates', 'partners', 'solutions', 'systems', 'technologies', 'tech', 'international', 'global', 'industries'];
  
  // Prioritize structured data over parsed data
  // Extract email - use structured first
  if (structuredData.emails && structuredData.emails.length > 0) {
    data.email = structuredData.emails[0];
  } else {
    const emailMatches = textForParsing.match(emailPattern);
    if (emailMatches && emailMatches.length > 0) {
      data.email = emailMatches[0];
    }
  }
  
  // Extract phone - prioritize structured data
  if (structuredData.phoneNumbers && structuredData.phoneNumbers.length > 0) {
    // Filter and clean phone numbers
    const validPhones = structuredData.phoneNumbers
      .map((phone: string) => phone.replace(/\s+/g, ' ').trim())
      .filter((phone: string) => {
        const digitsOnly = phone.replace(/\D/g, '');
        return digitsOnly.length >= 7 && digitsOnly.length <= 15;
      });
    
    if (validPhones.length > 0) {
      data.phone = validPhones.reduce((longest: string, current: string) => 
        current.length > longest.length ? current : longest
      );
      data.phone = data.phone
        .replace(/\s+/g, ' ')
        .replace(/[.]{2,}/g, '.')
        .trim();
    }
  }
  
  // If no structured phone, try parsing
  if (!data.phone) {
    // First, try to find phone numbers in various formats
    const phoneMatches = textForParsing.match(phonePattern);
    if (phoneMatches && phoneMatches.length > 0) {
      // Filter and clean phone numbers
      const validPhones = phoneMatches
        .map(phone => phone.replace(/\s+/g, ' ').trim())
        .filter(phone => {
          // Remove obvious false positives
          const digitsOnly = phone.replace(/\D/g, '');
          // Phone numbers should have at least 7 digits and at most 15
          return digitsOnly.length >= 7 && digitsOnly.length <= 15;
        });
      
      if (validPhones.length > 0) {
        // Take the longest phone number (usually the most complete) or first valid one
        data.phone = validPhones.reduce((longest, current) => 
          current.length > longest.length ? current : longest
        );
        
        // Clean up the phone number format
        data.phone = data.phone
          .replace(/\s+/g, ' ') // Normalize spaces
          .replace(/[.]{2,}/g, '.') // Remove multiple dots
          .trim();
      }
    }
    
    // Also check each line individually for phone patterns (sometimes OCR splits them)
    if (!data.phone) {
      for (const line of regularLines) {
        // Look for phone-like patterns in each line
        const linePhoneMatch = line.match(/\b(\+?\d{1,4}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b/g);
        if (linePhoneMatch) {
          for (const match of linePhoneMatch) {
            const digitsOnly = match.replace(/\D/g, '');
            if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
              data.phone = match.trim();
              break;
            }
          }
          if (data.phone) break;
        }
      }
    }
    
    // Additional check: look for phone numbers with country codes at start of line
    if (!data.phone) {
      const phoneWithCountryCode = /^(\+?\d{1,4}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/;
      for (const line of regularLines) {
        const match = line.match(phoneWithCountryCode);
        if (match) {
          const digitsOnly = match[0].replace(/\D/g, '');
          if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
            data.phone = match[0].trim();
            break;
          }
        }
      }
    }
  }
  
  // Extract website - prioritize structured data
  if (structuredData.websites && structuredData.websites.length > 0) {
    data.website = structuredData.websites[0];
  } else {
    // Look for www. or domain patterns, exclude email prefixes
    const websiteMatches = textForParsing.match(websitePattern);
    if (websiteMatches && websiteMatches.length > 0) {
      // Filter out emails and email prefixes
      const validWebsites = websiteMatches.filter(url => {
        // Must not contain @ (not an email)
        if (url.includes('@')) return false;
        // Must contain a dot (domain extension) or www
        if (!url.includes('.') && !url.toLowerCase().includes('www')) return false;
        // Must not be just an email prefix (single word, no dots, no www)
        const cleanUrl = url.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
        if (!cleanUrl.includes('.') && cleanUrl.length < 10) return false;
        return true;
      });
      
      if (validWebsites.length > 0) {
        // Prioritize http/https URLs, then www., then others
        const httpUrls = validWebsites.filter(url => url.toLowerCase().startsWith('http'));
        const wwwUrls = validWebsites.filter(url => url.toLowerCase().includes('www.'));
        
        if (httpUrls.length > 0) {
          data.website = httpUrls[0];
        } else if (wwwUrls.length > 0) {
          data.website = wwwUrls[0];
        } else {
          data.website = validWebsites[0];
        }
      }
    }
  }
  
  // Extract job title - prioritize structured data
  if (structuredData.jobTitles && structuredData.jobTitles.length > 0) {
    data.jobTitle = structuredData.jobTitles[0];
  }
  
  // Extract company from website URL FIRST (highest priority)
  // This handles cases where company name is on the back of the card but URL is on front
  if (data.website) {
    try {
      let domain = data.website;
      
      // Remove protocol (http://, https://)
      domain = domain.replace(/^https?:\/\//i, '');
      
      // Remove www. prefix
      domain = domain.replace(/^www\./i, '');
      
      // Remove path, query params, fragments (everything after /)
      domain = domain.split('/')[0];
      
      // Remove port if present
      domain = domain.split(':')[0];
      
      // Split by dots to get domain parts
      const domainParts = domain.split('.');
      
      // Extract the main domain name (usually the second-to-last part)
      // Examples: raft.ai -> raft, company.co.uk -> company, subdomain.company.com -> company
      let companyName = '';
      
      // For domains with 2 parts (e.g., raft.ai), take the first part
      // For domains with 3+ parts (e.g., company.co.uk, subdomain.company.com), take the second-to-last
      if (domainParts.length >= 2) {
        // Common TLDs that might have 2 parts (like .co.uk, .com.au)
        const twoPartTLDs = ['co', 'com', 'net', 'org', 'gov', 'edu', 'ac', 'sch'];
        const lastPart = domainParts[domainParts.length - 1].toLowerCase();
        const secondLastPart = domainParts[domainParts.length - 2].toLowerCase();
        
        // If second-to-last is a common TLD-like word, it might be part of the TLD
        // Otherwise, it's likely the company name
        if (domainParts.length >= 3 && twoPartTLDs.includes(secondLastPart)) {
          // Likely a two-part TLD (e.g., company.co.uk)
          companyName = domainParts[domainParts.length - 3];
        } else {
          // Regular domain (e.g., raft.ai, company.com, subdomain.company.com)
          companyName = domainParts[domainParts.length - 2];
        }
      }
      
      // Clean up and capitalize the company name
      if (companyName && companyName.length > 1) {
        // Remove any numbers or special characters at the start/end
        companyName = companyName.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '');
        
        if (companyName.length > 1) {
          // Capitalize: first letter uppercase, rest lowercase
          companyName = companyName.charAt(0).toUpperCase() + companyName.slice(1).toLowerCase();
          data.company = companyName;
        }
      }
    } catch (error) {
      // If extraction fails, just skip it
      console.warn('Failed to extract company name from website:', error);
    }
  }
  
  // Extract address (lines with street numbers and address keywords)
  const addressLines: string[] = [];
  for (const line of regularLines) {
    const lowerLine = line.toLowerCase();
    const hasNumber = /\d+/.test(line);
    const hasAddressKeyword = addressKeywords.some(keyword => lowerLine.includes(keyword));
    const startsWithNumber = /^\d+/.test(line);
    
    // Skip if it's an email, phone, or website
    if (emailPattern.test(line) || phonePattern.test(line) || websitePattern.test(line)) {
      continue;
    }
    
    if (hasNumber && (hasAddressKeyword || startsWithNumber) && line.length > 5) {
      addressLines.push(line);
    }
  }
  if (addressLines.length > 0) {
    data.address = addressLines.join(', ');
  }
  
  // Extract job title (lines containing job title keywords) - only if not already set from structured data
  if (!data.jobTitle) {
    for (const line of regularLines) {
      const lowerLine = line.toLowerCase();
      // Check if line contains job title keywords and is not too long (job titles are usually short)
      if (line.length < 50 && jobTitleKeywords.some(keyword => lowerLine.includes(keyword))) {
        // Additional check: should not be an email, phone, or website
        if (!emailPattern.test(line) && !phonePattern.test(line) && !websitePattern.test(line)) {
          data.jobTitle = line;
          break;
        }
      }
    }
  }
  
  // Function to check if a name matches an email address (part before @)
  const nameMatchesEmail = (name: string, email: string): boolean => {
    if (!name || !email) return false;
    
    // Extract the username part (before @) and convert to lowercase
    const emailUsername = email.split('@')[0].toLowerCase();
    const nameParts = name.toLowerCase().split(/\s+/).filter(part => part.length >= 2);
    
    console.log('Checking if name matches email username:', { name, emailUsername, nameParts });
    
    // Split email username by common separators (., -, _)
    const emailParts = emailUsername.split(/[._-]+/).filter(part => part.length >= 2);
    
    console.log('Email parts:', emailParts);
    
    // Strategy 1: Check if email parts match name parts
    // e.g., "john.smith" matches "John Smith"
    let matchCount = 0;
    for (const namePart of nameParts) {
      for (const emailPart of emailParts) {
        // Exact match
        if (namePart === emailPart) {
          matchCount++;
          console.log('Exact match found:', namePart);
          break;
        }
        // Partial match: email part starts with name part or vice versa
        // e.g., "dan" matches "danielle", "smith" matches "smithson"
        if (emailPart.startsWith(namePart) || namePart.startsWith(emailPart)) {
          if (Math.min(namePart.length, emailPart.length) >= 3) {
            matchCount++;
            console.log('Partial match found:', namePart, 'with', emailPart);
            break;
          }
        }
      }
    }
    
    // Need at least 1 match for 2-word names, or 2 matches for longer names
    const requiredMatches = nameParts.length >= 3 ? 2 : 1;
    if (matchCount >= requiredMatches) {
      console.log('Name matches email! Match count:', matchCount);
      return true;
    }
    
    // Strategy 2: Check if email username contains concatenated name parts
    // e.g., "johnsmith" matches "John Smith"
    const concatenatedName = nameParts.join('');
    if (concatenatedName.length >= 5 && emailUsername.includes(concatenatedName)) {
      console.log('Concatenated name match found');
      return true;
    }
    
    // Strategy 3: Check for initials pattern (first letter of each name part)
    // e.g., "jsmith" or "j.smith" matches "John Smith"
    if (nameParts.length >= 2 && emailParts.length >= 2) {
      const firstInitial = nameParts[0][0];
      const lastName = nameParts[nameParts.length - 1];
      
      // Check patterns like "jsmith" or "j.smith"
      for (const emailPart of emailParts) {
        if (emailPart === lastName || emailPart.startsWith(lastName.substring(0, Math.min(4, lastName.length)))) {
          // Found last name, check if another part starts with first initial
          if (emailUsername.startsWith(firstInitial) || emailParts.some(p => p === firstInitial)) {
            console.log('Initial + lastname pattern match found');
            return true;
          }
        }
      }
    }
    
    console.log('No match found between name and email');
    return false;
  };
  
  // Extract name from email first (we'll use this for validation)
  let nameFromEmail = '';
  if (data.email) {
    const emailParts = data.email.split('@')[0];
    nameFromEmail = emailParts
      .replace(/[._-]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(/\s+/)
      .filter(word => word.length > 1)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  // STEP 1: Extract names from card (Azure ContactNames)
  let cardName = '';
  if (structuredData.contactNames && structuredData.contactNames.length > 0) {
    console.log('Azure ContactNames:', structuredData.contactNames);
    console.log('Email:', data.email);
    console.log('Name from email:', nameFromEmail);
    
    // Check each contact name to see if it matches the email
    for (const contactName of structuredData.contactNames) {
      const trimmed = contactName.trim();
      const lowerTrimmed = trimmed.toLowerCase();
      const wordCount = trimmed.split(/\s+/).length;
      
      // === STRICT FILTERING FOR SLOGANS/COMPANY TEXT ===
      
      // 1. Skip if too many words (names rarely have more than 4 words)
      if (wordCount > 4) {
        console.log('Skipping (too many words):', trimmed);
        continue;
      }
      
      // 2. Skip if only 1 word and it's all caps (likely company name)
      if (wordCount === 1 && trimmed === trimmed.toUpperCase()) {
        console.log('Skipping (single word all caps):', trimmed);
        continue;
      }
      
      // 3. Skip if contains common company/slogan/title words
      const companyWords = [
        'solutions', 'services', 'group', 'international', 'consulting', 'management', 
        'enterprise', 'global', 'worldwide', 'limited', 'ltd', 'inc', 'corp', 'llc',
        'technology', 'technologies', 'software', 'systems', 'network', 'digital',
        'partner', 'partners', 'associates', 'co', 'company', 'corporation',
        'member', 'team', 'professional', 'certified', 'expert', 'specialist',
        'leading', 'trusted', 'innovative', 'award', 'winning', 'best', 'top',
        'since', 'est', 'established', 'founded'
      ];
      if (companyWords.some(word => lowerTrimmed.includes(word))) {
        console.log('Skipping (contains company words):', trimmed);
        continue;
      }
      
      // 4. Skip if contains "of the" or similar phrases (slogans)
      if (lowerTrimmed.includes(' of ') || lowerTrimmed.includes(' the ') || 
          lowerTrimmed.includes(' a ') || lowerTrimmed.includes(' an ')) {
        console.log('Skipping (contains articles/prepositions):', trimmed);
        continue;
      }
      
      // 5. Skip if all words are capitalized (likely a slogan like "Member Of The Otto Group")
      const words = trimmed.split(/\s+/);
      const allWordsCapitalized = words.every(w => /^[A-Z]/.test(w));
      if (allWordsCapitalized && wordCount >= 3) {
        console.log('Skipping (all words capitalized, likely slogan):', trimmed);
        continue;
      }
      
      // 6. Validate it looks like a person's name
      // Names should be 2-4 words, each starting with capital letter
      const looksLikeName = wordCount >= 2 && wordCount <= 4 && 
                           words.every(w => /^[A-Z][a-z]+$/.test(w) || w.length <= 3);
      
      if (!looksLikeName) {
        console.log('Skipping (does not look like a name):', trimmed);
        continue;
      }
      
      // === NOW CHECK IF IT MATCHES EMAIL ===
      
      // If we have an email, MUST match email to be accepted
      if (data.email) {
        if (nameMatchesEmail(trimmed, data.email)) {
          cardName = trimmed;
          console.log('Found matching name from card:', trimmed);
          break;
        } else {
          console.log('Name does not match email, skipping:', trimmed);
          // Don't use this name even as a candidate if it doesn't match email
          continue;
        }
      } else {
        // No email to validate, accept if it passed all filters
        if (!cardName) {
          cardName = trimmed;
          console.log('Using name from card (no email to validate):', trimmed);
        }
      }
    }
  }
  
  // STEP 2: Validate card name against email, or use email name
  if (cardName && data.email) {
    // Check if card name matches email
    if (nameMatchesEmail(cardName, data.email)) {
      data.name = cardName;
      console.log('Using card name (matches email):', cardName);
    } else {
      // Card name doesn't match email - it might be a company name or slogan
      // Use name from email instead
      if (nameFromEmail && nameFromEmail.split(/\s+/).length >= 2) {
        data.name = nameFromEmail;
        console.log('Card name does not match email, using email name:', nameFromEmail);
      } else {
        // Email name is poor quality, use card name anyway
        data.name = cardName;
        console.log('Using card name (email name poor quality):', cardName);
      }
    }
  } else if (cardName) {
    // No email to validate against, use card name
    data.name = cardName;
    console.log('Using card name (no email):', cardName);
  } else if (nameFromEmail && nameFromEmail.split(/\s+/).length >= 2) {
    // No card name found, use email
    data.name = nameFromEmail;
    console.log('Using email name (no card name found):', nameFromEmail);
  }
  
  // If company not set from URL, try structured company names
  if (!data.company && structuredData.companyNames && structuredData.companyNames.length > 0) {
    data.company = structuredData.companyNames[0].trim();
  }
  
  // Identify name and company (more intelligent approach)
  // Filter out lines that are emails, phones, websites, job titles, or addresses
  const candidateLines = regularLines.filter(line => {
    const lowerLine = line.toLowerCase();
    return !emailPattern.test(line) &&
           !phonePattern.test(line) &&
           !websitePattern.test(line) &&
           line !== data.jobTitle &&
           !addressLines.includes(line) &&
           line.length > 0 &&
           line.length < 100;
  });
  
  // Extract company from email domain if we find it
  let companyFromDomain: string | null = null;
  if (data.email && !data.company) {
    const emailDomain = data.email.split('@')[1];
    if (emailDomain) {
      // Extract company name from domain (e.g., "raft.ai" -> "raft", "shipsgo.com" -> "shipsgo")
      const domainParts = emailDomain.split('.');
      if (domainParts.length > 0) {
        companyFromDomain = domainParts[0]
          .replace(/\d+/g, '') // Remove numbers
          .charAt(0).toUpperCase() + domainParts[0].slice(1).toLowerCase();
      }
    }
  }
  
  // Identify potential company names (ALL CAPS, single word, lowercase brands, or has company indicators)
  const potentialCompanies: string[] = [];
  const potentialNames: string[] = [];
  
  for (const line of candidateLines) {
    const lowerLine = line.toLowerCase();
    const isAllCaps = line === line.toUpperCase() && line.length > 1;
    const isAllLowercase = line === line.toLowerCase() && line.length > 1 && !/[A-Z]/.test(line);
    const isSingleWord = line.split(/\s+/).length === 1;
    const hasCompanyIndicator = companyIndicators.some(ind => lowerLine.includes(ind));
    const wordCount = line.split(/\s+/).length;
    
    // Company indicators: 
    // - ALL CAPS (single word or short phrases)
    // - All lowercase single words (like "raft", "shipsgo")
    // - Has company keywords
    // - Single word that's not too long
    if (hasCompanyIndicator || 
        (isAllCaps && (isSingleWord || wordCount <= 3)) ||
        (isAllLowercase && isSingleWord && line.length >= 3 && line.length <= 15) || // Lowercase brands like "raft"
        (isSingleWord && line.length <= 15 && /^[A-Z]+$/.test(line))) {
      potentialCompanies.push(line);
    }
    // Name indicators: has both upper and lowercase, 2-5 words, looks like a person's name
    else if (!isAllCaps && 
             !isAllLowercase && // Exclude all lowercase (likely company brands)
             wordCount >= 1 && wordCount <= 5 &&
             /^[A-Za-z\s\.\-\']+$/.test(line) &&
             line.length >= 3 &&
             !hasCompanyIndicator) {
      // Additional check: should not be too short if it's a single word
      if (wordCount > 1 || line.length > 5) {
        potentialNames.push(line);
      }
    }
  }
  
  // Assign company: URL already has priority (set above), then structured, then lines with company indicators
  if (!data.company && potentialCompanies.length > 0) {
    // Prefer lines with company indicators
    const withIndicator = potentialCompanies.find(line => 
      companyIndicators.some(ind => line.toLowerCase().includes(ind))
    );
    if (withIndicator) {
      data.company = withIndicator;
    } else {
      // Otherwise use first potential company
      data.company = potentialCompanies[0];
    }
  }
  
  // If still no company, try extracting from email domain
  if (!data.company && companyFromDomain) {
    // Check if the domain company name appears in the text (might be in lowercase)
    const domainLower = companyFromDomain.toLowerCase();
    const foundInText = candidateLines.find(line => 
      line.toLowerCase() === domainLower || 
      line.toLowerCase().includes(domainLower)
    );
    if (foundInText) {
      data.company = foundInText;
    } else {
      // Use the capitalized version from domain
      data.company = companyFromDomain;
    }
  }
  
  // Assign name: prioritize structured name (already set above), then name from email, then potential names
  if (!data.name) {
    if (potentialNames.length > 0) {
      // Prefer names that are 2-3 words (most common for full names)
      const fullName = potentialNames.find(n => n.split(/\s+/).length >= 2 && n.split(/\s+/).length <= 3);
      data.name = fullName || potentialNames[0];
    } else if (candidateLines.length > 0 && !potentialCompanies.includes(candidateLines[0])) {
      // Fallback: use first candidate line if it's not a company
      data.name = candidateLines[0];
    }
  }
  
  // If we have company but no name, and there are other candidate lines, try them
  if (data.company && !data.name) {
    const remainingCandidates = candidateLines.filter(line => 
      line !== data.company && 
      line !== data.jobTitle &&
      !potentialCompanies.includes(line)
    );
    if (remainingCandidates.length > 0) {
      const bestName = remainingCandidates.find(line => {
        const words = line.split(/\s+/);
        const isAllCapsLine = line === line.toUpperCase();
        return words.length >= 1 && words.length <= 5 && !isAllCapsLine;
      });
      if (bestName) {
        data.name = bestName;
      }
    }
  }
  
  // Final cleanup: remove common prefixes/suffixes from name
  if (data.name) {
    data.name = data.name
      .replace(/^(mr\.?|mrs\.?|ms\.?|dr\.?|prof\.?)\s+/i, '') // Remove titles
      .replace(/^(at|of|from|@)\s+/i, '') // Remove "at", "of", "from"
      .trim();
    
    // If name is still all caps and short, it might actually be a company
    if (data.name === data.name.toUpperCase() && data.name.length <= 10 && data.name.split(/\s+/).length === 1) {
      if (!data.company) {
        data.company = data.name;
        data.name = undefined;
      } else {
        data.name = undefined; // Clear it if we already have a company
      }
    }
  }
  
  // Clean up company name
  if (data.company) {
    data.company = data.company
      .replace(/^(at|of|from|@|member\s+of\s+the\s+)\s*/i, '') // Remove "at", "of", "from", "@", "member of the"
      .replace(/^-+$/g, '') // Remove lines that are just dashes
      .trim();
    
    // If company is just dashes or empty after cleanup, clear it
    if (data.company === '' || /^-+$/.test(data.company)) {
      data.company = undefined;
    }
  }
  
  // Final website cleanup - make sure it's not an email prefix
  if (data.website) {
    // Clean up website
    let cleanWebsite = data.website
      .replace(/^https?:\/\//i, '') // Remove http:// or https://
      .replace(/^www\./i, '') // Remove www.
      .trim();
    
    // If website looks like an email prefix (no dots, short, just letters), remove it
    if (!cleanWebsite.includes('.') && 
        cleanWebsite.length < 10 &&
        /^[a-z]+$/i.test(cleanWebsite)) {
      // It's likely an email prefix, clear it
      data.website = undefined;
    } else if (cleanWebsite.includes('.')) {
      // Valid domain, keep it
      data.website = cleanWebsite;
    } else {
      // Suspicious, clear it
      data.website = undefined;
    }
  }
  
  // Also try to extract website from lines that explicitly contain "www." or website patterns
  if (!data.website) {
    for (const line of regularLines) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('www.') || lowerLine.includes('.com') || lowerLine.includes('.ai') || 
          lowerLine.includes('.net') || lowerLine.includes('.org') || lowerLine.includes('.io')) {
        // Match www. domains
        const wwwMatch = line.match(/(www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
        if (wwwMatch) {
          data.website = wwwMatch[1];
          break;
        }
        
        // Match domains with common extensions (simplified pattern)
        const domainPattern = /([a-zA-Z0-9][a-zA-Z0-9.-]*\.(?:com|ai|net|org|io|co|uk|us|de|fr|es|it|nl|be|ch|at|dk|se|no|fi|pl|cz|hu|ro|bg|hr|si|sk|ee|lv|lt|gr|pt|ie|lu|mt|cy|is|li|me|mk|al|ba|rs|by|ua|md|ru|ge|am|az|kz|kg|tj|tm|uz|info|biz|name|pro|xyz|tech|online|site|website))/i;
        const domainMatch = line.match(domainPattern);
        if (domainMatch && !domainMatch[0].includes('@')) {
          data.website = domainMatch[0];
          break;
        }
      }
    }
  }
  
  // Final fallback: extract name from email if we still don't have one
  if (!data.name && data.email) {
    const emailParts = data.email.split('@')[0];
    const nameFromEmail = emailParts
      .replace(/[._-]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(/\s+/)
      .filter(word => word.length > 1)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    if (nameFromEmail.length > 3) {
      data.name = nameFromEmail;
    }
  }
  
  return data;
}

export async function processBusinessCard(imageFile: File): Promise<ExtractedCardData> {
  const text = await extractTextFromImage(imageFile);
  return parseBusinessCard(text);
}
