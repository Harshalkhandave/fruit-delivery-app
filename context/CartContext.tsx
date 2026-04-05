import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
  
  import {
    batchSetProductQuantities,
    cartLineDocId,
    getProductQuantity,
    setProductQuantity,
    subscribeToCart,
} from '../services/cartService';
import {
    fetchSingleProduct,
    ProductItem,
    ProductVariant,
} from '../services/homeService';
import { useUser } from './UserContext';
  
  const DEBOUNCE_MS = 1000;
  const STALE_THRESHOLD_MS = 30_000;
  
  export interface PendingWrite {
    product: ProductItem;
    nextQty: number;
    variant?: ProductVariant;
    timerId?: ReturnType<typeof setTimeout>;
    lastUpdatedAt: number;
  }
  
  interface CartContextValue {
    // State
    cartByLineId: Record<string, number>;
    optimisticCart: Record<string, number>;
    effectiveCart: Record<string, number>;
    cartCount: number;
    staleFetchingLineIds: Set<string>;
    navigating: boolean;
    navigatingFromDrawer: boolean;
  
    // Actions
    handleQuantityChange: (
      product: ProductItem,
      nextQty: number,
      variant?: ProductVariant,
      inModal?: boolean,
    ) => Promise<void>;
    safeNavigate: (path: string, fromDrawer?: boolean) => Promise<void>;
    flushPendingWrites: () => void;
    showMessage: (msg: string, type?: 'success' | 'warning', inModal?: boolean) => void;
  
    // Message state (consumed by UI)
    cartBarMsg: string | null;
    snackMsg: string | null;
    snackType: 'success' | 'warning';
    setSnackMsg: (msg: string | null) => void;
    modalSnackMsg: string | null;
    modalSnackType: 'success' | 'warning';
    setModalSnackMsg: (msg: string | null) => void;
  
    // Products state (shared so stale path can update it)
    setProducts: React.Dispatch<React.SetStateAction<ProductItem[]>>;
    setSelectedVariantByProductId: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  }
  
  const CartContext = createContext<CartContextValue | null>(null);
  
  export function CartProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { user } = useUser();
  
    // ── Cart state ─────────────────────────────────────────────────────────────
    const [cartByLineId, setCartByLineId] = useState<Record<string, number>>({});
    const [optimisticCart, setOptimisticCart] = useState<Record<string, number>>({});
    const [navigating, setNavigating] = useState(false);
    const [navigatingFromDrawer, setNavigatingFromDrawer] = useState(false);
    const [staleFetchingLineIds, setStaleFetchingLineIds] = useState<Set<string>>(new Set());
  
    // ── Message state ──────────────────────────────────────────────────────────
    const [cartBarMsg, setCartBarMsg] = useState<string | null>(null);
    const [snackMsg, setSnackMsg] = useState<string | null>(null);
    const [snackType, setSnackType] = useState<'success' | 'warning'>('warning');
    const [modalSnackMsg, setModalSnackMsg] = useState<string | null>(null);
    const [modalSnackType, setModalSnackType] = useState<'success' | 'warning'>('warning');
    const cartBarMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
    // ── Refs ───────────────────────────────────────────────────────────────────
    const pendingWrites = useRef<Record<string, PendingWrite>>({});
    const lastWrittenAt = useRef<Record<string, number>>({});
    const batchTimerId = useRef<ReturnType<typeof setTimeout> | null>(null);
  
    // ── Shared state setters exposed to FruitHome ──────────────────────────────
    // These are set by FruitHome but needed in CartContext for stale updates
    const [_products, _setProducts] = useState<ProductItem[]>([]);
    const [_selectedVariants, _setSelectedVariants] = useState<Record<string, string>>({});
    const setProducts = _setProducts;
    const setSelectedVariantByProductId = _setSelectedVariants;
  
    // ── Derived ────────────────────────────────────────────────────────────────
    const effectiveCart = useMemo(
      () => ({ ...cartByLineId, ...optimisticCart }),
      [cartByLineId, optimisticCart]
    );
  
    const cartCount = useMemo(
      () => Object.values(effectiveCart).reduce((s, q) => s + q, 0),
      [effectiveCart]
    );
  
    // ── setStaleLoading ────────────────────────────────────────────────────────
    const setStaleLoading = useCallback((lineId: string, loading: boolean) => {
      setStaleFetchingLineIds(prev => {
        const next = new Set(prev);
        loading ? next.add(lineId) : next.delete(lineId);
        return next;
      });
    }, []);
  
    // ── showMessage ────────────────────────────────────────────────────────────
    const showMessage = useCallback((
      msg: string,
      type: 'success' | 'warning' = 'warning',
      inModal = false
    ) => {
      if (inModal) { setModalSnackMsg(msg); setModalSnackType(type); return; }
      if (cartCount > 0) {
        if (cartBarMsgTimer.current) clearTimeout(cartBarMsgTimer.current);
        setCartBarMsg(msg);
        cartBarMsgTimer.current = setTimeout(() => setCartBarMsg(null), 2500);
      } else {
        setSnackMsg(msg);
        setSnackType(type);
      }
    }, [cartCount]);
  
    // ── Cart subscription ──────────────────────────────────────────────────────
    useEffect(() => {
      if (!user?.uid) return;
      const unsub = subscribeToCart(user.uid, items => {
        const mapped = items.reduce<Record<string, number>>((acc, item) => {
          if (item.quantity > 0) acc[item.id] = item.quantity;
          return acc;
        }, {});
        setCartByLineId(mapped);
        setOptimisticCart(prev => {
          const next = { ...prev };
          for (const lid of Object.keys(next)) {
            const fQty = mapped[lid] ?? 0;
            if (fQty === next[lid] || (next[lid] === 0 && !mapped[lid])) delete next[lid];
          }
          return next;
        });
      });
      return unsub;
    }, [user?.uid]);
  
    // ── flushPendingWrites ─────────────────────────────────────────────────────
    const flushPendingWrites = useCallback(() => {
      const entries = Object.entries(pendingWrites.current);
      if (!entries.length || !user?.uid) return;
      if (batchTimerId.current) { clearTimeout(batchTimerId.current); batchTimerId.current = null; }
      const toWrite = entries
        .filter(([lid, pw]) => pw.nextQty !== (cartByLineId[lid] ?? 0))
        .map(([, pw]) => ({ product: pw.product, variant: pw.variant, quantity: pw.nextQty }));
      entries.forEach(([lid]) => { lastWrittenAt.current[lid] = Date.now(); });
      pendingWrites.current = {};
      if (toWrite.length > 0) void batchSetProductQuantities(user.uid, toWrite);
    }, [user?.uid, cartByLineId]);
  
    // ── safeNavigate ──────────────────────────────────────────────────────────
    const safeNavigate = useCallback(async (path: string, fromDrawer = false) => {
      const hasPending = Object.keys(pendingWrites.current).length > 0;
      if (hasPending) {
        setNavigating(true); setNavigatingFromDrawer(fromDrawer);
        if (batchTimerId.current) { clearTimeout(batchTimerId.current); batchTimerId.current = null; }
        const toWrite = Object.entries(pendingWrites.current)
          .filter(([lid, pw]) => pw.nextQty !== (cartByLineId[lid] ?? 0))
          .map(([, pw]) => ({ product: pw.product, variant: pw.variant, quantity: pw.nextQty }));
        Object.entries(pendingWrites.current).forEach(([lid]) => { lastWrittenAt.current[lid] = Date.now(); });
        pendingWrites.current = {};
        try { if (toWrite.length > 0) await batchSetProductQuantities(user!.uid, toWrite); } catch { /* allow */ }
        setOptimisticCart({});
        setNavigating(false); setNavigatingFromDrawer(false);
      }
      router.push(path as never);
    }, [router, user, cartByLineId]);
  
    // ── handleQuantityChange ───────────────────────────────────────────────────
    const handleQuantityChange = useCallback(async (
      product: ProductItem,
      nextQty: number,
      variant?: ProductVariant,
      inModal = false,
    ) => {
      if (!user?.uid) return;
  
      const lineId = variant && product.variants?.length
        ? cartLineDocId(product.id, variant.id)
        : product.id;
      const currentQty = effectiveCart[lineId] || 0;
      const now = Date.now();
      const isIncrease = nextQty > currentQty;
  
      // ── STALE PATH (increase only) ───────────────────────────────────────────
      if (isIncrease) {
        const lastWrite = lastWrittenAt.current[lineId] ?? 0;
        const isStale = lastWrite > 0 && now - lastWrite > STALE_THRESHOLD_MS;
  
        if (isStale) {
          setStaleLoading(lineId, true);
          try {
            const [dbCartQty, freshProduct] = await Promise.all([
              getProductQuantity(user.uid, lineId),
              fetchSingleProduct(product.id),
            ]);
  
            if (freshProduct) {
              // Update product list UI with fresh data
              setProducts(prev => prev.map(p => p.id === freshProduct.id ? freshProduct : p));
  
              const freshVariant = variant
                ? freshProduct.variants?.find(v => v.id === variant.id) ?? null
                : null;
  
              if (variant && !freshVariant) {
                const firstAvail = freshProduct.variants?.find(v => v.totalStock > 0) ?? freshProduct.variants?.[0];
                if (firstAvail) setSelectedVariantByProductId(prev => ({ ...prev, [product.id]: firstAvail.id }));
                showMessage('Selected variant is no longer available. Switched to another.', 'warning', inModal);
                setStaleLoading(lineId, false); return;
              }
  
              const freshStock = freshVariant?.totalStock ?? freshProduct.totalStock;
              const freshMax = Math.min(freshVariant?.maxQty ?? freshProduct.maxQty ?? freshStock, freshStock);
  
              if (dbCartQty > freshMax) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                showMessage(`Max ${freshMax} unit${freshMax !== 1 ? 's' : ''} allowed. Cart updated.`, 'warning', inModal);
                setOptimisticCart(prev => ({ ...prev, [lineId]: freshMax }));
                await setProductQuantity(user.uid, product, freshMax, freshVariant ?? undefined);
                lastWrittenAt.current[lineId] = Date.now();
                setStaleLoading(lineId, false); return;
              }
  
              if (freshStock === 0) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                showMessage('This item is now out of stock.', 'warning', inModal);
                if (dbCartQty > 0) {
                  setOptimisticCart(prev => ({ ...prev, [lineId]: 0 }));
                  await setProductQuantity(user.uid, product, 0, freshVariant ?? undefined);
                  lastWrittenAt.current[lineId] = Date.now();
                }
                setStaleLoading(lineId, false); return;
              }
  
              const correctedQty = Math.max(0, dbCartQty + (nextQty - currentQty));
              if (correctedQty > freshMax) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                showMessage(`Max ${freshMax} unit${freshMax !== 1 ? 's' : ''} allowed per order.`, 'warning', inModal);
                setOptimisticCart(prev => ({ ...prev, [lineId]: freshMax }));
                await setProductQuantity(user.uid, product, freshMax, freshVariant ?? undefined);
                lastWrittenAt.current[lineId] = Date.now();
                setStaleLoading(lineId, false); return;
              }
  
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
              if (freshVariant) setSelectedVariantByProductId(prev => ({ ...prev, [product.id]: freshVariant.id }));
              setOptimisticCart(prev => ({ ...prev, [lineId]: correctedQty <= 0 ? 0 : correctedQty }));
              lastWrittenAt.current[lineId] = now;
              await setProductQuantity(user.uid, product, correctedQty, freshVariant ?? undefined);
              lastWrittenAt.current[lineId] = Date.now();
              setStaleLoading(lineId, false); return;
            }
          } catch { /* fall through */ }
          setStaleLoading(lineId, false);
        }
      }
  
      // ── NORMAL PATH ──────────────────────────────────────────────────────────
      if (isIncrease) {
        const stock = variant?.totalStock ?? product.totalStock;
        const max = Math.min(variant?.maxQty ?? product.maxQty ?? stock, stock);
        if (stock === 0) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          showMessage('This item is out of stock.', 'warning', inModal); return;
        }
        if (nextQty > max) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          showMessage(`Max ${max} unit${max !== 1 ? 's' : ''} allowed per order.`, 'warning', inModal); return;
        }
      }
  
      setOptimisticCart(prev => ({ ...prev, [lineId]: nextQty <= 0 ? 0 : nextQty }));
      if (!lastWrittenAt.current[lineId]) lastWrittenAt.current[lineId] = now;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
      if (isIncrease && variant) setSelectedVariantByProductId(prev => ({ ...prev, [product.id]: variant.id }));
  
      const existing = pendingWrites.current[lineId];
      if (existing?.timerId) clearTimeout(existing.timerId);
  
      pendingWrites.current[lineId] = { product, nextQty, variant, lastUpdatedAt: now };
  
      if (batchTimerId.current) clearTimeout(batchTimerId.current);
      batchTimerId.current = setTimeout(() => {
        const writes = Object.entries(pendingWrites.current);
        if (!writes.length || !user?.uid) return;
        const toWrite = writes
          .filter(([lid, pw]) => pw.nextQty !== (cartByLineId[lid] ?? 0))
          .map(([, pw]) => ({ product: pw.product, variant: pw.variant, quantity: pw.nextQty }));
        writes.forEach(([lid]) => { lastWrittenAt.current[lid] = Date.now(); });
        pendingWrites.current = {};
        if (toWrite.length > 0) void batchSetProductQuantities(user.uid, toWrite);
      }, DEBOUNCE_MS);
    }, [user?.uid, effectiveCart, showMessage, setStaleLoading, cartByLineId]);
  
    const value: CartContextValue = {
      cartByLineId,
      optimisticCart,
      effectiveCart,
      cartCount,
      staleFetchingLineIds,
      navigating,
      navigatingFromDrawer,
      handleQuantityChange,
      safeNavigate,
      flushPendingWrites,
      showMessage,
      cartBarMsg,
      snackMsg,
      snackType,
      setSnackMsg,
      modalSnackMsg,
      modalSnackType,
      setModalSnackMsg,
      setProducts,
      setSelectedVariantByProductId,
    };
  
    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
  }
  
  export function useCart(): CartContextValue {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used within CartProvider');
    return ctx;
  }