import { Stack } from 'expo-router';
import { MD3LightTheme, Provider as PaperProvider } from 'react-native-paper';
import { CartProvider } from '../context/CartContext';
import { UserProvider } from '../context/UserContext'; // ✅ ADD

export default function RootLayout() {
  return (
    <UserProvider>
      <CartProvider>
        <PaperProvider theme={MD3LightTheme}>
          <Stack screenOptions={{ headerShown: false }} />
        </PaperProvider>
      </CartProvider>
    </UserProvider>
  );
}