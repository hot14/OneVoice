// Enhanced PII filter supporting international formats
// Covers: Email, Phone (KR/JP/CN/US/EU), SSN, Passport, ID cards, Driver licenses, IBAN, CPF, Aadhaar
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

  // Credit card numbers (basic pattern - 16 digits)
  const creditCardRegex = /\d{4}[\s.-]?\d{4}[\s.-]?\d{4}[\s.-]?\d{4}/g;

  // Social Security Numbers (US format)
  const ssnRegex = /\d{3}-\d{2}-\d{4}/g;

  // Passport numbers (general pattern - 2 letters + 6+ digits)
  const passportRegex = /[A-Z]{1,2}\d{6,9}/gi;

  // Korean Resident Registration Number (RRN)
  const krRrnRegex = /\d{6}-[1-4]\d{6}/g;

  // Finnish HETU (personal identity code)
  const fiHetuRegex = /\b\d{6}[+-A]\d{3}[A-Z0-9]\b/gi;

  // Swedish Personnummer (YYYYMMDD-XXXX or YYYYMMDDXXXX)
  const sePersonRegex = /\b\d{8}-?\d{4}\b/g;

  // Indian Aadhaar (12 digits, sometimes with spaces)
  const inAadhaarRegex = /\b\d{4}\s?\d{4}\s?\d{4}\b/g;

  // Brazilian CPF (XXX.XXX.XXX-XX)
  const brCpfRegex = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g;

  // IBAN (International Bank Account Number)
  const ibanRegex = /\b[A-Z]{2}\d{2}[A-Z0-9]{4,30}\b/gi;

  // Driver's license patterns (various formats)
  const driversLicenseRegex = /\b[A-Z]{1,2}\d{5,8}\b/gi;

  // National ID cards (general European format)
  const nationalIdRegex = /\b[A-Z]{2}\d{7,10}\b/gi;

  let result = text;

  // Apply all masking patterns (order matters for some overlapping patterns)
  result = result.replace(emailRegex, "[EMAIL]");
  result = result.replace(krPhoneRegex, "[PHONE]");
  result = result.replace(jpPhoneRegex, "[PHONE]");
  result = result.replace(cnPhoneRegex, "[PHONE]");
  result = result.replace(usPhoneRegex, "[PHONE]");
  result = result.replace(euPhoneRegex, "[PHONE]");
  result = result.replace(creditCardRegex, "[CARD]");
  result = result.replace(ssnRegex, "[SSN]");
  result = result.replace(krRrnRegex, "[ID]");
  result = result.replace(fiHetuRegex, "[ID]");
  result = result.replace(sePersonRegex, "[ID]");
  result = result.replace(inAadhaarRegex, "[ID]");
  result = result.replace(brCpfRegex, "[ID]");
  result = result.replace(ibanRegex, "[BANK]");
  result = result.replace(driversLicenseRegex, "[LICENSE]");
  result = result.replace(passportRegex, "[ID]");
  result = result.replace(nationalIdRegex, "[ID]");

  return result;
};
