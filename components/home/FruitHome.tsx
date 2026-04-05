import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { ShoppingBasket } from 'lucide-react-native';
import React, {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    Animated as RNAnimated,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    Appbar,
    Divider,
    RadioButton,
    Snackbar,
    Text,
} from 'react-native-paper';
import {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import i18n from '../../config/i18n';
import { useCart } from '../../context/CartContext';
import { useUser } from '../../context/UserContext';
import { cartLineDocId } from '../../services/cartService';
import {
    BannerItem,
    fetchActiveBanners,
    fetchActiveProducts,
    invalidateBannersCache,
    invalidateProductsCache,
    ProductItem,
    ProductVariant,
} from '../../services/homeService';

import { BannerCarousel, BannerSkeleton } from './BannerCarousel';
import { CartBar } from './CartBar';
import { FlyingParticle, type ParticleData } from './FlyingParticle';
import { NetworkBanner } from './NetworkBanner';
import { ProductCard } from './ProductCard';
import { ProductSkeleton } from './ProductSkeleton';
import { SideDrawer } from './SideDrawer';
import { VariantSheet } from './VariantSheet';

const { width } = Dimensions.get('window');
const VARIANT_STORAGE_KEY = 'selectedVariants';

interface HomeProps {
  onLogout: () => void;
}

export default function FruitHome({ onLogout }: HomeProps) {
  const router = useRouter();
  const { user } = useUser();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const {
    effectiveCart, cartCount, staleFetchingLineIds,
    navigating, navigatingFromDrawer,
    handleQuantityChange, safeNavigate, flushPendingWrites, showMessage,
    cartBarMsg, snackMsg, snackType, setSnackMsg,
    modalSnackMsg, modalSnackType, setModalSnackMsg,
    setProducts, setSelectedVariantByProductId: setSelectedVariantsInCart,
  } = useCart();

  // ── Network ────────────────────────────────────────────────────────────────
  const [isConnected, setIsConnected] = useState(true);
  const wasConnected = useRef(true);
  const networkBannerHeight = useRef(new RNAnimated.Value(0)).current;
  const [networkBannerMsg, setNetworkBannerMsg] = useState('');
  const [networkBannerColor, setNetworkBannerColor] = useState('#d32f2f');
  const greenBannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const netInfoDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [currentLang, setCurrentLang] = useState<'en' | 'mr'>(i18n.language as 'en' | 'mr');
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [products, setLocalProducts] = useState<ProductItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [variantSheetProductId, setVariantSheetProductId] = useState<string | null>(null);
  const [selectedVariantByProductId, setSelectedVariantByProductId] = useState<Record<string, string>>({});

  // ── Particles ──────────────────────────────────────────────────────────────
  const [particles, setParticles] = useState<ParticleData[]>([]);
  const basketRef = useRef<View>(null);
  const basketPosition = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const cartBarBadgeRef = useRef<View>(null);
  const cartBarBadgePosition = useRef({ x: 0, y: 0 });
  const addButtonRefs = useRef<Record<string, View | null>>({});
  const productImageRefs = useRef<Record<string, View | null>>({});
  const bannerListRef = useRef<FlatList<BannerItem> | null>(null);
  const bannerScrolledManually = useRef(false);

  const measureBasket = useCallback(() => {
    basketRef.current?.measure((_, __, w, h, pageX, pageY) => {
      basketPosition.current = { x: pageX + w / 2, y: pageY + h / 2, width: w, height: h };
    });
  }, []);

  const measureCartBarBadge = useCallback(() => {
    cartBarBadgeRef.current?.measure((_, __, w, h, pageX, pageY) => {
      cartBarBadgePosition.current = { x: pageX + w / 2, y: pageY + h / 2 };
    });
  }, []);

  const spawnParticle = useCallback((type: '+1' | '-1', fromX: number, fromY: number, toX: number, toY: number) => {
    const id = `${Date.now()}-${Math.random()}`;
    setParticles(prev => [...prev, { id, fromX, fromY, toX, toY, type }]);
  }, []);

  const removeParticle = useCallback((id: string) => {
    setParticles(prev => prev.filter(p => p.id !== id));
  }, []);

  const getParticleTarget = useCallback(() => {
    const { x, y } = cartBarBadgePosition.current;
    if (x !== 0 || y !== 0) return { x, y };
    return { x: basketPosition.current.x, y: basketPosition.current.y };
  }, []);

  // ── Cart Bar animation ─────────────────────────────────────────────────────
  const cartBarScale = useSharedValue(0);
  const cartBarOpacity = useSharedValue(0);
  const prevCartCount = useRef(0);

  const cartBarAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: cartBarScale.value }, { scaleY: cartBarScale.value }],
    opacity: cartBarOpacity.value,
  }));

  useEffect(() => {
    if (prevCartCount.current === 0 && cartCount > 0) {
      cartBarScale.value = withSpring(1, { damping: 14, stiffness: 180 });
      cartBarOpacity.value = withSpring(1, { damping: 14, stiffness: 180 });
    } else if (prevCartCount.current > 0 && cartCount === 0) {
      cartBarScale.value = withSpring(0, { damping: 14, stiffness: 180 });
      cartBarOpacity.value = withSpring(0, { damping: 14, stiffness: 180 });
    }
    prevCartCount.current = cartCount;
  }, [cartCount]);

  // ── Sync products to CartContext so stale path can update UI ──────────────
  useEffect(() => { setProducts(products); }, [products]);
  // eslint-disable-next-line react-hooks/exhaustive-deps — intentional sync

  // ── Network banner ─────────────────────────────────────────────────────────
  const showNetworkBanner = useCallback((msg: string, color: string, autoDismissMs?: number) => {
    if (greenBannerTimer.current) clearTimeout(greenBannerTimer.current);
    setNetworkBannerMsg(msg); setNetworkBannerColor(color);
    RNAnimated.spring(networkBannerHeight, { toValue: 36, useNativeDriver: false, tension: 60, friction: 12 }).start();
    if (autoDismissMs) {
      greenBannerTimer.current = setTimeout(() => {
        RNAnimated.spring(networkBannerHeight, { toValue: 0, useNativeDriver: false, tension: 60, friction: 12 }).start();
      }, autoDismissMs);
    }
  }, [networkBannerHeight]);

  const hideNetworkBanner = useCallback(() => {
    if (greenBannerTimer.current) clearTimeout(greenBannerTimer.current);
    RNAnimated.spring(networkBannerHeight, { toValue: 0, useNativeDriver: false, tension: 60, friction: 12 }).start();
  }, [networkBannerHeight]);

  useEffect(() => {
    const handle = (state: NetInfoState) => {
      const connected = !!(state.isConnected && state.isInternetReachable);
      if (netInfoDebounceTimer.current) clearTimeout(netInfoDebounceTimer.current);
      netInfoDebounceTimer.current = setTimeout(() => {
        setIsConnected(connected);
        if (!connected) { wasConnected.current = false; showNetworkBanner('No internet connection', '#d32f2f'); }
        else if (!wasConnected.current) { wasConnected.current = true; showNetworkBanner('Back online', '#2e7d32', 2500); }
        else { wasConnected.current = true; hideNetworkBanner(); }
      }, 500);
    };
    const unsub = NetInfo.addEventListener(handle);
    return () => { unsub(); if (netInfoDebounceTimer.current) clearTimeout(netInfoDebounceTimer.current); };
  }, [showNetworkBanner, hideNetworkBanner]);

  // ── Flush on blur ──────────────────────────────────────────────────────────
  useFocusEffect(useCallback(() => { return () => { flushPendingWrites(); }; }, [flushPendingWrites]));

  // ── Load home data ─────────────────────────────────────────────────────────
  const loadHome = useCallback(async (isRefresh = false) => {
    if (isRefresh) { setRefreshing(true); invalidateProductsCache(); invalidateBannersCache(); }
    else setLoadingData(true);
    try {
      const [bannerData, productData] = await Promise.all([
        fetchActiveBanners(isRefresh),
        fetchActiveProducts(isRefresh),
      ]);
      setBanners(bannerData.length > 0 ? bannerData : defaultBanners);
      setLocalProducts(productData.length > 0 ? productData : defaultProducts);
    } catch {
      setBanners(defaultBanners);
      setLocalProducts(defaultProducts);
    } finally { setLoadingData(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadHome(false); }, [loadHome]);
  const onRefresh = useCallback(() => { if (refreshing) return; loadHome(true); }, [refreshing, loadHome]);

  // ── Auto-switch variant ────────────────────────────────────────────────────
  useEffect(() => {
    for (const product of products) {
      if (!product.variants?.length) continue;
      const curId = selectedVariantByProductId[product.id];
      if (!curId) continue;
      const curLineId = cartLineDocId(product.id, curId);
      if ((effectiveCart[curLineId] || 0) === 0) {
        const inCart = product.variants.find(v => (effectiveCart[cartLineDocId(product.id, v.id)] || 0) > 0);
        if (inCart) setSelectedVariantByProductId(prev => ({ ...prev, [product.id]: inCart.id }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveCart]);

  // ── Persist variant selection ──────────────────────────────────────────────
  useEffect(() => { AsyncStorage.getItem(VARIANT_STORAGE_KEY).then(r => { if (r) setSelectedVariantByProductId(JSON.parse(r)); }); }, []);
  useEffect(() => {
    if (!Object.keys(selectedVariantByProductId).length) return;
    AsyncStorage.setItem(VARIANT_STORAGE_KEY, JSON.stringify(selectedVariantByProductId));
  }, [selectedVariantByProductId]);

  useEffect(() => {
    setSelectedVariantByProductId(prev => {
      const next = { ...prev };
      for (const p of products) { if (p.variants?.length && !next[p.id]) next[p.id] = p.variants[0].id; }
      return next;
    });
  }, [products]);

  // ── Banner auto-scroll ─────────────────────────────────────────────────────
  useEffect(() => {
    if (loadingData || banners.length <= 1) return;
    const interval = setInterval(() => {
      if (bannerScrolledManually.current) { bannerScrolledManually.current = false; return; }
      setActiveBannerIndex(prev => {
        const next = (prev + 1) % banners.length;
        bannerListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 15000);
    return () => clearInterval(interval);
  }, [banners.length, loadingData]);

  // ── Particle spawn helpers ─────────────────────────────────────────────────
  const handleQuickAdd = useCallback((
    product: ProductItem,
    buttonRef: View | null,
    imageRef: View | null,
  ) => {
    const variants = product.variants?.length ? product.variants : undefined;
    const selectedId = variants ? selectedVariantByProductId[product.id] ?? variants[0].id : undefined;
    const selectedVariant = variants?.find(v => v.id === selectedId) ?? variants?.[0];
    const lineId = variants && selectedVariant ? cartLineDocId(product.id, selectedVariant.id) : product.id;
    const qty = effectiveCart[lineId] || 0;

    void handleQuantityChange(product, qty + 1, selectedVariant, false);
    if (buttonRef) {
      buttonRef.measure((_, __, w, h, pageX, pageY) => {
        const target = getParticleTarget();
        spawnParticle('+1', pageX + w / 2, pageY + h / 2, target.x, target.y);
      });
    }
  }, [selectedVariantByProductId, effectiveCart, handleQuantityChange, spawnParticle, getParticleTarget]);

  const handleStepperPress = useCallback((
    product: ProductItem,
    nextQty: number,
    variant: ProductVariant | undefined,
    buttonRef: View | null,
    imageRef: View | null,
    isIncrease: boolean,
  ) => {
    void handleQuantityChange(product, nextQty, variant, false);
    if (buttonRef) {
      buttonRef.measure((_, __, w, h, pageX, pageY) => {
        const bx = pageX + w / 2, by = pageY + h / 2;
        const target = getParticleTarget();
        if (isIncrease) {
          spawnParticle('+1', bx, by, target.x, target.y);
        } else if (imageRef) {
          imageRef.measure((_a, _b, iw, ih, ipX, ipY) => {
            spawnParticle('-1', target.x, target.y, ipX + iw / 2, ipY + ih / 2);
          });
        }
      });
    }
  }, [handleQuantityChange, spawnParticle, getParticleTarget]);

  const handleVariantSpawnParticle = useCallback((
    type: '+1' | '-1',
    btnRef: View | null,
    imgRef: View | null,
    isIncrease: boolean,
    _vLineId: string,
  ) => {
    const target = getParticleTarget();
    if (isIncrease && btnRef) {
      btnRef.measure((_, __, w, h, pageX, pageY) => {
        spawnParticle('+1', pageX + w / 2, pageY + h / 2, target.x, target.y);
      });
    } else if (!isIncrease) {
      if (imgRef) {
        imgRef.measure((_, __, iw, ih, ipX, ipY) => {
          spawnParticle('-1', target.x, target.y, ipX + iw / 2, ipY + ih / 2);
        });
      } else if (btnRef) {
        btnRef.measure((_, __, w, h, pageX, pageY) => {
          spawnParticle('-1', target.x, target.y, pageX + w / 2, pageY + h / 2);
        });
      }
    }
  }, [getParticleTarget, spawnParticle]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const tr = (key: string, fallback: string) => t(key) || fallback;
  const changeLanguage = (lng: 'en' | 'mr') => { i18n.changeLanguage(lng); setCurrentLang(lng); setLangModalVisible(false); };
  const firstInitial = (user?.firstName?.charAt(0)?.toUpperCase() || 'U').toString();
  const cartBarBottom = insets.bottom + 16;

  const variantProduct = products.find(p => p.id === variantSheetProductId) ?? null;
  const variantSelectedId = variantProduct
    ? selectedVariantByProductId[variantProduct.id] ?? variantProduct.variants?.[0]?.id ?? ''
    : '';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>

      <NetworkBanner
        height={networkBannerHeight}
        color={networkBannerColor}
        message={networkBannerMsg}
      />

      <Appbar.Header style={{ backgroundColor: '#fff', elevation: 2 }}>
        <Appbar.Action icon="menu" onPress={() => setDrawerVisible(true)} />
        <Appbar.Content title={tr('market_yard_door', 'Market Yard Door')} titleStyle={{ fontWeight: 'bold' }} />
        <TouchableOpacity
          onPress={() => void safeNavigate('/Cart', false)}
          disabled={navigating}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.basketTouchable}
        >
          <View ref={basketRef} collapsable={false} onLayout={measureBasket} style={styles.basketIconWrap}>
            {navigating && !navigatingFromDrawer
              ? <ActivityIndicator size="small" color="#2e7d32" />
              : <ShoppingBasket size={24} color="black" />
            }
            {cartCount > 0 && !(navigating && !navigatingFromDrawer) ? (
              <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cartCount}</Text></View>
            ) : null}
          </View>
        </TouchableOpacity>
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={[styles.content, cartCount > 0 && { paddingBottom: cartBarBottom + 72 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2e7d32']} tintColor="#2e7d32" />}
      >
        <Text variant="titleMedium" style={styles.sectionTitle}>{tr('today_offers', "Today's Offers")}</Text>

        {loadingData ? (
          <View style={{ flexDirection: 'row', gap: 12, paddingBottom: 6 }}>
            <BannerSkeleton /><BannerSkeleton />
          </View>
        ) : (
          <BannerCarousel
            banners={banners}
            activeBannerIndex={activeBannerIndex}
            onIndexChange={idx => { setActiveBannerIndex(idx); bannerScrolledManually.current = true; }}
            listRef={bannerListRef}
          />
        )}

        <Text variant="titleMedium" style={styles.sectionTitle}>{tr('fresh_fruits', 'Fresh Fruits')}</Text>

        <View style={styles.grid}>
          {loadingData ? (
            Array.from({ length: 8 }, (_, i) => <ProductSkeleton key={i} />)
          ) : products.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>🍎</Text>
              <Text variant="titleMedium" style={{ color: '#888', marginTop: 8, fontWeight: '600' }}>No products available</Text>
              <Text variant="bodySmall" style={{ color: '#aaa', marginTop: 4 }}>Pull down to refresh</Text>
            </View>
          ) : products.map(product => {
            const variants = product.variants?.length ? product.variants : undefined;
            const selectedId = variants ? selectedVariantByProductId[product.id] ?? variants[0].id : undefined;
            const selectedVariant = variants?.find(v => v.id === selectedId) ?? variants?.[0];
            const lineId = variants && selectedVariant ? cartLineDocId(product.id, selectedVariant.id) : product.id;
            const qty = effectiveCart[lineId] || 0;
            const stockLimit = selectedVariant?.totalStock ?? product.totalStock;
            const maxQty = selectedVariant?.maxQty ?? product.maxQty ?? stockLimit;
            const effectiveMax = Math.min(maxQty, stockLimit);

            const addBtnRef = (ref: View | null) => { addButtonRefs.current[lineId] = ref; };
            const minusBtnRef = (ref: View | null) => { addButtonRefs.current[`${lineId}-minus`] = ref; };
            const imgRef = (ref: View | null) => { productImageRefs.current[lineId] = ref; };

            return (
              <ProductCard
                key={product.id}
                product={product}
                qty={qty}
                isStaleFetching={staleFetchingLineIds.has(lineId)}
                isAtMax={qty >= effectiveMax && effectiveMax > 0}
                isOutOfStock={stockLimit === 0}
                discountPct={product.oldPrice ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) : null}
                unitLabel={selectedVariant?.unit ?? product.unit}
                priceVal={selectedVariant?.price ?? product.price}
                oldPriceVal={selectedVariant?.oldPrice ?? product.oldPrice}
                selectedVariant={selectedVariant}
                lineId={lineId}
                hasMultiVariants={!!(variants && variants.length > 1)}
                addBtnRef={addBtnRef}
                minusBtnRef={minusBtnRef}
                imgRef={imgRef}
                onQuickAdd={() => handleQuickAdd(product, addButtonRefs.current[lineId] ?? null, productImageRefs.current[lineId] ?? null)}
                onIncrease={() => handleStepperPress(product, qty + 1, selectedVariant, addButtonRefs.current[lineId] ?? null, productImageRefs.current[lineId] ?? null, true)}
                onDecrease={() => handleStepperPress(product, qty - 1, selectedVariant, addButtonRefs.current[`${lineId}-minus`] ?? null, productImageRefs.current[lineId] ?? null, false)}
                onOpenVariants={() => setVariantSheetProductId(product.id)}
              />
            );
          })}
        </View>
      </ScrollView>

      {!drawerVisible && (
        <CartBar
          cartCount={cartCount}
          cartBarMsg={cartBarMsg}
          navigating={navigating}
          navigatingFromDrawer={navigatingFromDrawer}
          bottom={cartBarBottom}
          animStyle={cartBarAnimStyle}
          cartBarBadgeRef={cartBarBadgeRef}
          onMeasureBadge={measureCartBarBadge}
          onPress={() => void safeNavigate('/Cart', false)}
        />
      )}

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {particles.map(p => <FlyingParticle key={p.id} particle={p} onDone={removeParticle} />)}
      </View>

      {(loadingData || (navigating && navigatingFromDrawer)) && (
        <View style={styles.overlay}><ActivityIndicator size="large" color="#2e7d32" /></View>
      )}

      <SideDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        firstName={user?.firstName || ''}
        lastName={user?.lastName || ''}
        phoneNumber={user?.phoneNumber || ''}
        firstInitial={firstInitial}
        currentLang={currentLang}
        onEditProfile={() => { setDrawerVisible(false); void safeNavigate('/EditProfile', true); }}
        onLanguage={() => { setDrawerVisible(false); setTimeout(() => setLangModalVisible(true), 300); }}
        onManageAddress={() => { setDrawerVisible(false); void safeNavigate('/SavedAddresses', true); }}
        onMyOrders={() => { setDrawerVisible(false); void safeNavigate('/MyOrders', true); }}
        onContactUs={() => { setDrawerVisible(false); void safeNavigate('/ContactUs', true); }}
        onLogout={() => { setDrawerVisible(false); onLogout(); }}
        tr={tr}
      />

      <VariantSheet
        product={variantProduct}
        visible={!!variantSheetProductId}
        onClose={() => setVariantSheetProductId(null)}
        selectedVariantId={variantSelectedId}
        effectiveCart={effectiveCart}
        staleFetchingLineIds={staleFetchingLineIds}
        modalSnackMsg={modalSnackMsg}
        modalSnackType={modalSnackType}
        onDismissSnack={() => setModalSnackMsg(null)}
        onSelectVariant={variantId => {
          if (variantProduct) setSelectedVariantByProductId(prev => ({ ...prev, [variantProduct.id]: variantId }));
        }}
        onQuantityChange={(variant, nextQty) => {
          if (variantProduct) void handleQuantityChange(variantProduct, nextQty, variant, true);
        }}
        onSpawnParticle={handleVariantSpawnParticle}
        addButtonRefs={addButtonRefs}
        productImageRefs={productImageRefs}
        onNavigateToCart={() => { setVariantSheetProductId(null); void safeNavigate('/Cart', false); }}
        getParticleTarget={getParticleTarget}
      />

      <Modal visible={langModalVisible} transparent animationType="slide" onRequestClose={() => setLangModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setLangModalVisible(false)} />
        <View style={styles.langSheet}>
          <Text variant="titleMedium" style={styles.langSheetTitle}>{tr('select_language', 'Select Language')}</Text>
          <Divider />
          <Pressable style={styles.langOption} onPress={() => changeLanguage('en')}>
            <Text variant="bodyLarge">English</Text>
            <RadioButton value="en" status={currentLang === 'en' ? 'checked' : 'unchecked'} onPress={() => changeLanguage('en')} color="#2e7d32" />
          </Pressable>
          <Divider />
          <Pressable style={styles.langOption} onPress={() => changeLanguage('mr')}>
            <Text variant="bodyLarge">मराठी</Text>
            <RadioButton value="mr" status={currentLang === 'mr' ? 'checked' : 'unchecked'} onPress={() => changeLanguage('mr')} color="#2e7d32" />
          </Pressable>
        </View>
      </Modal>

      <Snackbar visible={!!snackMsg} onDismiss={() => setSnackMsg(null)} duration={2500}
        style={snackType === 'success' ? styles.snackSuccess : styles.snackWarning}>
        {snackMsg ?? ''}
      </Snackbar>
    </SafeAreaView>
  );
}

// ── Fallback data ──────────────────────────────────────────────────────────────
const defaultBanners: BannerItem[] = [
  { id: 'b1', title: 'Fresh Fruits Daily', subtitle: 'Direct from farms to your home', imageUrl: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=1200&q=80', active: true, order: 1 },
  { id: 'b2', title: 'Weekend Offers', subtitle: 'Up to 20% off on seasonal picks', imageUrl: 'https://images.unsplash.com/photo-1577234286642-fc512a5f8f11?auto=format&fit=crop&w=1200&q=80', active: true, order: 2 },
];

const defaultProducts: ProductItem[] = [
  { id: 'apple', name: 'Apple', imageUrl: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=600&q=80', unit: '1 kg', price: 180, oldPrice: 220, totalStock: 50, active: true, order: 1, variants: [{ id: '1pc', unit: '1 piece', price: 40, oldPrice: 50, totalStock: 20 }, { id: '500g', unit: '500 gm', price: 100, oldPrice: 120, totalStock: 30 }, { id: '1kg', unit: '1 kg', price: 180, oldPrice: 220, totalStock: 50 }] },
  { id: 'banana', name: 'Banana', imageUrl: 'https://images.unsplash.com/photo-1603833665858-e61d17a86224?auto=format&fit=crop&w=600&q=80', unit: '1 dozen', price: 60, oldPrice: 75, totalStock: 40, active: true, order: 2 },
  { id: 'orange', name: 'Orange', imageUrl: 'https://images.unsplash.com/photo-1582979512210-99b6a53386f9?auto=format&fit=crop&w=600&q=80', unit: '1 kg', price: 120, oldPrice: 150, totalStock: 0, active: true, order: 3 },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { paddingHorizontal: 16, paddingBottom: 20 },
  sectionTitle: { marginTop: 16, marginBottom: 10, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
  empty: { width: '100%', alignItems: 'center', paddingVertical: 48 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(245,245,245,0.85)', alignItems: 'center', justifyContent: 'center', zIndex: 99 },
  basketTouchable: { marginRight: 4 },
  basketIconWrap: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  cartBadge: { position: 'absolute', right: 2, top: 2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#d32f2f', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  langSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 },
  langSheetTitle: { fontWeight: 'bold', marginBottom: 12 },
  langOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  snackSuccess: { backgroundColor: '#2e7d32' },
  snackWarning: { backgroundColor: '#323232' },
});