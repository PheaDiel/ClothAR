import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput, Button, Card, Avatar, Appbar } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { wp, hp } from '../../utils/responsiveUtils';
import { AuthContext } from '../../context/AuthContext';
import {
  sendMessage,
  getConversationMessages,
  subscribeToMessages,
  markMessagesAsRead,
  ChatMessage
} from '../../services/chatService';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'admin' | 'bot';
  timestamp: Date;
}

interface RouteParams {
  conversationId: string;
  customerName: string;
}

const AdminChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { conversationId, customerName } = route.params as RouteParams;
  const { user } = useContext(AuthContext);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  // Load messages on component mount
  useEffect(() => {
    loadMessages();
  }, [conversationId]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const chatService = await import('../../services/chatService');
      const chatMessages = await chatService.getConversationMessages(conversationId);
      const formattedMessages: Message[] = chatMessages.map(msg => ({
        id: msg.id,
        text: msg.message_text,
        sender: msg.sender_type === 'customer' ? 'user' : 'admin',
        timestamp: new Date(msg.created_at),
      }));
      setMessages(formattedMessages);

      // Mark customer messages as read
      await chatService.markMessagesAsRead(conversationId);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to new messages
  useEffect(() => {
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

        // Auto-mark as read if it's from customer
        if (newMessage.sender_type === 'customer') {
          service.markMessagesAsRead(conversationId);
        }
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [conversationId]);

  const sendMessageHandler = async () => {
    if (!inputText.trim()) return;

    try {
      const adminMessage: Message = {
        id: Date.now().toString(),
        text: inputText,
        sender: 'admin',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, adminMessage]);
      setInputText('');

      // Send message to database
      const chatService = await import('../../services/chatService');
      await chatService.sendMessage(conversationId, inputText, 'admin');
    } catch (error) {
      console.error('Error sending message:', error);
      // Revert optimistic update on error
      setMessages(prev => prev.slice(0, -1));
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.otherMessage]}>
        {!isUser && (
          <Avatar.Text
            size={32}
            label="A"
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
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title={`Chat with ${customerName}`} />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <Text>Loading messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={`Chat with ${customerName}`} />
      </Appbar.Header>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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
            placeholder="Type your response..."
            style={styles.textInput}
            multiline
          />
          <Button mode="contained" onPress={sendMessageHandler} style={styles.sendButton}>
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
    backgroundColor: '#fff',
  },
  otherCard: {
    backgroundColor: '#2E86AB',
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

export default AdminChatScreen;