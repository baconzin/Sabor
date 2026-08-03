import type {
  Customer,
  Ingredient,
  Order,
  OrderStatus,
  OrderType,
  PaymentMethod,
  Product,
  Purchase,
  RecipeItem,
  Sale,
  Unit,
} from '../types';
import { requireSupabase } from '../lib/supabase';

type IngredientRow = {
  id: string;
  name: string;
  unit: Unit;
  cost_per_unit: number | string;
  stock: number | string;
};

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
};

type RecipeItemRow = {
  id: string;
  product_id: string;
  ingredient_id: string;
  quantity: number | string;
  waste_percentage: number | string;
};

type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  address: string | null;
};

type PurchaseRow = {
  id: string;
  ingredient_id: string;
  quantity: number | string;
  total_cost: number | string;
  created_at: string;
};

type SaleRow = {
  id: string;
  product_id: string;
  payment_method: PaymentMethod;
  amount: number | string;
  created_at: string;
};

type OrderItemRow = {
  product_id: string;
  quantity: number | string;
  unit_price: number | string;
};

type OrderRow = {
  id: string;
  order_number: number | string;
  status: OrderStatus;
  type: OrderType;
  customer_id: string | null;
  total: number | string;
  payment_method: PaymentMethod;
  created_at: string;
  order_items?: OrderItemRow[] | null;
};

export type RestaurantData = {
  customers: Customer[];
  ingredients: Ingredient[];
  products: Product[];
  purchases: Purchase[];
  sales: Sale[];
  orders: Order[];
};

const numberValue = (value: number | string | null | undefined): number => Number(value ?? 0);

const mapIngredient = (row: IngredientRow): Ingredient => ({
  id: row.id,
  name: row.name,
  unit: row.unit,
  costPerUnit: numberValue(row.cost_per_unit),
  stock: numberValue(row.stock),
});

const mapCustomer = (row: CustomerRow): Customer => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  address: row.address ?? '',
});

const mapPurchase = (row: PurchaseRow): Purchase => ({
  id: row.id,
  ingredientId: row.ingredient_id,
  quantity: numberValue(row.quantity),
  totalCost: numberValue(row.total_cost),
  date: row.created_at,
});

const mapSale = (row: SaleRow): Sale => ({
  id: row.id,
  productId: row.product_id,
  paymentMethod: row.payment_method,
  amount: numberValue(row.amount),
  date: row.created_at,
});

const mapOrder = (row: OrderRow): Order => ({
  id: row.id,
  orderNumber: numberValue(row.order_number),
  status: row.status,
  type: row.type,
  customerId: row.customer_id,
  items: (row.order_items ?? []).map((item) => ({
    productId: item.product_id,
    quantity: numberValue(item.quantity),
    unitPrice: numberValue(item.unit_price),
  })),
  total: numberValue(row.total),
  paymentMethod: row.payment_method,
  createdAt: row.created_at,
});

export async function fetchRestaurantData(): Promise<RestaurantData> {
  const db = requireSupabase();

  const [customersResult, ingredientsResult, productsResult, recipesResult, purchasesResult, salesResult, ordersResult] =
    await Promise.all([
      db.from('customers').select('id,name,phone,address').order('name'),
      db.from('ingredients').select('id,name,unit,cost_per_unit,stock').order('name'),
      db.from('products').select('id,name,description,price').order('name'),
      db.from('recipe_items').select('id,product_id,ingredient_id,quantity,waste_percentage'),
      db.from('purchases').select('id,ingredient_id,quantity,total_cost,created_at').order('created_at', { ascending: false }),
      db.from('sales').select('id,product_id,payment_method,amount,created_at').order('created_at', { ascending: false }),
      db
        .from('orders')
        .select('id,order_number,status,type,customer_id,total,payment_method,created_at,order_items(product_id,quantity,unit_price)')
        .order('created_at', { ascending: false }),
    ]);

  const firstError = [
    customersResult.error,
    ingredientsResult.error,
    productsResult.error,
    recipesResult.error,
    purchasesResult.error,
    salesResult.error,
    ordersResult.error,
  ].find(Boolean);

  if (firstError) throw firstError;

  const recipesByProduct = new Map<string, RecipeItem[]>();
  for (const row of (recipesResult.data ?? []) as RecipeItemRow[]) {
    const recipe: RecipeItem = {
      id: row.id,
      ingredientId: row.ingredient_id,
      quantity: numberValue(row.quantity),
      wastePercentage: numberValue(row.waste_percentage),
    };
    recipesByProduct.set(row.product_id, [...(recipesByProduct.get(row.product_id) ?? []), recipe]);
  }

  const products: Product[] = ((productsResult.data ?? []) as ProductRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    price: numberValue(row.price),
    recipe: recipesByProduct.get(row.id) ?? [],
  }));

  return {
    customers: ((customersResult.data ?? []) as CustomerRow[]).map(mapCustomer),
    ingredients: ((ingredientsResult.data ?? []) as IngredientRow[]).map(mapIngredient),
    products,
    purchases: ((purchasesResult.data ?? []) as PurchaseRow[]).map(mapPurchase),
    sales: ((salesResult.data ?? []) as SaleRow[]).map(mapSale),
    orders: ((ordersResult.data ?? []) as unknown as OrderRow[]).map(mapOrder),
  };
}

