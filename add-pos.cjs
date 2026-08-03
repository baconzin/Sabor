const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const posTabReplacement = `
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
                    className={\`flex-1 py-3 rounded-xl font-bold border-2 transition-all \${orderType === 'DELIVERY' ? 'border-lime-500 bg-lime-900/30 text-lime-400' : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'}\`}
                  >
                    Delivery
                  </button>
                  <button 
                    onClick={() => setOrderType('RETIRADA_BALCAO')}
                    className={\`flex-1 py-3 rounded-xl font-bold border-2 transition-all \${orderType === 'RETIRADA_BALCAO' ? 'border-lime-500 bg-lime-900/30 text-lime-400' : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'}\`}
                  >
                    Retirada no Balcão
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {products.map(product => (
                    <div 
                      key={product.id}
                      onClick={() => setSelectedProductId(product.id)}
                      className={\`cursor-pointer rounded-2xl p-5 border-2 transition-all \${selectedProductId === product.id ? 'border-lime-500 bg-lime-900/30 shadow-md' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:shadow-sm'}\`}
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
                                className={\`py-3 px-4 rounded-xl font-semibold text-sm transition-all border-2 \${paymentMethod === method ? 'border-lime-500 bg-lime-900/30 text-lime-400' : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600'}\`}
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
`;

content = content.replace(/\{\s*activeTab === 'pos' && \([\s\S]*?(?=\{\s*activeTab === 'inventory' && \()/m, posTabReplacement);

fs.writeFileSync('src/App.tsx', content);
