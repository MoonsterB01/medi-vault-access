import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MessageCircle, Send, X, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = useCallback(async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage: Message = { role: "user", content: trimmedInput };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/medibot-assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let assistantContent = "";

      // Add empty assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantContent += content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: assistantContent,
                  };
                  return updated;
                });
              }
            } catch {
              // Ignore parse errors for incomplete JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again. / क्षमा करें, कोई त्रुटि हुई। कृपया पुनः प्रयास करें।",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            size="lg"
            className={cn(
              "fixed bottom-6 left-6 z-50 rounded-full w-14 h-14 shadow-lg",
              "bg-primary hover:bg-primary/90 transition-all duration-300",
              "hover:scale-110"
            )}
            aria-label="Open chat assistant"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        </SheetTrigger>

        <SheetContent 
          side="right" 
          className="w-full sm:w-[400px] p-0 flex flex-col"
        >
          {/* Header */}
          <SheetHeader className="p-4 border-b bg-primary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <SheetTitle className="text-left">MediVault Assistant</SheetTitle>
                  <p className="text-xs text-muted-foreground">
                    Hindi & English Support
                  </p>
                </div>
              </div>
            </div>
          </SheetHeader>

          {/* Disclaimer */}
          <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-b flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              This assistant does not provide medical advice. / यह सहायक चिकित्सा सलाह नहीं देता।
            </p>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div className="bg-primary/10 p-4 rounded-full mb-4">
                  <MessageCircle className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-medium mb-2">
                  नमस्ते! Hello!
                </h3>
                <p className="text-sm text-muted-foreground max-w-[280px]">
                  I'm your MediVault assistant. Ask me anything about using the platform!
                </p>
                <p className="text-sm text-muted-foreground max-w-[280px] mt-1">
                  मैं MediVault सहायक हूं। प्लेटफ़ॉर्म के बारे में कुछ भी पूछें!
                </p>
                
                {/* Quick suggestions */}
                <div className="mt-6 flex flex-wrap gap-2 justify-center">
                  {[
                    "How do I upload records?",
                    "रिकॉर्ड कैसे अपलोड करें?",
                    "Is my data secure?",
                  ].map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setInput(suggestion);
                        setTimeout(() => sendMessage(), 100);
                      }}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-2.5",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted rounded-bl-md"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {message.content || (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Thinking...
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t bg-background">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type a message... / संदेश टाइप करें..."
                className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px] max-h-[120px]"
                rows={1}
                disabled={isLoading}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="rounded-xl h-[44px] w-[44px] flex-shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
