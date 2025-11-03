import { supabase } from './supabase';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'customer' | 'admin';
  message_text: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatConversation {
  id: string;
  customer_id: string;
  admin_id: string | null;
  subject: string | null;
  status: 'active' | 'closed';
  last_message_at: string;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  unread_count?: number;
}

// Get or create conversation for a customer
export const getOrCreateConversation = async (customerId: string): Promise<ChatConversation> => {
  try {
    // First, try to find existing active conversation
    const { data: existing, error: fetchError } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('customer_id', customerId)
      .eq('status', 'active')
      .single();

    if (existing && !fetchError) {
      return existing;
    }

    // Create new conversation if none exists
    const { data: newConversation, error: createError } = await supabase
      .from('chat_conversations')
      .insert({
        customer_id: customerId,
        status: 'active'
      })
      .select()
      .single();

    if (createError) throw createError;
    return newConversation;
  } catch (error) {
    console.error('Error getting or creating conversation:', error);
    throw error;
  }
};

// Send a message
export const sendMessage = async (
  conversationId: string,
  messageText: string,
  senderType: 'customer' | 'admin'
): Promise<ChatMessage> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        sender_type: senderType,
        message_text: messageText,
        is_read: false
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Get messages for a conversation
export const getConversationMessages = async (conversationId: string): Promise<ChatMessage[]> => {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting conversation messages:', error);
    throw error;
  }
};

// Get all conversations for admin
export const getAdminConversations = async (): Promise<ChatConversation[]> => {
  try {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .order('last_message_at', { ascending: false });

    if (error) throw error;

    // Get customer names and unread counts for each conversation
    const conversationsWithDetails = await Promise.all(
      (data || []).map(async (conversation) => {
        // Get customer profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', conversation.customer_id)
          .single();

        // Get unread count
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conversation.id)
          .eq('sender_type', 'customer')
          .eq('is_read', false);

        return {
          ...conversation,
          customer_name: profile?.name || 'Unknown Customer',
          unread_count: count || 0
        };
      })
    );

    return conversationsWithDetails;
  } catch (error) {
    console.error('Error getting admin conversations:', error);
    throw error;
  }
};

// Get conversation for customer
export const getCustomerConversation = async (): Promise<ChatConversation | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('customer_id', user.id)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
    return data || null;
  } catch (error) {
    console.error('Error getting customer conversation:', error);
    throw error;
  }
};

// Mark messages as read
export const markMessagesAsRead = async (conversationId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('sender_type', 'customer')
      .eq('is_read', false);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
};

// Subscribe to new messages in a conversation
export const subscribeToMessages = (
  conversationId: string,
  callback: (message: ChatMessage) => void
) => {
  const channel = supabase
    .channel(`conversation-${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => {
        callback(payload.new as ChatMessage);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};