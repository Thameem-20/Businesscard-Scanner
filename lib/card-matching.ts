import { query, queryOne } from './db';
import type { ExtractedCardData } from './types';

export interface MatchedCard {
  id: number;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  similarity: number;
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;
  
  const maxLen = Math.max(s1.length, s2.length);
  const distance = levenshteinDistance(s1, s2);
  return 1 - distance / maxLen;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Find matching business cards based on name, email, or phone
 */
export async function findMatchingCards(
  cardData: ExtractedCardData,
  organizationId: number,
  threshold: number = 0.7
): Promise<MatchedCard[]> {
  const matches: MatchedCard[] = [];
  
  if (!cardData.name) {
    return matches;
  }
  
  // Search by exact or similar name within organization
  const existingCards = await query(
    `SELECT * FROM business_cards 
     WHERE organization_id = ? 
     AND (name LIKE ? OR name LIKE ?)`,
    [organizationId, `%${cardData.name}%`, `${cardData.name}%`]
  ) as any[];
  
  for (const card of existingCards) {
    const nameSimilarity = calculateSimilarity(cardData.name, card.name);
    
    // Also check email and phone if available
    let emailMatch = 0;
    let phoneMatch = 0;
    
    if (cardData.email && card.email) {
      emailMatch = cardData.email.toLowerCase() === card.email.toLowerCase() ? 1.0 : 0.0;
    }
    
    if (cardData.phone && card.phone) {
      // Normalize phone numbers for comparison
      const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
      phoneMatch = normalizePhone(cardData.phone) === normalizePhone(card.phone) ? 1.0 : 0.0;
    }
    
    // Calculate overall similarity score
    let similarity = nameSimilarity;
    if (emailMatch > 0 || phoneMatch > 0) {
      similarity = Math.max(similarity, emailMatch, phoneMatch);
    }
    
    if (similarity >= threshold) {
      matches.push({
        id: card.id,
        name: card.name,
        company: card.company,
        email: card.email,
        phone: card.phone,
        similarity,
      });
    }
  }
  
  // Sort by similarity (highest first)
  matches.sort((a, b) => b.similarity - a.similarity);
  
  return matches;
}

/**
 * Check if a card name already exists (exact or similar match)
 * IMPORTANT: Only checks within the specified organization
 */
export async function checkDuplicateName(
  name: string,
  organizationId: number,
  excludeId?: number
): Promise<MatchedCard | null> {
  if (!name) return null;
  
  // Ensure organizationId is a number
  const orgId = typeof organizationId === 'string' ? parseInt(organizationId) : organizationId;
  
  if (isNaN(orgId)) {
    console.error('Invalid organizationId:', organizationId);
    return null;
  }
  
  // Query with explicit organization_id filter
  const existingCards = await query(
    `SELECT * FROM business_cards 
     WHERE organization_id = ? 
     ${excludeId ? 'AND id != ?' : ''}
     AND name LIKE ?`,
    excludeId 
      ? [orgId, excludeId, `%${name}%`]
      : [orgId, `%${name}%`]
  ) as any[];
  
  // Double-check that all returned cards belong to the correct organization
  const orgFilteredCards = existingCards.filter(card => {
    const cardOrgId = typeof card.organization_id === 'string' 
      ? parseInt(card.organization_id) 
      : card.organization_id;
    return cardOrgId === orgId;
  });
  
  for (const card of orgFilteredCards) {
    const similarity = calculateSimilarity(name, card.name);
    if (similarity >= 0.8) { // 80% similarity threshold
      return {
        id: card.id,
        name: card.name,
        company: card.company,
        email: card.email,
        phone: card.phone,
        similarity,
      };
    }
  }
  
  return null;
}
