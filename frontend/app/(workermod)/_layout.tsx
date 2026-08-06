import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function WorkerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerShadowVisible: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#2ecc71',
        tabBarInactiveTintColor: '#95a5a6',
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ focused, color }) => (
            <View style={[styles.icon, focused && styles.iconActive]}>
              <MaterialCommunityIcons name="clipboard-list-outline" size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <View style={[styles.icon, focused && styles.iconActive]}>
              <Ionicons name="person-outline" size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="tracking"
        options={{
          title: 'GPS',
          tabBarIcon: ({ focused, color }) => (
            <View style={[styles.icon, focused && styles.iconActive]}>
              <Ionicons name="location-outline" size={24} color={color} />
            </View>
          ),
        }}
      />
      {/* Hidden screens */}
      <Tabs.Screen
        name="navigation"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="taskDetails"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="login"
        options={{ href: null }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#fff',
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontWeight: '600',
    color: '#2c3e50',
    fontSize: 18,
  },
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    height: Platform.OS === 'ios' ? 85 : 65,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  icon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActive: {
    transform: [{ scale: 1.1 }],
  },
});