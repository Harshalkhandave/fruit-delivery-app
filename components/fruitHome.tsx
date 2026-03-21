import { ShoppingBasket } from 'lucide-react-native';
import React from 'react';
import { FlatList, SafeAreaView, StyleSheet } from 'react-native';
import { Appbar, Button, Card } from 'react-native-paper';

const FRUITS = [
  { id: '1', name: 'Mango (Hapus)', price: '₹600/dozen', img: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=200' },
  { id: '2', name: 'Bananas', price: '₹50/dozen', img: 'https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=200' },
];

// 1. Keep this interface
interface HomeProps {
  onLogout: () => void;
}

// 2. Rename 'App' to 'FruitHome' and pass the props
export default function FruitHome({ onLogout }: HomeProps) {
  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Market Yard Door" />
        {/* 3. Add the Logout Button in the Header */}
        <Appbar.Action icon="logout" onPress={onLogout} />
        <Appbar.Action icon={() => <ShoppingBasket size={24} color="black" />} onPress={() => {}} />
      </Appbar.Header>
      
      <FlatList
        data={FRUITS}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Cover source={{ uri: item.img }} />
            <Card.Title title={item.name} subtitle={item.price} />
            <Card.Actions>
              <Button mode="contained" onPress={() => console.log('Added', item.name)}>Add to Cart</Button>
            </Card.Actions>
          </Card>
        )}
        keyExtractor={item => item.id}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  card: { margin: 10, elevation: 4 },
});