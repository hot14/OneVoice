/**
 * PII (Personally Identifiable Information) Filter
 * Masks sensitive information like emails, phone numbers, etc.
 */

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/g;
const SSN_REGEX = /\d{6}-\d{7}/g; // Korean SSN pattern

export function maskPII(text: string): string {
  if (!text) return text;

  let masked = text;

  // Mask Emails
  masked = masked.replace(EMAIL_REGEX, (match) => {
    const [user, domain] = match.split('@');
    return `${user[0]}***@${domain}`;
  });

  // Mask Korean SSN before phone (SSN pattern \d{6}-\d{7} would match phone regex)
  masked = masked.replace(SSN_REGEX, '******-*******');

  // Mask Phone Numbers
  masked = masked.replace(PHONE_REGEX, (match) => {
    return match.replace(/\d/g, '*').slice(0, -4) + match.slice(-4);
  });

  return masked;
}
