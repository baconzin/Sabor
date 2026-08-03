const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Imports
content = content.replace(
  "import { Unit, Ingredient, Product, RecipeItem, Sale, PaymentMethod, Purchase } from './types';",
  "import { Unit, Ingredient, Product, RecipeItem, Sale, PaymentMethod, Purchase, Customer, Order, OrderItem, OrderStatus, OrderType } from './types';"
);
content = content.replace(
  "import { Plus, Trash2, Edit2, Check, X, Utensils, Wheat, DollarSign, Calculator, TrendingUp, Store, PieChart, Package, AlertTriangle, ArrowUpCircle } from 'lucide-react';",
  "import { Plus, Trash2, Edit2, Check, X, Utensils, Wheat, DollarSign, Calculator, TrendingUp, Store, PieChart, Package, AlertTriangle, ArrowUpCircle, Users, ClipboardList, ChefHat } from 'lucide-react';"
);

// State
content = content.replace(
  "const [activeTab, setActiveTab] = useState<'ingredients' | 'products' | 'pos' | 'finance' | 'inventory'>('pos');",
  "const [activeTab, setActiveTab] = useState<'ingredients' | 'products' | 'pos' | 'finance' | 'inventory' | 'customers' | 'kitchen'>('pos');\n  const [customers, setCustomers] = useState<Customer[]>([]);\n  const [orders, setOrders] = useState<Order[]>([]);\n  const [orderType, setOrderType] = useState<OrderType>('RETIRADA_BALCAO');\n  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);\n  const [newCustomerName, setNewCustomerName] = useState('');\n  const [newCustomerPhone, setNewCustomerPhone] = useState('');\n  const [newCustomerAddress, setNewCustomerAddress] = useState('');"
);

// Add Tab Buttons
const tabsSearch = `<div className="flex bg-zinc-800 p-1 rounded-lg">`;
const newTabs = `<div className="flex bg-zinc-800 p-1 rounded-lg flex-wrap gap-1">
          <button 
            onClick={() => setActiveTab('pos')}
            className={\`px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 \${activeTab === 'pos' ? 'bg-zinc-900 shadow-sm text-lime-400' : 'text-zinc-300 hover:text-zinc-50'}\`}
          >
            <Store size={16} /> Novo Pedido
          </button>
          <button 
            onClick={() => setActiveTab('kitchen')}
            className={\`px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 \${activeTab === 'kitchen' ? 'bg-zinc-900 shadow-sm text-lime-400' : 'text-zinc-300 hover:text-zinc-50'}\`}
          >
            <ChefHat size={16} /> Cozinha
          </button>
          <button 
            onClick={() => setActiveTab('customers')}
            className={\`px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 \${activeTab === 'customers' ? 'bg-zinc-900 shadow-sm text-lime-400' : 'text-zinc-300 hover:text-zinc-50'}\`}
          >
            <Users size={16} /> Clientes
          </button>`;
content = content.replace(tabsSearch + `\n          <button \n            onClick={() => setActiveTab('pos')}\n            className={\`px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 \${activeTab === 'pos' ? 'bg-zinc-900 shadow-sm text-lime-400' : 'text-zinc-300 hover:text-zinc-50'}\`}\n          >\n            <Store size={16} /> Caixa\n          </button>`, newTabs);

fs.writeFileSync('src/App.tsx', content);
