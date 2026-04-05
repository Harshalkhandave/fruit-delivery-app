import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { initializeApp } from 'firebase/app';
import { doc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDwmTmIcIViPt2C82oGXqjRAr7zhX9HjzA',
  authDomain: 'your-app.firebaseapp.com',
  projectId: 'fruitwala-bc7a9',
  storageBucket: 'fruitwala-bc7a9.firebasestorage.app',
  messagingSenderId: '1032320265485',
  appId: '1:1032320265485:android:ca1bcefa2127a4ebee9444',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const loadJson = async filePath => {
  const raw = await readFile(filePath, 'utf-8');
  return JSON.parse(raw);
};

const seedCollection = async (collectionName, items) => {
  for (const item of items) {
    if (!item.id) {
      throw new Error(`Missing "id" in ${collectionName} item: ${JSON.stringify(item)}`);
    }

    const ref = doc(db, collectionName, item.id);
    const { id, ...payload } = item;
    await setDoc(
      ref,
      {
        ...payload,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
};

const main = async () => {
  const root = resolve(process.cwd(), 'admin', 'data');
  const banners = await loadJson(resolve(root, 'banners.json'));
  const products = await loadJson(resolve(root, 'products.json'));

  await seedCollection('banners', banners);
  await seedCollection('products', products);

  console.log(`Seed complete: ${banners.length} banners, ${products.length} products`);
};

main().catch(error => {
  console.error('Failed to seed home data:', error);
  process.exit(1);
});
