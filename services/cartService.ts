import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Unsubscribe,
  writeBatch,
} from 'firebase/firestore';

import { db } from '../firebaseConfig';
import { ProductItem, ProductVariant } from './homeService';

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  productName: string;
  productImage: string;
  unit: string;
  price: number;
  quantity: number;
  updatedAt?: unknown;
}

export const cartLineDocId = (productId: string, variantId?: string): string =>
  variantId ? `${productId}__${variantId}` : productId;

export const subscribeToCart = (
  uid: string,
  onChange: (items: CartItem[]) => void
): Unsubscribe => {
  const cartRef = collection(db, 'users', uid, 'cart');
  return onSnapshot(cartRef, snapshot => {
    if (snapshot.metadata.fromCache) return;
    const items: CartItem[] = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<CartItem, 'id'>),
    }));
    onChange(items);
  });
};

export const setProductQuantity = async (
  uid: string,
  product: ProductItem,
  quantity: number,
  variant?: ProductVariant
) => {
  const safeQuantity = Math.max(0, quantity);
  const hasVariants = !!(product.variants && product.variants.length > 0);
  if (hasVariants && !variant) return;

  const lineId = hasVariants && variant
    ? cartLineDocId(product.id, variant.id)
    : product.id;
  const cartItemRef = doc(db, 'users', uid, 'cart', lineId);

  if (safeQuantity === 0) {
    await deleteDoc(cartItemRef);
    return;
  }

  const unit = variant?.unit ?? product.unit;
  const price = variant?.price ?? product.price;

  await setDoc(
    cartItemRef,
    {
      productId: product.id,
      ...(variant ? { variantId: variant.id } : {}),
      productName: product.name,
      productImage: product.imageUrl,
      unit,
      price,
      quantity: safeQuantity,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const setCartItemQuantity = async (
  uid: string,
  item: Pick<CartItem, 'id' | 'productId' | 'productName' | 'productImage' | 'unit' | 'price' | 'variantId'>,
  quantity: number
) => {
  const safeQuantity = Math.max(0, quantity);
  const cartItemRef = doc(db, 'users', uid, 'cart', item.id);

  if (safeQuantity === 0) {
    await deleteDoc(cartItemRef);
    return;
  }

  await setDoc(
    cartItemRef,
    {
      productId: item.productId,
      ...(item.variantId ? { variantId: item.variantId } : {}),
      productName: item.productName,
      productImage: item.productImage,
      unit: item.unit,
      price: item.price,
      quantity: safeQuantity,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const getProductQuantity = async (
  userId: string,
  lineId: string
): Promise<number> => {
  const ref = doc(db, 'users', userId, 'cart', lineId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return 0;
  return (snap.data()?.quantity as number) ?? 0;
};

// ── Batch write — multiple line items in one Firestore roundtrip ───────────────
export interface BatchWriteItem {
  product: ProductItem;
  variant?: ProductVariant;
  quantity: number;
}

export const batchSetProductQuantities = async (
  uid: string,
  items: BatchWriteItem[]
): Promise<void> => {
  if (!items.length) return;

  // Firestore batch max is 500 ops — chunk defensively
  const CHUNK_SIZE = 400;

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    for (const item of chunk) {
      const { product, variant, quantity } = item;
      const safeQuantity = Math.max(0, quantity);

      const hasVariants = !!(product.variants && product.variants.length > 0);
      // Skip malformed items (multi-variant product with no variant supplied)
      if (hasVariants && !variant) continue;

      const lineId = hasVariants && variant
        ? cartLineDocId(product.id, variant.id)
        : product.id;
      const ref = doc(db, 'users', uid, 'cart', lineId);

      if (safeQuantity === 0) {
        batch.delete(ref);
      } else {
        const unit = variant?.unit ?? product.unit;
        const price = variant?.price ?? product.price;
        batch.set(
          ref,
          {
            productId: product.id,
            ...(variant ? { variantId: variant.id } : {}),
            productName: product.name,
            productImage: product.imageUrl,
            unit,
            price,
            quantity: safeQuantity,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    }

    await batch.commit();
  }
};