// Enhanced PII filter supporting international formats
export const maskPII = (text: string): string => {
  // Email (standard format)
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  // Phone numbers - expanded to support international formats
  // Korea: 010-XXXX-XXXX, 02-XXXX-XXXX
  const krPhoneRegex = /\d{2,3}-\d{3,4}-\d{4}/g;
  // Japan: 090-XXXX-XXXX, 03-XXXX-XXXX
  const jpPhoneRegex = /0\d{1,4}-\d{1,4}-\d{4}/g;
  // China: 138-XXXX-XXXX, 010-XXXXXXXX
  const cnPhoneRegex = /0?\d{2,3}-\d{7,8}|\d{11}/g;
  // US/General: (XXX) XXX-XXXX, XXX-XXX-XXXX
  const usPhoneRegex = /(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
  // European: +XX XXX XXX XXXX
  const euPhoneRegex = /\+\d{1,3}[\s.-]?\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g;

  // Credit card numbers (basic pattern)
  const creditCardRegex = /\d{4}[\s.-]?\d{4}[\s.-]?\d{4}[\s.-]?\d{4}/g;

  // Social Security Numbers (US format)
  const ssnRegex = /\d{3}-\d{2}-\d{4}/g;

  // Passport numbers (general pattern - 2 letters + 6+ digits)
  const passportRegex = /[A-Z]{1,2}\d{6,9}/gi;

  // Korean Resident Registration Number (RRN)
  const krRrnRegex = /\d{6}-[1-4]\d{6}/g;

  let result = text;

  // Apply all masking patterns
  result = result.replace(emailRegex, "[EMAIL]");
  result = result.replace(krPhoneRegex, "[PHONE]");
  result = result.replace(jpPhoneRegex, "[PHONE]");
  result = result.replace(cnPhoneRegex, "[PHONE]");
  result = result.replace(usPhoneRegex, "[PHONE]");
  result = result.replace(euPhoneRegex, "[PHONE]");
  result = result.replace(creditCardRegex, "[CARD]");
  result = result.replace(ssnRegex, "[SSN]");
  result = result.replace(krRrnRegex, "[ID]");
  result = result.replace(passportRegex, "[ID]");

  return result;
};
