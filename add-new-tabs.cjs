const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const newTabs = `
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
                    <h3 className={\`font-black text-sm p-3 rounded-lg border \${titles[status].color}\`}>
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
`;

content = content.replace("</main>", newTabs + "\n      </main>");
fs.writeFileSync('src/App.tsx', content);
