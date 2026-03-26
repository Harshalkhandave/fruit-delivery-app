import { Stack } from 'expo-router';
import { MD3LightTheme, Provider as PaperProvider } from 'react-native-paper';
import { UserProvider } from '../context/UserContext'; // ✅ ADD

export default function RootLayout() {
  return (
    <UserProvider>
      <PaperProvider theme={MD3LightTheme}>
        <Stack screenOptions={{ headerShown: false }} />
      </PaperProvider>
    </UserProvider>
  );
}