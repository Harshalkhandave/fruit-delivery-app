import { doc, getDoc, Timestamp } from 'firebase/firestore';

import { db } from '../firebaseConfig';

export interface PromoValidationResult {
  valid: boolean;
  code: string;
  discount: number;
  message?: string;
}

interface PromoDoc {
  active: boolean;
  type: 'flat' | 'percent';
  value: number;
  minSubtotal?: number;
  maxDiscount?: number;
  expiresAt?: Timestamp;
}

export const validatePromoCode = async (
  rawCode: string,
  subtotal: number
): Promise<PromoValidationResult> => {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { valid: false, code, discount: 0, message: 'Promo code required' };

  const promoRef = doc(db, 'promoCodes', code);
  const promoSnap = await getDoc(promoRef);

  if (!promoSnap.exists()) {
    return { valid: false, code, discount: 0, message: 'Invalid promo code' };
  }

  const promo = promoSnap.data() as PromoDoc;
  if (!promo.active) {
    return { valid: false, code, discount: 0, message: 'Promo code inactive' };
  }

  if (promo.expiresAt && promo.expiresAt.toMillis() < Date.now()) {
    return { valid: false, code, discount: 0, message: 'Promo code expired' };
  }

  if (promo.minSubtotal && subtotal < promo.minSubtotal) {
    return {
      valid: false,
      code,
      discount: 0,
      message: `Minimum order Rs ${promo.minSubtotal} required`,
    };
  }

  let discount = 0;
  if (promo.type === 'flat') {
    discount = promo.value;
  } else {
    discount = Math.floor((subtotal * promo.value) / 100);
  }

  if (promo.maxDiscount) {
    discount = Math.min(discount, promo.maxDiscount);
  }

  discount = Math.max(0, Math.min(discount, subtotal));
  return { valid: true, code, discount };
};
