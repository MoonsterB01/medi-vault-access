import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface MediBotProps {
  patientId: string;
}

export function MediBot({ patientId }: MediBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load conversation history when opened
  useEffect(() => {
    if (isOpen && patientId) {
      loadChatHistory();
    }
  }, [isOpen, patientId]);

  const loadChatHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: true })
        .limit(20);

      if (error) throw error;
      setMessages((data as Message[]) || []);
    } catch (error: any) {
      console.error("Error loading chat history:", error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput("");

    // Add user message to UI immediately
    const tempUserMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsStreaming(true);

    try {
      // Call edge function with streaming
      const { data, error } = await supabase.functions.invoke("medibot-chat", {
        body: { message: userMessage, patientId },
      });

      if (error) {
        if (error.message?.includes("429")) {
          toast.error("Rate limit exceeded. Please wait a moment and try again.");
        } else if (error.message?.includes("402")) {
          toast.error("Service unavailable. Please contact support.");
        } else {
          throw error;
        }
        // Remove the user message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
        return;
      }

      // The edge function returns the complete response
      if (data?.response) {
        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.response,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
      // Remove the user message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Button - positioned above mobile bottom nav */}
      <Button
        className="fixed right-4 rounded-full w-12 h-12 md:w-14 md:h-14 shadow-xl hover:scale-110 transition-transform z-[55] bg-primary md:bottom-6"
        style={{
          bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
        }}
        onClick={() => setIsOpen(true)}
      >
        <Bot className="h-5 w-5 md:h-6 md:w-6" />
      </Button>

      {/* Chat Drawer */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              MediBot - Your Health Assistant
            </SheetTitle>
          </SheetHeader>

          {/* Messages Area */}
          <ScrollArea className="flex-1 px-6 py-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <Bot className="h-12 w-12 mb-4 text-primary" />
                <p className="text-sm">
                  Hi! I'm MediBot. Ask me anything about your health records.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-4 py-2",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
                {isStreaming && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t px-4 py-4">
            <div className="flex gap-2">
              <Input
                placeholder="Ask about your health..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isStreaming}
                maxLength={500}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isStreaming}
                size="icon"
              >
                {isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {input.length}/500 characters
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
