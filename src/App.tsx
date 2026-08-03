import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Unit, Ingredient, Product, RecipeItem, Sale, PaymentMethod, Purchase, Customer, Order, OrderStatus, OrderType } from './types';
import { Plus, Trash2, Edit2, Check, X, Utensils, Wheat, TrendingUp, Store, PieChart, Package, AlertTriangle, ArrowUpCircle, Users, ClipboardList, ChefHat, LogOut, Calculator } from 'lucide-react';
import LoginScreen from './components/LoginScreen';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import {
  changeOrderStatus,
  createCustomer,
  createIngredient,
  createOrder,
  deleteIngredient,
  fetchRestaurantData,
  registerPurchase,
  saveProductWithRecipe,
} from './services/restaurantService';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [appError, setAppError] = useState('');
  const [activeTab, setActiveTab] = useState<'ingredients' | 'products' | 'pos' | 'finance' | 'inventory' | 'customers' | 'kitchen'>('pos');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('RETIRADA_BALCAO');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  const [purchaseIngredientId, setPurchaseIngredientId] = useState('');
  const [purchaseQuantity, setPurchaseQuantity] = useState('');
  const [purchaseTotalCost, setPurchaseTotalCost] = useState('');

  const [newIngredientName, setNewIngredientName] = useState('');
  const [newIngredientUnit, setNewIngredientUnit] = useState<Unit>('KG');
  const [newIngredientCost, setNewIngredientCost] = useState('');
  const [newIngredientStock, setNewIngredientStock] = useState('0');

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [isSelling, setIsSelling] = useState(false);

  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);

  const errorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'object' && error && 'message' in error) return String(error.message);
    return fallback;
  };

  const reportError = (error: unknown, fallback: string) => {
    const message = errorMessage(error, fallback);
    setAppError(message);
    window.alert(message);
  };

  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoadingData(true);
    try {
      const data = await fetchRestaurantData();
      setCustomers(data.customers);
      setIngredients(data.ingredients);
      setProducts(data.products);
      setPurchases(data.purchases);
      setSales(data.sales);
      setOrders(data.orders);
      setAppError('');
    } catch (error) {
      setAppError(errorMessage(error, 'Não foi possível carregar os dados do restaurante.'));
    } finally {
      if (showLoading) setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setCheckingSession(false);
      return;
    }

    void client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });

    const { data: authListener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setCheckingSession(false);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client || !session) return;

    void loadData(true);
    let reloadTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleReload = () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => void loadData(false), 250);
    };

    const channel = client
      .channel('sabor-database-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recipe_items' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, scheduleReload)
      .subscribe();

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      void client.removeChannel(channel);
    };
  }, [loadData, session]);

  const handleAddCustomer = async () => {
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) return;
    try {
      const customer = await createCustomer({
        name: newCustomerName,
        phone: newCustomerPhone,
        address: newCustomerAddress,
      });
      setCustomers((current) => [...current, customer].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerAddress('');
      window.alert('Cliente cadastrado!');
    } catch (error) {
      reportError(error, 'Não foi possível cadastrar o cliente.');
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await changeOrderStatus(orderId, status);
      setOrders((current) => current.map((order) => (order.id === orderId ? { ...order, status } : order)));
    } catch (error) {
      reportError(error, 'Não foi possível atualizar o pedido.');
    }
  };

  const handleRegisterPurchase = async () => {
    const quantity = Number(purchaseQuantity);
    const totalCost = Number(purchaseTotalCost);
    if (!purchaseIngredientId || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(totalCost) || totalCost < 0) {
      window.alert('Preencha o ingrediente, a quantidade e o custo corretamente.');
      return;
    }

    try {
      await registerPurchase({ ingredientId: purchaseIngredientId, quantity, totalCost });
      setPurchaseIngredientId('');
      setPurchaseQuantity('');
      setPurchaseTotalCost('');
      await loadData(false);
      window.alert('Compra registrada e estoque atualizado com sucesso!');
    } catch (error) {
      reportError(error, 'Não foi possível registrar a compra.');
    }
  };

  const handleAddIngredient = async () => {
    const costPerUnit = Number(newIngredientCost);
    const stock = Number(newIngredientStock || 0);
    if (!newIngredientName.trim() || !Number.isFinite(costPerUnit) || costPerUnit < 0 || !Number.isFinite(stock) || stock < 0) return;

    try {
      const ingredient = await createIngredient({
        name: newIngredientName,
        unit: newIngredientUnit,
        costPerUnit,
        stock,
      });
      setIngredients((current) => [...current, ingredient].sort((a, b) => a.name.localeCompare(b.name)));
      setNewIngredientName('');
      setNewIngredientCost('');
      setNewIngredientStock('0');
    } catch (error) {
      reportError(error, 'Não foi possível adicionar o ingrediente.');
    }
  };

  const handleDeleteIngredient = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir este ingrediente?')) return;
    try {
      await deleteIngredient(id);
      setIngredients((current) => current.filter((ingredient) => ingredient.id !== id));
    } catch (error) {
      reportError(error, 'Não foi possível excluir. O ingrediente pode estar sendo usado em uma receita.');
    }
  };

  const startNewProduct = () => {
    setEditingProductId('new');
    setNewProductName('');
    setNewProductPrice('');
    setRecipeItems([]);
  };

  const editProduct = (product: Product) => {
    setEditingProductId(product.id);
    setNewProductName(product.name);
    setNewProductPrice(product.price.toString());
    setRecipeItems(product.recipe.map((item) => ({ ...item })));
  };

  const saveProduct = async () => {
    const price = Number(newProductPrice);
    if (!newProductName.trim() || !Number.isFinite(price) || price < 0) return;

    const currentProduct = products.find((product) => product.id === editingProductId);
    try {
      await saveProductWithRecipe({
        id: editingProductId && editingProductId !== 'new' ? editingProductId : undefined,
        name: newProductName,
        description: currentProduct?.description ?? '',
        price,
        recipe: recipeItems,
      });
      setEditingProductId(null);
      await loadData(false);
      window.alert('Prato salvo com sucesso!');
    } catch (error) {
      reportError(error, 'Não foi possível salvar o prato.');
    }
  };

  const addRecipeItem = () => {
    if (ingredients.length === 0) return;
    setRecipeItems((current) => [
      ...current,
      {
        id: `local-${Date.now()}-${current.length}`,
        ingredientId: ingredients[0].id,
        quantity: 0,
        wastePercentage: 20,
      },
    ]);
  };

  const updateRecipeItem = (id: string, field: keyof RecipeItem, value: number | string) => {
    setRecipeItems((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const removeRecipeItem = (id: string) => {
    setRecipeItems((current) => current.filter((item) => item.id !== id));
  };

  const calculateCost = (recipe: RecipeItem[]) => {
    return recipe.reduce((total, item) => {
      const ingredient = ingredients.find((candidate) => candidate.id === item.ingredientId);
      if (!ingredient) return total;
      const quantityWithWaste = item.quantity * (1 + item.wastePercentage / 100);
      return total + quantityWithWaste * ingredient.costPerUnit;
    }, 0);
  };

  const handleCheckout = async () => {
    if (!selectedProductId) return;
    if (orderType === 'DELIVERY' && !selectedCustomerId) {
      window.alert('Selecione um cliente para entrega.');
      return;
    }

    setIsSelling(true);
    try {
      await createOrder({
        productId: selectedProductId,
        customerId: selectedCustomerId,
        type: orderType,
        paymentMethod,
      });
      setSelectedProductId(null);
      await loadData(false);
      window.alert('Pedido realizado e enviado para a cozinha!');
      setActiveTab('kitchen');
    } catch (error) {
      reportError(error, 'Não foi possível concluir o pedido.');
    } finally {
      setIsSelling(false);
    }
  };

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  if (!isSupabaseConfigured) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center p-6">
        <section className="max-w-2xl bg-zinc-900 border border-red-900 rounded-2xl p-8">
          <h1 className="text-2xl font-black text-red-400">Falta configurar o Supabase</h1>
          <p className="text-zinc-300 mt-4">Crie o arquivo <strong>.env.local</strong> na pasta do projeto e informe:</p>
          <pre className="mt-4 p-4 rounded-xl bg-zinc-950 overflow-x-auto text-sm">VITE_SUPABASE_URL=...{`\n`}VITE_SUPABASE_PUBLISHABLE_KEY=...</pre>
        </section>
      </main>
    );
  }

  if (checkingSession) {
    return <main className="min-h-screen bg-zinc-950 text-zinc-300 flex items-center justify-center">Verificando acesso...</main>;
  }

  if (!session) return <LoginScreen />;

  if (loadingData) {
    return <main className="min-h-screen bg-zinc-950 text-zinc-300 flex items-center justify-center">Carregando dados do restaurante...</main>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans">
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-lime-600 rounded-xl flex items-center justify-center text-white shadow-sm">
            <Utensils size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-50">Sistema Culinário</h1>
            <p className="text-sm text-zinc-400 font-medium">Gestão de Ficha Técnica e Custos</p>
          </div>
        </div>
        <div className="flex bg-zinc-800 p-1 rounded-lg flex-wrap gap-1">
          <button 
            onClick={() => setActiveTab('pos')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'pos' ? 'bg-zinc-900 shadow-sm text-lime-400' : 'text-zinc-300 hover:text-zinc-50'}`}
          >
            <Store size={16} /> Novo Pedido
          </button>
          <button 
            onClick={() => setActiveTab('kitchen')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'kitchen' ? 'bg-zinc-900 shadow-sm text-lime-400' : 'text-zinc-300 hover:text-zinc-50'}`}
          >
            <ChefHat size={16} /> Cozinha
          </button>
          <button 
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'customers' ? 'bg-zinc-900 shadow-sm text-lime-400' : 'text-zinc-300 hover:text-zinc-50'}`}
          >
            <Users size={16} /> Clientes
          </button>
          <button 
            onClick={() => setActiveTab('ingredients')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === 'ingredients' ? 'bg-zinc-900 shadow-sm text-lime-400' : 'text-zinc-300 hover:text-zinc-50'}`}
          >
            Ingredientes
          </button>
          <button 
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'products' ? 'bg-zinc-900 shadow-sm text-lime-400' : 'text-zinc-300 hover:text-zinc-50'}`}
          >
            <Utensils size={16} /> Pratos e Receitas
          </button>
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'inventory' ? 'bg-zinc-900 shadow-sm text-lime-400' : 'text-zinc-300 hover:text-zinc-50'}`}
          >
            <Package size={16} /> Estoque
          </button>
          <button 
            onClick={() => setActiveTab('finance')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'finance' ? 'bg-zinc-900 shadow-sm text-lime-400' : 'text-zinc-300 hover:text-zinc-50'}`}
          >
            <PieChart size={16} /> Financeiro
          </button>
        </div>
        <div className="ml-4 flex items-center gap-3 shrink-0">
          <span className="hidden xl:block text-xs text-zinc-500 max-w-40 truncate">{session.user.email}</span>
          <button
            onClick={handleLogout}
            className="h-10 px-3 rounded-lg border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center gap-2 text-sm font-semibold"
            title="Sair"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 md:p-8">
        {appError && (
          <div className="mb-6 rounded-xl border border-red-800 bg-red-950/40 px-4 py-3 text-red-300 flex items-start justify-between gap-4">
            <span>{appError}</span>
            <button onClick={() => setAppError('')} className="font-bold">Fechar</button>
          </div>
        )}
        
        {activeTab === 'ingredients' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-2xl font-bold text-zinc-100">Cadastro de Ingredientes</h2>
                <p className="text-zinc-400 mt-1">Gerencie a matéria-prima e custos base.</p>
              </div>
            </div>

            <div className="bg-zinc-900 rounded-2xl shadow-sm border border-zinc-800 overflow-hidden mb-8">
              <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wider">Nome do Ingrediente</label>
                  <input 
                    type="text" 
                    value={newIngredientName}
                    onChange={e => setNewIngredientName(e.target.value)}
                    placeholder="Ex: Cebola Roxa"
                    className="w-full h-11 px-3 rounded-lg border border-zinc-700 focus:ring-2 focus:ring-lime-500 focus:border-lime-500 outline-none transition-all"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wider">Unidade</label>
                  <select 
                    value={newIngredientUnit}
                    onChange={e => setNewIngredientUnit(e.target.value as Unit)}
                    className="w-full h-11 px-3 rounded-lg border border-zinc-700 focus:ring-2 focus:ring-lime-500 outline-none bg-zinc-900"
                  >
                    <option value="KG">KG</option>
                    <option value="G">Grama (g)</option>
                    <option value="L">Litro (L)</option>
                    <option value="ML">Mililitro (ml)</option>
                    <option value="UN">Unidade</option>
                  </select>
                </div>
                <div className="w-40">
                  <label className="block text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wider">Custo ({newIngredientUnit})</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">R$</span>
                    <input 
                      type="number" 
                      value={newIngredientCost}
                      onChange={e => setNewIngredientCost(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      className="w-full h-11 pl-9 pr-3 rounded-lg border border-zinc-700 focus:ring-2 focus:ring-lime-500 outline-none"
                    />
                  </div>
                </div>
                <div className="w-32">
                  <label className="block text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wider">Estoque</label>
                  <input 
                    type="number" 
                    value={newIngredientStock}
                    onChange={e => setNewIngredientStock(e.target.value)}
                    placeholder="0"
                    step="0.1"
                    className="w-full h-11 px-3 rounded-lg border border-zinc-700 focus:ring-2 focus:ring-lime-500 outline-none"
                  />
                </div>
                <button 
                  onClick={handleAddIngredient}
                  disabled={!newIngredientName || !newIngredientCost}
                  className="h-11 px-6 bg-lime-600 hover:bg-lime-700 text-white rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50 transition-colors"
                >
                  <Plus size={18} /> Adicionar
                </button>
              </div>
              
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 text-sm">
                    <th className="py-4 px-6 font-medium">Ingrediente</th>
                    <th className="py-4 px-6 font-medium">Unidade de Medida</th>
                    <th className="py-4 px-6 font-medium">Custo Base</th>
                    <th className="py-4 px-6 font-medium">Estoque</th>
                    <th className="py-4 px-6 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {ingredients.map(ing => (
                    <tr key={ing.id} className="hover:bg-zinc-950 transition-colors">
                      <td className="py-4 px-6 font-medium text-zinc-100 flex items-center gap-3">
                        <Wheat size={16} className="text-zinc-500" />
                        {ing.name}
                      </td>
                      <td className="py-4 px-6 text-zinc-300">
                        <span className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs font-bold rounded-md">
                          1 {ing.unit}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-medium text-zinc-100">
                        R$ {ing.costPerUnit.toFixed(2)}
                      </td>
                      <td className="py-4 px-6 font-medium text-zinc-100">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${ing.stock < 1 ? 'bg-red-900/40 text-red-400' : 'bg-lime-900/40 text-lime-400'}`}>
                          {ing.stock.toFixed(2)} {ing.unit}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button onClick={() => handleDeleteIngredient(ing.id)} className="text-zinc-500 hover:text-red-500 p-2 rounded-md hover:bg-red-900/30 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {ingredients.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-zinc-400">Nenhum ingrediente cadastrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {editingProductId ? (
              <div className="bg-zinc-900 rounded-2xl shadow-sm border border-zinc-800 overflow-hidden">
                <div className="px-6 py-5 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-zinc-100">
                    {editingProductId === 'new' ? 'Novo Prato (Ficha Técnica)' : 'Editar Prato'}
                  </h2>
                  <button onClick={() => setEditingProductId(null)} className="text-zinc-400 hover:text-zinc-100 p-2">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="p-6 border-b border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Nome do Prato / Marmita</label>
                    <input 
                      type="text" 
                      value={newProductName}
                      onChange={e => setNewProductName(e.target.value)}
                      placeholder="Ex: Marmita de Frango Grelhado"
                      className="w-full h-12 px-4 rounded-xl border border-zinc-700 focus:ring-2 focus:ring-lime-500 outline-none text-lg font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Preço de Venda (R$)</label>
                    <input 
                      type="number" 
                      value={newProductPrice}
                      onChange={e => setNewProductPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-12 px-4 rounded-xl border border-zinc-700 focus:ring-2 focus:ring-lime-500 outline-none text-lg font-medium"
                    />
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-100">Ingredientes & Waste (Quebra)</h3>
                      <p className="text-sm text-zinc-400">Adicione os ingredientes, a quantidade líquida e a % de perda (waste) que ocorre no preparo.</p>
                    </div>
                    <button 
                      onClick={addRecipeItem}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg font-semibold flex items-center gap-2 transition-colors text-sm"
                    >
                      <Plus size={16} /> Adicionar Ingrediente
                    </button>
                  </div>

                  <div className="space-y-3">
                    {recipeItems.map((item, index) => {
                      const ing = ingredients.find(i => i.id === item.ingredientId);
                      return (
                        <div key={item.id} className="flex gap-4 items-center bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-400 font-bold text-xs shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <select 
                              value={item.ingredientId}
                              onChange={e => updateRecipeItem(item.id, 'ingredientId', e.target.value)}
                              className="w-full h-10 px-3 rounded-lg border border-zinc-700 focus:ring-2 focus:ring-lime-500 outline-none bg-zinc-900 font-medium"
                            >
                              {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                            </select>
                          </div>
                          <div className="w-32">
                            <div className="relative">
                              <input 
                                type="number" 
                                value={item.quantity}
                                onChange={e => updateRecipeItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                placeholder="Qtd"
                                step="0.001"
                                className="w-full h-10 pl-3 pr-10 rounded-lg border border-zinc-700 focus:ring-2 focus:ring-lime-500 outline-none"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold">{ing?.unit}</span>
                            </div>
                          </div>
                          <div className="w-40 flex items-center gap-2">
                            <div className="relative flex-1">
                              <input 
                                type="number" 
                                value={item.wastePercentage}
                                onChange={e => updateRecipeItem(item.id, 'wastePercentage', parseFloat(e.target.value) || 0)}
                                placeholder="Waste"
                                className="w-full h-10 pl-3 pr-8 rounded-lg border border-lime-300 bg-lime-900/40 focus:ring-2 focus:ring-lime-500 outline-none text-lime-900 font-semibold"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lime-500 text-xs font-bold">%</span>
                            </div>
                            <span className="text-xs font-semibold text-zinc-500">WASTE</span>
                          </div>
                          <div className="w-24 text-right font-medium text-zinc-200">
                            R$ {ing ? ((item.quantity * (1 + item.wastePercentage/100)) * ing.costPerUnit).toFixed(2) : '0.00'}
                          </div>
                          <button onClick={() => removeRecipeItem(item.id)} className="text-zinc-500 hover:text-red-500 p-2 rounded-md hover:bg-red-900/30 transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      );
                    })}
                    {recipeItems.length === 0 && (
                      <div className="py-8 text-center border-2 border-dashed border-zinc-800 rounded-xl">
                        <p className="text-zinc-400">Nenhum ingrediente adicionado à receita.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-6 py-5 bg-zinc-900 text-white flex items-center justify-between">
                  <div className="flex gap-8">
                    <div>
                      <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Custo Total de Produção</p>
                      <p className="text-2xl font-black text-white">R$ {calculateCost(recipeItems).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Lucro Estimado</p>
                      <p className="text-2xl font-black text-lime-400">
                        {newProductPrice ? `R$ ${(parseFloat(newProductPrice) - calculateCost(recipeItems)).toFixed(2)}` : '---'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={saveProduct}
                    disabled={!newProductName || !newProductPrice}
                    className="h-12 px-8 bg-lime-900/400 hover:bg-lime-400 text-zinc-50 rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Check size={20} /> Salvar Prato
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-zinc-100">Pratos Cadastrados</h2>
                    <p className="text-zinc-400 mt-1">Visualize suas marmitas e o custo de produção calculado (incluindo waste).</p>
                  </div>
                  <button 
                    onClick={startNewProduct}
                    className="h-11 px-6 bg-lime-500 hover:bg-lime-600 text-zinc-950 rounded-lg font-semibold flex items-center gap-2 transition-colors"
                  >
                    <Plus size={18} /> Novo Prato
                  </button>
                </div>

                <div className="mb-8 bg-zinc-900 rounded-2xl shadow-sm border border-zinc-800 overflow-hidden">
                  <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                      <TrendingUp size={20} className="text-lime-500" />
                      Dashboard de Precificação e Custos
                    </h3>
                  </div>
                  <div className="p-0 overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wider">
                          <th className="py-3 px-6 font-semibold">Prato</th>
                          <th className="py-3 px-6 font-semibold text-right">Custo Base</th>
                          <th className="py-3 px-6 font-semibold text-right text-lime-500">Impacto Waste</th>
                          <th className="py-3 px-6 font-semibold text-right">Custo Total</th>
                          <th className="py-3 px-6 font-semibold text-right">Preço Venda</th>
                          <th className="py-3 px-6 font-semibold text-right text-lime-500">Lucro (R$)</th>
                          <th className="py-3 px-6 font-semibold text-right text-lime-500">Margem (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {products.map(product => {
                          const baseCost = product.recipe.reduce((total, item) => {
                            const ing = ingredients.find(i => i.id === item.ingredientId);
                            return total + (ing ? item.quantity * ing.costPerUnit : 0);
                          }, 0);
                          const wasteCost = product.recipe.reduce((total, item) => {
                            const ing = ingredients.find(i => i.id === item.ingredientId);
                            return total + (ing ? item.quantity * (item.wastePercentage / 100) * ing.costPerUnit : 0);
                          }, 0);
                          const totalCost = baseCost + wasteCost;
                          const profit = product.price - totalCost;
                          const margin = product.price > 0 ? (profit / product.price) * 100 : 0;

                          return (
                            <tr key={product.id} className="hover:bg-zinc-950 transition-colors">
                              <td className="py-4 px-6 font-semibold text-zinc-100">{product.name}</td>
                              <td className="py-4 px-6 text-right text-zinc-300">R$ {baseCost.toFixed(2)}</td>
                              <td className="py-4 px-6 text-right text-lime-500 font-medium">+ R$ {wasteCost.toFixed(2)}</td>
                              <td className="py-4 px-6 text-right font-bold text-zinc-50">R$ {totalCost.toFixed(2)}</td>
                              <td className="py-4 px-6 text-right font-bold text-zinc-50">R$ {product.price.toFixed(2)}</td>
                              <td className="py-4 px-6 text-right font-bold text-lime-500">R$ {profit.toFixed(2)}</td>
                              <td className="py-4 px-6 text-right font-bold text-lime-500">{margin.toFixed(1)}%</td>
                            </tr>
                          );
                        })}
                        {products.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-zinc-400">Nenhum prato cadastrado para exibir no dashboard.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {products.map(product => {
                    const cost = calculateCost(product.recipe);
                    const profit = product.price - cost;
                    const margin = (profit / product.price) * 100;

                    return (
                      <div key={product.id} className="bg-zinc-900 rounded-2xl shadow-sm border border-zinc-800 p-6 flex flex-col transition-all hover:shadow-md">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-bold text-zinc-50">{product.name}</h3>
                            <p className="text-zinc-400 text-sm mt-1">{product.description}</p>
                          </div>
                          <button onClick={() => editProduct(product)} className="text-zinc-500 hover:text-lime-500 bg-zinc-950 p-2 rounded-lg transition-colors">
                            <Edit2 size={18} />
                          </button>
                        </div>
                        
                        <div className="bg-zinc-950 rounded-xl p-4 mb-6 mt-2 border border-zinc-800 flex-1">
                          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Calculator size={14} /> Ficha Técnica
                          </h4>
                          <div className="space-y-2">
                            {product.recipe.map(item => {
                              const ing = ingredients.find(i => i.id === item.ingredientId);
                              return (
                                <div key={item.id} className="flex justify-between text-sm">
                                  <span className="font-medium text-zinc-200">{ing?.name}</span>
                                  <div className="text-zinc-400 flex gap-4 text-right">
                                    <span className="w-20">{item.quantity} {ing?.unit}</span>
                                    <span className="w-16 text-lime-500 bg-lime-900/40 px-1 rounded font-semibold text-xs py-0.5">{item.wastePercentage}% waste</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex justify-between items-end border-t border-zinc-800 pt-4">
                          <div>
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Custo / Lucro</p>
                            <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-lg font-bold text-zinc-100">R$ {cost.toFixed(2)}</span>
                              <span className="text-sm font-semibold text-lime-500">+{margin.toFixed(0)}%</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Preço de Venda</p>
                            <p className="text-2xl font-black text-zinc-50 mt-1">R$ {product.price.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        
        {activeTab === 'pos' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-2xl font-bold text-zinc-100">Atendimento (Novo Pedido)</h2>
                <p className="text-zinc-400 mt-1">Selecione o cliente, tipo de pedido, prato e pagamento.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <h3 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
                  <Utensils size={20} className="text-lime-500" /> Cardápio (Marmitas M)
                </h3>
                
                <div className="flex gap-4 mb-6">
                  <button 
                    onClick={() => setOrderType('DELIVERY')}
                    className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${orderType === 'DELIVERY' ? 'border-lime-500 bg-lime-900/30 text-lime-400' : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'}`}
                  >
                    Delivery
                  </button>
                  <button 
                    onClick={() => setOrderType('RETIRADA_BALCAO')}
                    className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${orderType === 'RETIRADA_BALCAO' ? 'border-lime-500 bg-lime-900/30 text-lime-400' : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'}`}
                  >
                    Retirada no Balcão
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {products.map(product => (
                    <div 
                      key={product.id}
                      onClick={() => setSelectedProductId(product.id)}
                      className={`cursor-pointer rounded-2xl p-5 border-2 transition-all ${selectedProductId === product.id ? 'border-lime-500 bg-lime-900/30 shadow-md' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:shadow-sm'}`}
                    >
                      <h4 className="font-bold text-zinc-100 text-lg mb-1">{product.name}</h4>
                      <p className="text-zinc-500 text-sm mb-3 line-clamp-2">{product.description}</p>
                      <p className="text-xl font-black text-lime-400">R$ {product.price.toFixed(2)}</p>
                    </div>
                  ))}
                  {products.length === 0 && (
                    <div className="col-span-full py-8 text-center text-zinc-500 bg-zinc-900 rounded-2xl border border-zinc-800">
                      Nenhum prato cadastrado. Vá em "Pratos e Receitas" para adicionar.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="bg-zinc-900 rounded-2xl shadow-sm border border-zinc-800 overflow-hidden sticky top-24">
                  <div className="p-6 border-b border-zinc-800 bg-zinc-950">
                    <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                      <ClipboardList size={20} className="text-lime-500" /> Detalhes do Pedido
                    </h3>
                  </div>
                  
                  <div className="p-6">
                    {orderType === 'DELIVERY' && (
                      <div className="mb-6">
                        <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Cliente (Delivery)</label>
                        <select 
                          value={selectedCustomerId || ''}
                          onChange={e => setSelectedCustomerId(e.target.value)}
                          className="w-full h-11 px-3 rounded-lg border border-zinc-700 focus:ring-2 focus:ring-lime-500 outline-none bg-zinc-800 text-zinc-100"
                        >
                          <option value="">Selecione um cliente...</option>
                          {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                        </select>
                        {customers.length === 0 && <p className="text-xs text-red-400 mt-2">Cadastre clientes na aba Clientes.</p>}
                      </div>
                    )}

                    {selectedProductId ? (
                      <>
                        <div className="mb-6">
                          <p className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-2">Resumo</p>
                          <div className="flex justify-between items-center text-lg font-bold text-zinc-100">
                            <span>{products.find(p => p.id === selectedProductId)?.name}</span>
                            <span>R$ {products.find(p => p.id === selectedProductId)?.price.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="mb-8">
                          <p className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">Método de Pagamento</p>
                          <div className="grid grid-cols-2 gap-3">
                            {(['PIX', 'CREDITO', 'DEBITO', 'DINHEIRO'] as PaymentMethod[]).map(method => (
                              <button
                                key={method}
                                onClick={() => setPaymentMethod(method)}
                                className={`py-3 px-4 rounded-xl font-semibold text-sm transition-all border-2 ${paymentMethod === method ? 'border-lime-500 bg-lime-900/30 text-lime-400' : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600'}`}
                              >
                                {method}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={handleCheckout}
                          disabled={isSelling || (orderType === 'DELIVERY' && !selectedCustomerId)}
                          className="w-full h-14 bg-lime-600 hover:bg-lime-500 text-zinc-950 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                          {isSelling ? (
                            <span>Processando...</span>
                          ) : (
                            <>
                              <Check size={24} /> Confirmar Pedido
                            </>
                          )}
                        </button>
                      </>
                    ) : (
                      <div className="text-center py-10 text-zinc-600">
                        <Utensils size={48} className="mx-auto mb-4 opacity-20" />
                        <p>Selecione uma marmita ao lado para continuar.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
{activeTab === 'inventory' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-2xl font-bold text-zinc-100">Controle de Estoque</h2>
                <p className="text-zinc-400 mt-1">Registre compras e acompanhe os níveis de estoque.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <div className="lg:col-span-1">
                <div className="bg-zinc-900 rounded-2xl shadow-sm border border-zinc-800 p-6 sticky top-24">
                  <h3 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
                    <ArrowUpCircle size={20} className="text-lime-500" /> Registrar Compra
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wider">Ingrediente</label>
                      <select 
                        value={purchaseIngredientId}
                        onChange={e => setPurchaseIngredientId(e.target.value)}
                        className="w-full h-11 px-3 rounded-lg border border-zinc-700 focus:ring-2 focus:ring-lime-500 outline-none bg-zinc-900"
                      >
                        <option value="">Selecione...</option>
                        {ingredients.map(ing => (
                          <option key={ing.id} value={ing.id}>{ing.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wider">
                        Quantidade Comprada {purchaseIngredientId ? `(${ingredients.find(i => i.id === purchaseIngredientId)?.unit})` : ''}
                      </label>
                      <input 
                        type="number"
                        value={purchaseQuantity}
                        onChange={e => setPurchaseQuantity(e.target.value)}
                        step="0.1"
                        placeholder="Ex: 5"
                        className="w-full h-11 px-3 rounded-lg border border-zinc-700 focus:ring-2 focus:ring-lime-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wider">Custo Total (R$)</label>
                      <input 
                        type="number"
                        value={purchaseTotalCost}
                        onChange={e => setPurchaseTotalCost(e.target.value)}
                        step="0.01"
                        placeholder="Ex: 50.00"
                        className="w-full h-11 px-3 rounded-lg border border-zinc-700 focus:ring-2 focus:ring-lime-500 outline-none"
                      />
                    </div>
                    <button
                      onClick={handleRegisterPurchase}
                      disabled={!purchaseIngredientId || !purchaseQuantity || !purchaseTotalCost}
                      className="w-full h-11 bg-lime-600 hover:bg-lime-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
                    >
                      <Check size={18} /> Confirmar Compra
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="bg-zinc-900 rounded-2xl shadow-sm border border-zinc-800 overflow-hidden">
                  <div className="p-6 border-b border-zinc-800 bg-zinc-950 flex items-center gap-2">
                     <AlertTriangle size={20} className="text-lime-500" />
                     <h3 className="text-lg font-bold text-zinc-100">Status do Estoque</h3>
                  </div>
                  <div className="p-0 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wider">
                          <th className="py-3 px-6 font-semibold">Ingrediente</th>
                          <th className="py-3 px-6 font-semibold">Estoque Atual</th>
                          <th className="py-3 px-6 font-semibold text-right">Custo Médio/Un</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {ingredients.sort((a, b) => a.stock - b.stock).map(ing => (
                          <tr key={ing.id} className="hover:bg-zinc-950 transition-colors">
                            <td className="py-4 px-6 font-medium text-zinc-100">
                              {ing.name}
                            </td>
                            <td className="py-4 px-6">
                              <span className={`px-2 py-1 rounded-md text-xs font-bold ${ing.stock < 2 ? 'bg-red-900/40 text-red-400' : 'bg-lime-900/40 text-lime-400'}`}>
                                {ing.stock.toFixed(2)} {ing.unit}
                              </span>
                              {ing.stock < 2 && <span className="ml-2 text-xs text-red-500 font-semibold">Baixo!</span>}
                            </td>
                            <td className="py-4 px-6 text-right font-medium text-zinc-300">
                              R$ {ing.costPerUnit.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'finance' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-2xl font-bold text-zinc-100">Financeiro</h2>
                <p className="text-zinc-400 mt-1">Acompanhe lucros, receitas e despesas.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-800">
                <p className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">Receita Total</p>
                <p className="text-3xl font-black text-lime-500">
                  R$ {sales.reduce((sum, s) => sum + s.amount, 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-800">
                <p className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">Despesas (Compras)</p>
                <p className="text-3xl font-black text-red-500">
                  R$ {purchases.reduce((sum, p) => sum + p.totalCost, 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-800">
                <p className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">Saldo / Lucro</p>
                <p className={`text-3xl font-black ${sales.reduce((sum, s) => sum + s.amount, 0) - purchases.reduce((sum, p) => sum + p.totalCost, 0) >= 0 ? 'text-lime-500' : 'text-red-500'}`}>
                  R$ {(sales.reduce((sum, s) => sum + s.amount, 0) - purchases.reduce((sum, p) => sum + p.totalCost, 0)).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="bg-zinc-900 rounded-2xl shadow-sm border border-zinc-800 overflow-hidden">
              <div className="p-6 border-b border-zinc-800 bg-zinc-950">
                <h3 className="text-lg font-bold text-zinc-100">Desempenho por Prato (Vendas)</h3>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wider">
                      <th className="py-3 px-6 font-semibold">Prato</th>
                      <th className="py-3 px-6 font-semibold text-right">Qtd Vendida</th>
                      <th className="py-3 px-6 font-semibold text-right">Receita (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {products.map(product => {
                      const productSales = sales.filter(s => s.productId === product.id);
                      const qty = productSales.length;
                      const revenue = productSales.reduce((sum, s) => sum + s.amount, 0);
                      return (
                        <tr key={product.id} className="hover:bg-zinc-950 transition-colors">
                          <td className="py-4 px-6 font-medium text-zinc-100">{product.name}</td>
                          <td className="py-4 px-6 text-right text-zinc-300">{qty}</td>
                          <td className="py-4 px-6 text-right font-bold text-lime-500">R$ {revenue.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      
        {activeTab === 'customers' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-2xl font-bold text-zinc-100">Clientes</h2>
                <p className="text-zinc-400 mt-1">Gerencie os clientes cadastrados.</p>
              </div>
            </div>

            <div className="bg-zinc-900 rounded-2xl shadow-sm border border-zinc-800 p-6 mb-8">
              <h3 className="text-lg font-bold text-zinc-100 mb-4">Novo Cliente</h3>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wider">Nome</label>
                  <input 
                    value={newCustomerName}
                    onChange={e => setNewCustomerName(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-zinc-700 bg-zinc-950 focus:ring-2 focus:ring-lime-500 outline-none text-zinc-100"
                    placeholder="Nome do cliente"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wider">Telefone / WhatsApp</label>
                  <input 
                    value={newCustomerPhone}
                    onChange={e => setNewCustomerPhone(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-zinc-700 bg-zinc-950 focus:ring-2 focus:ring-lime-500 outline-none text-zinc-100"
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wider">Endereço de Entrega</label>
                  <input 
                    value={newCustomerAddress}
                    onChange={e => setNewCustomerAddress(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-zinc-700 bg-zinc-950 focus:ring-2 focus:ring-lime-500 outline-none text-zinc-100"
                    placeholder="Rua, Número, Bairro"
                  />
                </div>
                <button 
                  onClick={handleAddCustomer}
                  className="h-11 px-6 bg-lime-600 hover:bg-lime-500 text-zinc-950 rounded-lg font-bold transition-colors"
                >
                  Cadastrar
                </button>
              </div>
            </div>

            <div className="bg-zinc-900 rounded-2xl shadow-sm border border-zinc-800 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 text-sm">
                    <th className="py-4 px-6 font-medium">Nome</th>
                    <th className="py-4 px-6 font-medium">Telefone</th>
                    <th className="py-4 px-6 font-medium">Endereço</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {customers.map(c => (
                    <tr key={c.id} className="hover:bg-zinc-800/50 transition-colors">
                      <td className="py-4 px-6 font-medium text-zinc-100">{c.name}</td>
                      <td className="py-4 px-6 text-zinc-300">{c.phone}</td>
                      <td className="py-4 px-6 text-zinc-300">{c.address || '-'}</td>
                    </tr>
                  ))}
                  {customers.length === 0 && (
                    <tr><td colSpan={3} className="py-8 text-center text-zinc-500">Nenhum cliente cadastrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'kitchen' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-2xl font-bold text-zinc-100">Cozinha (Kanban)</h2>
                <p className="text-zinc-400 mt-1">Acompanhe os pedidos recebidos e atualize o status.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[70vh]">
              {['AGUARDANDO_CONFIRMACAO', 'EM_PREPARACAO', 'PRONTO'].map(status => {
                const columnOrders = orders.filter(o => o.status === status);
                
                const titles: any = {
                  AGUARDANDO_CONFIRMACAO: { label: 'CONFIRMADOS', color: 'bg-zinc-800' },
                  EM_PREPARACAO: { label: 'EM PREPARAÇÃO', color: 'bg-blue-900/40 border-blue-500 text-blue-400' },
                  PRONTO: { label: 'PRONTOS', color: 'bg-lime-900/40 border-lime-500 text-lime-400' }
                };

                return (
                  <div key={status} className="flex flex-col gap-4 bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                    <h3 className={`font-black text-sm p-3 rounded-lg border ${titles[status].color}`}>
                      {titles[status].label} ({columnOrders.length})
                    </h3>
                    
                    <div className="flex-1 overflow-y-auto space-y-4">
                      {columnOrders.map(order => (
                        <div key={order.id} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 shadow-sm">
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-xl font-black text-zinc-100">#{order.orderNumber}</span>
                            <span className="text-xs font-bold px-2 py-1 bg-zinc-800 text-zinc-300 rounded">
                              {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          
                          <div className="text-sm font-bold text-zinc-300 mb-2">
                            {order.type === 'DELIVERY' ? '🚚 Delivery' : '🏪 Retirada'}
                          </div>
                          <div className="text-xs text-zinc-400 mb-4">
                            Cliente: {customers.find(c => c.id === order.customerId)?.name || 'Visitante'}
                          </div>

                          <div className="space-y-2 mb-4">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="bg-zinc-900 p-2 rounded border border-zinc-800 font-bold text-zinc-100 text-sm">
                                {item.quantity}x {products.find(p => p.id === item.productId)?.name}
                              </div>
                            ))}
                          </div>

                          {status === 'AGUARDANDO_CONFIRMACAO' && (
                            <button 
                              onClick={() => updateOrderStatus(order.id, 'EM_PREPARACAO')}
                              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm"
                            >
                              Iniciar Preparo
                            </button>
                          )}
                          {status === 'EM_PREPARACAO' && (
                            <button 
                              onClick={() => updateOrderStatus(order.id, 'PRONTO')}
                              className="w-full py-2 bg-lime-600 hover:bg-lime-500 text-zinc-950 rounded-lg font-bold text-sm"
                            >
                              Marcar como Pronto
                            </button>
                          )}
                          {status === 'PRONTO' && (
                            <button 
                              onClick={() => updateOrderStatus(order.id, 'ENTREGUE')}
                              className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-bold text-sm"
                            >
                              Concluir / Entregar
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
