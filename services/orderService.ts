import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore';

import { db } from '../firebaseConfig';
import { CartItem } from './cartService';

export interface OrderAddress {
  receiverName: string;
  receiverPhone: string;
  line1: string;
  line2: string;
  nearby?: string;
  city: string;
  state: string;
}

export interface PlaceOrderPayload {
  uid: string;
  items: CartItem[];
  address: OrderAddress;
  deliveryWindow: string;
  subtotal: number;
  bagCharge: number;
  promoCode?: string;
  promoDiscount: number;
  totalAmount: number;
}

export interface UserOrder {
  id: string;
  uid: string;
  items: CartItem[];
  address: OrderAddress;
  subtotal: number;
  bagCharge: number;
  deliveryWindow: string;
  promoCode?: string;
  promoDiscount: number;
  totalAmount: number;
  status: 'placed' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled';
  paymentInfo: {
    mode: 'COD';
    note: string;
    upiAccepted: boolean;
  };
  createdAt?: Timestamp;
}

export const clearUserCart = async (uid: string) => {
  const cartRef = collection(db, 'users', uid, 'cart');
  const snapshot = await getDocs(cartRef);
  const batch = writeBatch(db);
  snapshot.docs.forEach(docSnap => batch.delete(docSnap.ref));
  await batch.commit();
};

export const placeOrder = async (payload: PlaceOrderPayload) => {
  const orderBody = {
    uid: payload.uid,
    items: payload.items,
    address: payload.address,
    deliveryWindow: payload.deliveryWindow,
    subtotal: payload.subtotal,
    bagCharge: payload.bagCharge,
    promoCode: payload.promoCode || '',
    promoDiscount: payload.promoDiscount,
    totalAmount: payload.totalAmount,
    status: 'placed' as const,
    paymentInfo: {
      mode: 'COD' as const,
      note: 'Cash on Delivery. UPI accepted at delivery.',
      upiAccepted: true,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Store for user-specific history
  const userOrdersRef = collection(db, 'users', payload.uid, 'orders');
  const userOrderDoc = await addDoc(userOrdersRef, orderBody);

  // Store globally for admin/order management
  await addDoc(collection(db, 'orders'), {
    ...orderBody,
    userOrderId: userOrderDoc.id,
  });

  await clearUserCart(payload.uid);
  return userOrderDoc.id;
};

export const subscribeUserOrders = (
  uid: string,
  onChange: (orders: UserOrder[]) => void
): Unsubscribe => {
  const ordersRef = collection(db, 'users', uid, 'orders');
  // Subcollection is already scoped by uid; avoid composite index requirement.
  const q = query(ordersRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    snapshot => {
      const orders = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<UserOrder, 'id'>),
      }));
      onChange(orders);
    },
    error => {
      console.error('subscribeUserOrders error:', error);
      onChange([]);
    }
  );
};
