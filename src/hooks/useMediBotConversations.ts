import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  patient_id: string;
  user_id: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  conversation_id: string | null;
}

export function useMediBotConversations(patientId: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch all conversations for the patient
  const fetchConversations = useCallback(async () => {
    if (!patientId) return;

    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('patient_id', patientId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  }, [patientId]);

  // Fetch messages for a specific conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Cast the role to the correct type
      const typedMessages: Message[] = (data || []).map(msg => ({
        ...msg,
        role: msg.role as 'user' | 'assistant'
      }));
      setMessages(typedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, []);

  // Create a new conversation
  const createConversation = useCallback(async (title: string = 'New Chat'): Promise<string | null> => {
    if (!patientId) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('chat_conversations')
        .insert({
          patient_id: patientId,
          user_id: user.id,
          title
        })
        .select()
        .single();

      if (error) throw error;
      
      setConversations(prev => [data, ...prev]);
      setCurrentConversationId(data.id);
      setMessages([]);
      
      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create new conversation',
        variant: 'destructive'
      });
      return null;
    }
  }, [patientId, toast]);

  // Update conversation title
  const updateConversationTitle = useCallback(async (conversationId: string, title: string) => {
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      if (error) throw error;

      setConversations(prev => 
        prev.map(c => c.id === conversationId ? { ...c, title } : c)
      );
    } catch (error) {
      console.error('Error updating conversation title:', error);
    }
  }, []);

  // Delete a conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
        setMessages([]);
      }

      toast({
        title: 'Deleted',
        description: 'Conversation deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete conversation',
        variant: 'destructive'
      });
    }
  }, [currentConversationId, toast]);

  // Select a conversation
  const selectConversation = useCallback(async (conversationId: string) => {
    setCurrentConversationId(conversationId);
    await fetchMessages(conversationId);
  }, [fetchMessages]);

  // Add a message to the current conversation
  const addMessage = useCallback(async (role: 'user' | 'assistant', content: string) => {
    if (!currentConversationId || !patientId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: currentConversationId,
          patient_id: patientId,
          user_id: user.id,
          role,
          content
        })
        .select()
        .single();

      if (error) throw error;

      const typedMessage: Message = {
        ...data,
        role: data.role as 'user' | 'assistant'
      };
      setMessages(prev => [...prev, typedMessage]);

      // Update conversation's updated_at
      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentConversationId);

    } catch (error) {
      console.error('Error adding message:', error);
    }
  }, [currentConversationId, patientId]);

  // Update the last message (for streaming)
  const updateLastMessage = useCallback((content: string) => {
    setMessages(prev => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      updated[updated.length - 1] = { ...updated[updated.length - 1], content };
      return updated;
    });
  }, []);

  // Add temporary message (for UI before DB save)
  const addTempMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      role,
      content,
      created_at: new Date().toISOString(),
      conversation_id: currentConversationId
    };
    setMessages(prev => [...prev, tempMessage]);
  }, [currentConversationId]);

  // Initial fetch
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    currentConversationId,
    messages,
    isLoading,
    setIsLoading,
    fetchConversations,
    createConversation,
    selectConversation,
    deleteConversation,
    updateConversationTitle,
    addMessage,
    addTempMessage,
    updateLastMessage,
    setMessages
  };
}
