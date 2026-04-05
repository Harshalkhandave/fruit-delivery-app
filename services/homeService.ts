import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore';

import { db } from '../firebaseConfig';

export interface BannerItem {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  active: boolean;
  order: number;
}

export interface ProductVariant {
  id: string;
  unit: string;
  price: number;
  oldPrice?: number;
  totalStock: number;
  maxQty?: number;
}

export interface ProductItem {
  id: string;
  name: string;
  imageUrl: string;
  unit: string;
  price: number;
  oldPrice?: number;
  totalStock: number;
  maxQty?: number;
  active: boolean;
  order: number;
  variants?: ProductVariant[];
}

// ── Cache config ───────────────────────────────────────────────────────────────
const PRODUCTS_CACHE_KEY = 'cache_products_v1';
const BANNERS_CACHE_KEY  = 'cache_banners_v1';
const PRODUCTS_TTL = 5  * 60 * 1000; // 5 minutes
const BANNERS_TTL  = 10 * 60 * 1000; // 10 minutes

interface CacheEntry<T> {
  data: T[];
  fetchedAt: number;
}

// In-memory layer — survives re-renders, cleared on app restart
let productsMemCache: CacheEntry<ProductItem> | null = null;
let bannersMemCache:  CacheEntry<BannerItem>  | null = null;

async function readCache<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as CacheEntry<T>) : null;
  } catch { return null; }
}

async function writeCache<T>(key: string, entry: CacheEntry<T>): Promise<void> {
  try { await AsyncStorage.setItem(key, JSON.stringify(entry)); } catch { /* ignore */ }
}

// ── fetchActiveBanners ─────────────────────────────────────────────────────────
// forceRefresh=true bypasses both cache layers (used on pull-to-refresh)
export const fetchActiveBanners = async (forceRefresh = false): Promise<BannerItem[]> => {
  if (!forceRefresh) {
    // 1. Memory cache
    if (bannersMemCache && Date.now() - bannersMemCache.fetchedAt < BANNERS_TTL) {
      return bannersMemCache.data;
    }
    // 2. AsyncStorage cache
    const stored = await readCache<BannerItem>(BANNERS_CACHE_KEY);
    if (stored && Date.now() - stored.fetchedAt < BANNERS_TTL) {
      bannersMemCache = stored;
      return stored.data;
    }
  }

  // 3. Firestore fetch
  const q = query(collection(db, 'banners'), orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  const data = snapshot.docs
    .map(d => ({ id: d.id, ...(d.data() as Omit<BannerItem, 'id'>) }))
    .filter(b => b.active);

  const entry: CacheEntry<BannerItem> = { data, fetchedAt: Date.now() };
  bannersMemCache = entry;
  void writeCache(BANNERS_CACHE_KEY, entry);
  return data;
};

// ── fetchActiveProducts ────────────────────────────────────────────────────────
export const fetchActiveProducts = async (forceRefresh = false): Promise<ProductItem[]> => {
  if (!forceRefresh) {
    if (productsMemCache && Date.now() - productsMemCache.fetchedAt < PRODUCTS_TTL) {
      return productsMemCache.data;
    }
    const stored = await readCache<ProductItem>(PRODUCTS_CACHE_KEY);
    if (stored && Date.now() - stored.fetchedAt < PRODUCTS_TTL) {
      productsMemCache = stored;
      return stored.data;
    }
  }

  const q = query(collection(db, 'products'), orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  const data = snapshot.docs
    .map(d => ({ id: d.id, ...(d.data() as Omit<ProductItem, 'id'>) }))
    .filter(p => p.active);

  const entry: CacheEntry<ProductItem> = { data, fetchedAt: Date.now() };
  productsMemCache = entry;
  void writeCache(PRODUCTS_CACHE_KEY, entry);
  return data;
};

// ── fetchSingleProduct — always fresh, updates memory cache entry ──────────────
export const fetchSingleProduct = async (productId: string): Promise<ProductItem | null> => {
  try {
    const snap = await getDoc(doc(db, 'products', productId));
    if (!snap.exists()) return null;
    const fresh = { id: snap.id, ...(snap.data() as Omit<ProductItem, 'id'>) };
    // Patch in-memory cache so other components see the updated product
    if (productsMemCache) {
      productsMemCache = {
        ...productsMemCache,
        data: productsMemCache.data.map(p => p.id === fresh.id ? fresh : p),
      };
    }
    return fresh;
  } catch { return null; }
};

// ── Cache invalidation — call before a forced refresh ─────────────────────────
export const invalidateProductsCache = (): void => {
  productsMemCache = null;
  void AsyncStorage.removeItem(PRODUCTS_CACHE_KEY);
};

export const invalidateBannersCache = (): void => {
  bannersMemCache = null;
  void AsyncStorage.removeItem(BANNERS_CACHE_KEY);
};