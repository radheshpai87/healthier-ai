import { Tabs } from 'expo-router';
import { Home, Calendar, MessageCircle, Settings, Activity } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FFB6C1',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#FFF5F5',
          borderTopColor: '#FFE4E9',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index"    options={{ title: 'Home',     tabBarIcon: ({ color, size }) => <Home            color={color} size={size} /> }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar', tabBarIcon: ({ color, size }) => <Calendar        color={color} size={size} /> }} />
      <Tabs.Screen name="risk"     options={{ title: 'Health',   tabBarIcon: ({ color, size }) => <Activity        color={color} size={size} /> }} />
      <Tabs.Screen name="chat"     options={{ title: 'AI Chat',  tabBarIcon: ({ color, size }) => <MessageCircle   color={color} size={size} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <Settings        color={color} size={size} /> }} />
    </Tabs>
  );
}
