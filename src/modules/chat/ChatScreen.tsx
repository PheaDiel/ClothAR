import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput, Button, Card, Avatar } from 'react-native-paper';
import AppHeader from '../../components/AppHeader';
import { wp, hp } from '../../utils/responsiveUtils';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'admin' | 'bot';
  timestamp: Date;
}

const ChatScreen = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! How can I help you with your clothing pre-order today?',
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // Simulate bot/admin response
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: getBotResponse(inputText),
        sender: Math.random() > 0.5 ? 'bot' : 'admin',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botResponse]);
    }, 1000);
  };

  const getBotResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    if (input.includes('order') || input.includes('pre-order')) {
      return 'For pre-orders, we offer GCash payment with full payment or installments, and pay on pickup options. What would you like to know?';
    } else if (input.includes('payment') || input.includes('gcash')) {
      return 'You can pay via GCash for full amount or in installments. We also accept payment upon pickup.';
    } else if (input.includes('pickup')) {
      return 'Pickup is available at our store location. No delivery service is offered.';
    } else {
      return 'I\'m here to help with your clothing pre-orders, payment options, and pickup arrangements. Feel free to ask!';
    }
  };

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