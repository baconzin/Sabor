import { useState, type FormEvent } from 'react';
import { ChefHat, LogIn } from 'lucide-react';
import { requireSupabase } from '../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: signInError } = await requireSupabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) throw signInError;
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Não foi possível entrar.';
      setError(message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center p-6">
      <section className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">
        <div className="w-14 h-14 bg-lime-600 rounded-2xl flex items-center justify-center mb-6">
          <ChefHat size={28} />
        </div>
        <h1 className="text-2xl font-black">Sistema Sabor</h1>
        <p className="text-zinc-400 mt-2 mb-8">Entre com o usuário criado no Supabase.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">E-mail</label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-zinc-950 border border-zinc-700 focus:ring-2 focus:ring-lime-500 outline-none"
              placeholder="seuemail@exemplo.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Senha</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-zinc-950 border border-zinc-700 focus:ring-2 focus:ring-lime-500 outline-none"
              placeholder="Sua senha"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-lime-600 hover:bg-lime-500 text-zinc-950 font-black flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LogIn size={20} /> {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  );
}
