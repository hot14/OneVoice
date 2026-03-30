export const maskPII = (text: string): string => {
  // Simple regex for email
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  // Simple regex for phone number (basic format)
  const phoneRegex = /\d{3}-\d{3,4}-\d{4}/g;
  
  return text
    .replace(emailRegex, "[EMAIL]")
    .replace(phoneRegex, "[PHONE]");
};
