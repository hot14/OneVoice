import { useState } from 'react';
import { Send, Mic, Sparkles, Globe2, UtensilsCrossed, BookOpen, ChevronRight, Loader2 } from 'lucide-react';
import { PretextWrap } from '../components/PretextWrap';
import { chatWithGuide } from '../services/geminiService';
import Markdown from 'react-markdown';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
}

export default function Guide() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // For speech recognition, you could use the useSpeech hook but we'll leave it as a placeholder or basic implement if you want
  
  const handleSend = async () => {
    if (!inputText.trim() || isSending) return;
    
    const userText = inputText.trim();
    setInputText('');
    
    const newUserMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content: userText
    };
    
    setMessages(prev => [...prev, newUserMsg]);
    setIsSending(true);
    
    const historyPayload = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.content }]
    }));
    
    try {
      const reply = await chatWithGuide(historyPayload, userText);
      const newModelMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: 'model',
        content: reply
      };
      setMessages(prev => [...prev, newModelMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  const setPrompt = (text: string) => {
    if (!isSending) {
       setInputText(text);
       setTimeout(() => handleSend(), 0); // Need to wait for setInputText to be captured if we used a ref, but standard React requires us to pass it. Wait, handleSend uses inputText which won't be updated.
       // Better to do:
    }
  };

  const handleSuggestedPrompt = (text: string) => {
     if (isSending) return;
     setInputText(text);
  };

  return (
    <div className="flex-1 w-full max-w-[800px] mx-auto pt-12 pb-40 px-6 flex flex-col gap-14">
      
      {/* Welcome Section */}
      {messages.length === 0 && (
        <section className="flex flex-col items-center text-center mt-8 mb-4">
          <div className="w-20 h-20 rounded-3xl bg-primary-container text-on-primary-container flex items-center justify-center mb-8 shadow-sm">
            <Sparkles className="w-10 h-10" />
          </div>
          <PretextWrap 
            text="환영합니다!"
            as="h2"
            className="font-bold text-4xl sm:text-5xl text-primary mb-4 tracking-tight"
          />
          <PretextWrap 
            text="I am your Knowledge Guide. How can I assist you with cultural etiquette today?"
            as="p"
            className="text-lg sm:text-xl text-on-surface-variant/80 font-medium max-w-md"
          />
        </section>
      )}

      {/* Suggested Prompts (Bento Grid Style) */}
      {messages.length === 0 && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <button 
             onClick={() => handleSuggestedPrompt("What are some basic etiquette rules for hosting guests from Japan?")}
             className="flex flex-col gap-4 p-8 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary/30 hover:shadow-md transition-all text-left group"
          >
            <div className="p-3 bg-primary/10 w-min rounded-2xl group-hover:scale-105 transition-transform">
              <Globe2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-on-surface mb-2 tracking-tight group-hover:text-primary transition-colors">Etiquette for guests from Japan</h3>
              <p className="text-sm font-medium text-on-surface-variant/70 leading-relaxed">Learn about greetings, dining norms, and signs of respect.</p>
            </div>
          </button>

          <button 
             onClick={() => handleSuggestedPrompt("What are common dietary customs and restrictions in India?")}
             className="flex flex-col gap-4 p-8 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 hover:border-secondary/30 hover:shadow-md transition-all text-left group"
          >
            <div className="p-3 bg-secondary/10 w-min rounded-2xl group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-on-surface mb-2 tracking-tight group-hover:text-secondary transition-colors">Dietary customs in India</h3>
              <p className="text-sm font-medium text-on-surface-variant/70 leading-relaxed">Understand common dietary preferences and restrictions.</p>
            </div>
          </button>
        </section>
      )}

      {/* Chat History Example */}
      <section className="flex flex-col gap-8 w-full relative z-0">
        {messages.map(msg => (
           msg.role === 'user' ? (
             <div key={msg.id} className="flex justify-end">
               <div className="bg-primary text-on-primary p-6 rounded-3xl rounded-tr-md max-w-[85%] shadow-sm">
                 <p className="text-base sm:text-lg font-medium leading-relaxed">{msg.content}</p>
               </div>
             </div>
           ) : (
             <div key={msg.id} className="flex justify-start gap-4">
               <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                 <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
               </div>
               <div className="bg-surface-container-lowest border border-outline-variant/30 p-6 sm:p-8 rounded-3xl rounded-tl-md max-w-[85%] flex flex-col gap-5 text-on-surface shadow-sm prose prose-sm sm:prose-base dark:prose-invert">
                  <Markdown>{msg.content}</Markdown>
               </div>
             </div>
           )
        ))}
        {isSending && (
           <div className="flex justify-start gap-4">
               <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                 <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
               </div>
               <div className="bg-surface-container-lowest border border-outline-variant/30 p-6 sm:p-8 rounded-3xl rounded-tl-md max-w-[85%] flex flex-col gap-5 text-on-surface shadow-sm">
                 <Loader2 className="w-5 h-5 animate-spin text-primary" />
               </div>
           </div>
        )}
      </section>

      {/* Chat Input Area */}
      <div className="fixed bottom-[64px] md:bottom-0 left-0 w-full bg-surface/80 backdrop-blur-xl border-t border-outline-variant/20 z-40">
        <div className="max-w-[800px] mx-auto p-4 md:p-6 flex items-end gap-3 md:gap-4">
          <div className="flex-1 bg-surface-container-lowest border border-outline-variant/30 rounded-3xl flex items-center px-2 py-2 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-sm group">
            <textarea 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                 if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                 }
              }}
              className="w-full bg-transparent border-none px-4 py-3 focus:ring-0 resize-none text-base text-on-surface placeholder:text-on-surface-variant/50 min-h-[48px] max-h-[120px] outline-none" 
              placeholder="Type a topic or question..." 
              rows={1}
            />
            <button 
               onClick={handleSend}
               disabled={isSending || !inputText.trim()}
               className="w-12 h-12 rounded-full flex items-center justify-center text-primary bg-primary/5 hover:bg-primary/10 disabled:opacity-50 transition-colors ml-2 flex-shrink-0 mr-1"
            >
              {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
          <button className="w-14 h-14 rounded-full bg-primary text-on-primary flex items-center justify-center flex-shrink-0 hover:bg-primary/90 transition-colors shadow-md active:scale-95">
            <Mic className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
