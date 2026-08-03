export type Unit = 'KG' | 'G' | 'L' | 'ML' | 'UN';

export interface Ingredient {
  id: string;
  name: string;
  unit: Unit;
  costPerUnit: number;
  stock: number;
}

export interface RecipeItem {
  id: string;
  ingredientId: string;
  quantity: number; // raw quantity
  wastePercentage: number; // e.g., 20 for 20%
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  recipe: RecipeItem[];
}

export type PaymentMethod = 'PIX' | 'CREDITO' | 'DEBITO' | 'DINHEIRO';

export interface Sale {
  id: string;
  productId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  date: string;
}

export interface Purchase {
  id: string;
  ingredientId: string;
  quantity: number;
  totalCost: number;
  date: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
}

export type OrderStatus = 'AGUARDANDO_CONFIRMACAO' | 'EM_PREPARACAO' | 'PRONTO' | 'ENTREGUE' | 'CANCELADO';
export type OrderType = 'DELIVERY' | 'RETIRADA_BALCAO';

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  type: OrderType;
  customerId: string;
  items: OrderItem[];
  total: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
}


