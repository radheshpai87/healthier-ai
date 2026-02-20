import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Volume2 } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import * as SecureStore from 'expo-secure-store';
import { useLanguage } from '../../src/context/LanguageContext';
import { translations } from '../../src/constants/translations';
import { getHealthAdvice } from '../../src/api/gemini';

const CHAT_STORAGE_KEY = 'aurahealth_chat_history';

export default function ChatScreen() {
  const { language } = useLanguage();
  const t = translations[language];
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef(null);
  const hasLoaded = useRef(false);

  // Load chat history on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(CHAT_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            hasLoaded.current = true;
            return;
          }
        }
      } catch (e) {
        console.warn('[Chat] Failed to load history:', e);
      }
      // No saved history — show welcome message
      setMessages([{ id: '1', text: t.welcomeMessage, isBot: true }]);
      hasLoaded.current = true;
    })();
  }, []);

  // Save chat history whenever messages change (after initial load)
  useEffect(() => {
    if (!hasLoaded.current || messages.length === 0) return;
    // Keep only the last 50 messages to stay within SecureStore limits
    const toSave = messages.slice(-50);
    SecureStore.setItemAsync(CHAT_STORAGE_KEY, JSON.stringify(toSave)).catch(() => {});
  }, [messages]);

  const sendMessage = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      text: trimmed,
      isBot: false,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await getHealthAdvice(trimmed, language);
      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: response,
        isBot: true,
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: t.errorMessage,
        isBot: true,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const speakMessage = async (text) => {
    try {
      const langCode = language === 'hi' ? 'hi-IN' : 'en-US';
      await Speech.speak(text, { language: langCode, rate: 0.9 });
    } catch (e) {
      // TTS not available on this device — silently ignore
    }
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.messageBubble,
        item.isBot ? styles.botBubble : styles.userBubble,
      ]}
    >
      <Text style={[styles.messageText, item.isBot ? styles.botText : styles.userText]}>
        {item.text}
      </Text>
      {item.isBot && (
        <TouchableOpacity
          style={styles.speakButton}
          onPress={() => speakMessage(item.text)}
        >
          <Volume2 size={18} color="#FFB6C1" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.aiAdvocate}</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#FFB6C1" />
          <Text style={styles.loadingText}>{t.thinking}</Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={t.typeSymptom}
            placeholderTextColor="#999"
            multiline
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Send size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F5',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4E9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  messagesList: {
    padding: 15,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  botBubble: {
    backgroundColor: '#FFE4E9',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: '#FFB6C1',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  botText: {
    color: '#333',
  },
  userText: {
    color: '#FFF',
  },
  speakButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  loadingText: {
    marginLeft: 10,
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#FFE4E9',
    backgroundColor: '#FFF',
  },
  input: {
    flex: 1,
    backgroundColor: '#FFF5F5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    backgroundColor: '#FFB6C1',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
