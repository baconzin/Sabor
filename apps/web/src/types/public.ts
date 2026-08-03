export interface DeliveryArea {
  id: string;
  name: string;
  city: string;
  neighborhoods: string[];
  zipCodeStart?: string;
  zipCodeEnd?: string;
  deliveryFee: number;
  minOrderValue?: number;
  estimatedTimeAdd: number;
  freeShippingOver?: number;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderValue?: number;
}

export interface CheckDeliveryResponse {
  available: boolean;
  area?: DeliveryArea;
  message?: string;
}
