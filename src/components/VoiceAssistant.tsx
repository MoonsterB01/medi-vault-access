import { useConversation } from "@elevenlabs/react";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, Phone, PhoneOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function VoiceAssistant() {
  const [isConnecting, setIsConnecting] = useState(false);

  const conversation = useConversation({
    onConnect: () => {
      console.log("Connected to voice assistant");
      toast.success("Voice assistant connected");
    },
    onDisconnect: () => {
      console.log("Disconnected from voice assistant");
    },
    onMessage: (message) => {
      console.log("Message:", message);
    },
    onError: (error) => {
      console.error("Voice assistant error:", error);
      toast.error("Voice assistant error. Please try again.");
    },
  });

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get token from edge function
      const { data, error } = await supabase.functions.invoke(
        "elevenlabs-conversation-token"
      );

      if (error) {
        throw new Error(error.message || "Failed to get conversation token");
      }

      if (!data?.token) {
        throw new Error("No token received");
      }

      // Start the conversation with WebRTC
      await conversation.startSession({
        conversationToken: data.token,
        connectionType: "webrtc",
      });
    } catch (error) {
      console.error("Failed to start conversation:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start voice assistant");
    } finally {
      setIsConnecting(false);
    }
  }, [conversation]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const isConnected = conversation.status === "connected";

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Voice Assistant Button */}
      <div className="flex flex-col items-end gap-2">
        {/* Speaking indicator */}
        {isConnected && (
          <div className="bg-card rounded-full px-4 py-2 shadow-lg border border-border/50 flex items-center gap-2 animate-fade-in">
            {conversation.isSpeaking ? (
              <>
                <div className="flex gap-1">
                  <span className="w-1 h-3 bg-primary rounded-full animate-pulse" />
                  <span className="w-1 h-4 bg-primary rounded-full animate-pulse delay-75" />
                  <span className="w-1 h-2 bg-primary rounded-full animate-pulse delay-150" />
                </div>
                <span className="text-sm text-muted-foreground">Assistant speaking...</span>
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-sm text-muted-foreground">Listening...</span>
              </>
            )}
          </div>
        )}

        {/* Main button */}
        <Button
          onClick={isConnected ? stopConversation : startConversation}
          disabled={isConnecting}
          size="lg"
          className={`rounded-full w-14 h-14 shadow-lg transition-all duration-300 ${
            isConnected 
              ? "bg-destructive hover:bg-destructive/90" 
              : "bg-primary hover:bg-primary/90 animate-pulse-glow"
          }`}
        >
          {isConnecting ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : isConnected ? (
            <PhoneOff className="h-6 w-6" />
          ) : (
            <Phone className="h-6 w-6" />
          )}
        </Button>

        {/* Label */}
        {!isConnected && !isConnecting && (
          <span className="text-xs text-muted-foreground bg-card/80 backdrop-blur-sm px-2 py-1 rounded shadow-sm">
            Talk to MediVault
          </span>
        )}
      </div>
    </div>
  );
}
