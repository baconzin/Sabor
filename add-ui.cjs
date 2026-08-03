const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Add customers functions
const handlers = `
  const handleAddCustomer = () => {
    if (!newCustomerName || !newCustomerPhone) return;
    const customer: Customer = {
      id: Math.random().toString(36).substr(2, 9),
      name: newCustomerName,
      phone: newCustomerPhone,
      address: newCustomerAddress
    };
    setCustomers([...customers, customer]);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewCustomerAddress('');
    alert('Cliente cadastrado!');
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o));
  };
`;

content = content.replace("const handleRegisterPurchase = () => {", handlers + "\n  const handleRegisterPurchase = () => {");

const checkoutReplacement = `
  const handleCheckout = () => {
    if (!selectedProductId) return;
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;
    if (orderType === 'DELIVERY' && !selectedCustomerId) {
      alert('Selecione um cliente para entrega.');
      return;
    }

    setIsSelling(true);

    setTimeout(() => {
      const newIngredients = [...ingredients];
      
      for (const item of product.recipe) {
        const ingIndex = newIngredients.findIndex(i => i.id === item.ingredientId);
        if (ingIndex >= 0) {
          const quantityWithWaste = item.quantity * (1 + item.wastePercentage / 100);
          newIngredients[ingIndex] = {
            ...newIngredients[ingIndex],
            stock: newIngredients[ingIndex].stock - quantityWithWaste
          };
        }
      }

      setIngredients(newIngredients);

      const sale: Sale = {
        id: Math.random().toString(36).substr(2, 9),
        productId: product.id,
        paymentMethod: paymentMethod,
        amount: product.price,
        date: new Date().toISOString()
      };
      
      const newOrder: Order = {
        id: Math.random().toString(36).substr(2, 9),
        orderNumber: orders.length + 1,
        status: 'AGUARDANDO_CONFIRMACAO',
        type: orderType,
        customerId: selectedCustomerId || 'visitante',
        items: [{ productId: product.id, quantity: 1, unitPrice: product.price }],
        total: product.price,
        paymentMethod: paymentMethod,
        createdAt: new Date().toISOString()
      };

      setOrders([...orders, newOrder]);
      setSales([...sales, sale]);
      setSelectedProductId(null);
      setIsSelling(false);
      alert('Pedido realizado e enviado para a cozinha!');
      setActiveTab('kitchen');
    }, 600);
  };
`;
// Replace the old handleCheckout
content = content.replace(/const handleCheckout = \(\) => \{[\s\S]*?alert\('Venda realizada com sucesso e estoque atualizado!'\);\n    \}, 600\); \/\/ simulate network delay\n  \};\n/g, checkoutReplacement);

fs.writeFileSync('src/App.tsx', content);
