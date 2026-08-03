import { api } from './api';
import { DeliveryArea, Coupon, CheckDeliveryResponse } from '../types/public';
import { MenuProduct } from '../types/menu';

export const publicService = {
  getMenu: async () => {
    const response = await api.get<MenuProduct[]>('/public/menu');
    return response.data;
  },

  checkDeliveryArea: async (zipCode: string, neighborhood: string, city: string) => {
    const response = await api.post<CheckDeliveryResponse>('/public/delivery/check', { zipCode, neighborhood, city });
    return response.data;
  },

  validateCoupon: async (code: string) => {
    const response = await api.post<Coupon>('/public/coupons/validate', { code });
    return response.data;
  },

  createOrder: async (orderData: any) => {
    const response = await api.post('/public/orders', orderData);
    return response.data;
  },

  getOrderStatus: async (orderId: string) => {
    const response = await api.get(`/public/orders/${orderId}`);
    return response.data;
  }
};
