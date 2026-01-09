import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Loader2, Plus, MessageSquare, Trash2, Globe, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediBotConversations, Conversation, Message } from "@/hooks/useMediBotConversations";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface MediBotProps {
  patientId: string;
}

export function MediBot({ patientId }: MediBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    currentConversationId,
    messages,
    createConversation,
    selectConversation,
    deleteConversation,
    addTempMessage,
    setMessages
  } = useMediBotConversations(patientId);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleNewChat = async () => {
    await createConversation("New Chat");
  };

  const handleDeleteClick = (convId: string) => {
    setConversationToDelete(convId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (conversationToDelete) {
      await deleteConversation(conversationToDelete);
    }
    setDeleteDialogOpen(false);
    setConversationToDelete(null);
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput("");

    // Ensure we have a conversation
    let activeConversationId = currentConversationId;
    if (!activeConversationId) {
      activeConversationId = await createConversation("New Chat");
      if (!activeConversationId) {
        toast.error("Failed to create conversation");
        return;
      }
    }

    // Add user message to UI immediately
    addTempMessage("user", userMessage);
    setIsStreaming(true);

    try {
      const { data, error } = await supabase.functions.invoke("medibot-chat", {
        body: { 
          message: userMessage, 
          patientId,
          conversationId: activeConversationId,
          useWebSearch
        },
      });

      if (error) {
        if (error.message?.includes("429")) {
          toast.error("Rate limit exceeded. Please wait a moment and try again.");
        } else if (error.message?.includes("402")) {
          toast.error("Service unavailable. Please contact support.");
        } else {
          throw error;
        }
        // Remove the temp message on error
        setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
        return;
      }

      if (data?.response) {
        // Add assistant response
        addTempMessage("assistant", data.response);
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Floating Button */}
      <Button
        className="fixed right-4 rounded-full w-12 h-12 md:w-14 md:h-14 shadow-xl hover:scale-110 transition-transform z-[55] bg-primary md:bottom-6"
        style={{
          bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
        }}
        onClick={() => setIsOpen(true)}
      >
        <Bot className="h-5 w-5 md:h-6 md:w-6" />
      </Button>

      {/* Chat Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0">
          <SheetHeader className="px-4 py-3 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2 text-base">
                <Bot className="h-5 w-5 text-primary" />
                MediBot
              </SheetTitle>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="web-search"
                        checked={useWebSearch}
                        onCheckedChange={setUseWebSearch}
                        className="scale-75"
                      />
                      <Label htmlFor="web-search" className="text-xs cursor-pointer flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        Web
                      </Label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Enable web search for general health questions</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </SheetHeader>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <div className={cn(
              "border-r bg-muted/30 flex flex-col transition-all duration-200",
              showSidebar ? "w-56" : "w-0"
            )}>
              {showSidebar && (
                <>
                  {/* New Chat Button */}
                  <div className="p-2 border-b">
                    <Button
                      onClick={handleNewChat}
                      className="w-full justify-start gap-2"
                      variant="outline"
                      size="sm"
                    >
                      <Plus className="h-4 w-4" />
                      New Chat
                    </Button>
                  </div>

                  {/* Conversations List */}
                  <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                      {conversations.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          No conversations yet
                        </p>
                      ) : (
                        conversations.map((conv) => (
                          <div
                            key={conv.id}
                            className={cn(
                              "group flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted transition-colors",
                              currentConversationId === conv.id && "bg-muted"
                            )}
                            onClick={() => selectConversation(conv.id)}
                          >
                            <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{conv.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(conv.updated_at)}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(conv.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>

            {/* Toggle Sidebar Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-4 rounded-l-none bg-muted/50 hover:bg-muted z-10"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              {showSidebar ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Messages */}
              <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef}>
                {!currentConversationId && messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-12">
                    <Bot className="h-16 w-16 mb-4 text-primary/50" />
                    <h3 className="text-lg font-medium mb-2">Welcome to MediBot</h3>
                    <p className="text-sm max-w-xs mb-4">
                      I can help you understand your health records and answer medical questions.
                    </p>
                    <div className="flex gap-2 text-xs">
                      <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded">
                        <FileText className="h-3 w-3" />
                        Records
                      </div>
                      <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded">
                        <Globe className="h-3 w-3" />
                        Web Search
                      </div>
                    </div>
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
                            "max-w-[85%] rounded-lg px-4 py-2",
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
                        <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">
                            {useWebSearch ? "Searching the web..." : "Thinking..."}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Input Area */}
              <div className="border-t px-4 py-3 flex-shrink-0">
                <div className="flex gap-2">
                  <Input
                    placeholder={useWebSearch ? "Ask anything about health..." : "Ask about your health records..."}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isStreaming}
                    maxLength={1000}
                    className="flex-1"
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
                <p className="text-xs text-muted-foreground mt-1">
                  {input.length}/1000 • {useWebSearch ? "Web search enabled" : "Using your records"}
                </p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