export async function createCustomer(input: Omit<Customer, 'id'>): Promise<Customer> {
  const { data, error } = await requireSupabase()
    .from('customers')
    .insert({ name: input.name.trim(), phone: input.phone.trim(), address: input.address.trim() || null })
    .select('id,name,phone,address')
    .single();

  if (error) throw error;
  return mapCustomer(data as CustomerRow);
}

export async function createIngredient(input: Omit<Ingredient, 'id'>): Promise<Ingredient> {
  const { data, error } = await requireSupabase()
    .from('ingredients')
    .insert({
      name: input.name.trim(),
      unit: input.unit,
      cost_per_unit: input.costPerUnit,
      stock: input.stock,
    })
    .select('id,name,unit,cost_per_unit,stock')
    .single();

  if (error) throw error;
  return mapIngredient(data as IngredientRow);
}

export async function deleteIngredient(id: string): Promise<void> {
  const { error } = await requireSupabase().from('ingredients').delete().eq('id', id);
  if (error) throw error;
}

export async function saveProductWithRecipe(input: {
  id?: string;
  name: string;
  description: string;
  price: number;
  recipe: RecipeItem[];
}): Promise<void> {
  const db = requireSupabase();
  let productId = input.id;

  if (productId) {
    const { error } = await db
      .from('products')
      .update({ name: input.name.trim(), description: input.description.trim(), price: input.price })
      .eq('id', productId);
    if (error) throw error;
  } else {
    const { data, error } = await db
      .from('products')
      .insert({ name: input.name.trim(), description: input.description.trim(), price: input.price })
      .select('id')
      .single();
    if (error) throw error;
    productId = data.id as string;
  }

  const { error: deleteError } = await db.from('recipe_items').delete().eq('product_id', productId);
  if (deleteError) throw deleteError;

  if (input.recipe.length > 0) {
    const { error: recipeError } = await db.from('recipe_items').insert(
      input.recipe.map((item) => ({
        product_id: productId,
        ingredient_id: item.ingredientId,
        quantity: item.quantity,
        waste_percentage: item.wastePercentage,
      })),
    );
    if (recipeError) throw recipeError;
  }
}

export async function registerPurchase(input: {
  ingredientId: string;
  quantity: number;
  totalCost: number;
}): Promise<void> {
  const { error } = await requireSupabase().rpc('register_purchase', {
    p_ingredient_id: input.ingredientId,
    p_quantity: input.quantity,
    p_total_cost: input.totalCost,
  });
  if (error) throw error;
}

export async function createOrder(input: {
  productId: string;
  customerId: string | null;
  type: OrderType;
  paymentMethod: PaymentMethod;
}): Promise<void> {
  const { error } = await requireSupabase().rpc('create_restaurant_order', {
    p_product_id: input.productId,
    p_customer_id: input.customerId,
    p_order_type: input.type,
    p_payment_method: input.paymentMethod,
    p_quantity: 1,
  });
  if (error) throw error;
}

export async function changeOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const { error } = await requireSupabase()
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) throw error;
}
