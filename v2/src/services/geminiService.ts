import { GoogleGenAI } from '@google/genai';

// Initialize Gemini API client.
// Note: In a real app, you'd access the API key via process.env or import.meta.env
// For this environment, we expect process.env.GEMINI_API_KEY to be available.
export const translateText = async (text: string, sourceLang: string, targetLang: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `Translate the following text from ${sourceLang} to ${targetLang}. 
Only return the translated text without any conversational filler or quotes.
Text to translate:
"${text}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    if (response && response.text) {
      return response.text.trim();
    }
    return '';
  } catch (error) {
    console.error("Gemini Translation Error:", error);
    throw error;
  }
};

export const summarizeConversation = async (conversationText: string): Promise<string[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `Summarize the following conversation into 3 key bullet points in Korean. Only return the bullet points separated by newlines, do not use asterisk or markdown arrays, just plain sentences.\n\nConversation:\n${conversationText}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    if (response && response.text) {
      return response.text.trim().split('\n').filter(Boolean).map(s => s.replace(/^[-*•]\s*/, '').trim());
    }
    return ["내용 요약 불가"];
  } catch(error) {
     console.error("Gemini Summary Error:", error);
     return ["내용 요약 중 오류 발생"];
  }
};

export const chatWithGuide = async (history: {role: 'user' | 'model', parts: {text: string}[]}[], message: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const chat = ai.chats.create({
        model: "gemini-2.5-flash",
        history: history,
        config: {
           systemInstruction: "You are a Knowledge Guide for cultural etiquette and language assistance. Answer concisely and politely.",
        }
    });

    const response = await chat.sendMessage({ message });
    return response.text || "Sorry, I couldn't understand that.";

  } catch(error) {
    console.error("Gemini Chat Error:", error);
    return "Error connecting to AI. Please try again.";
  }
};
