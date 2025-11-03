import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput, Button, Card, Avatar } from 'react-native-paper';
import AppHeader from '../../components/AppHeader';
import { wp, hp } from '../../utils/responsiveUtils';
import { AuthContext } from '../../context/AuthContext';
import {
  getCustomerConversation,
  getOrCreateConversation,
  sendMessage,
  getConversationMessages,
  subscribeToMessages,
  ChatMessage
} from '../../services/chatService';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'admin' | 'bot';
  timestamp: Date;
}

const ChatScreen = () => {
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    if (!inputText.trim() || !conversationId) return;

    const messageId = Date.now().toString();

    try {
      const userMessage: Message = {
        id: messageId,
        text: inputText,
        sender: 'user',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMessage]);
      setInputText('');

      // Send message to database
      const chatService = await import('../../services/chatService');
      await chatService.sendMessage(conversationId, inputText, 'customer');
    } catch (error) {
      console.error('Error sending message:', error);
      // Revert optimistic update on error
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    }
  };

  // Load conversation and messages on component mount
  useEffect(() => {
    loadConversation();
  }, []);

  const loadConversation = async () => {
    try {
      setLoading(true);
      const chatService = await import('../../services/chatService');
      const conversation = await chatService.getCustomerConversation();

      if (conversation) {
        setConversationId(conversation.id);
        const chatMessages = await chatService.getConversationMessages(conversation.id);
        const formattedMessages: Message[] = chatMessages.map(msg => ({
          id: msg.id,
          text: msg.message_text,
          sender: msg.sender_type === 'customer' ? 'user' : 'admin',
          timestamp: new Date(msg.created_at),
        }));
        setMessages(formattedMessages);
      } else {
        // Create new conversation if none exists
        const newConversation = await chatService.getOrCreateConversation(user?.id || '');
        setConversationId(newConversation.id);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to new messages
  useEffect(() => {
    if (!conversationId) return;

    const chatService = import('../../services/chatService');
    let unsubscribe: (() => void) | null = null;

    chatService.then((service) => {
      unsubscribe = service.subscribeToMessages(conversationId, (newMessage: ChatMessage) => {
        const formattedMessage: Message = {
          id: newMessage.id,
          text: newMessage.message_text,
          sender: newMessage.sender_type === 'customer' ? 'user' : 'admin',
          timestamp: new Date(newMessage.created_at),
        };
        setMessages(prev => {
          // Check if message already exists to prevent duplicates
          const exists = prev.some(msg => msg.id === formattedMessage.id);
          if (exists) return prev;
          return [...prev, formattedMessage];
        });
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [conversationId]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.otherMessage]}>
        {!isUser && (
          <Avatar.Text
            size={32}
            label={item.sender === 'admin' ? 'A' : 'B'}
            style={styles.avatar}
          />
        )}
        <Card style={[styles.messageCard, isUser ? styles.userCard : styles.otherCard]}>
          <Card.Content>
            <Text style={styles.messageText}>{item.text}</Text>
            <Text style={styles.timestamp}>
              {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </Card.Content>
        </Card>
      </View>
    );
  };

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader title="Chat with Admin" />
        <View style={styles.loadingContainer}>
          <Text>Loading conversation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <AppHeader title="Chat with Admin" />
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContainer}
        />
        <View style={styles.inputContainer}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            style={styles.textInput}
            multiline
          />
          <Button mode="contained" onPress={sendMessage} style={styles.sendButton}>
            Send
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: wp(4),
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: wp(3),
    alignItems: 'flex-end',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  avatar: {
    marginRight: wp(2),
  },
  messageCard: {
    maxWidth: '70%',
    elevation: 2,
  },
  userCard: {
    backgroundColor: '#2E86AB',
  },
  otherCard: {
    backgroundColor: '#fff',
  },
  messageText: {
    fontSize: wp(4),
  },
  timestamp: {
    fontSize: wp(3),
    color: '#666',
    marginTop: wp(1),
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: wp(4),
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  textInput: {
    flex: 1,
    marginRight: wp(3),
    backgroundColor: '#f9f9f9',
  },
  sendButton: {
    justifyContent: 'center',
  },
});

export default ChatScreen;
