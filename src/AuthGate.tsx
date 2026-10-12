
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { LockKeyhole, Zap } from 'lucide-react';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import App from './App';

export default function AuthGate() {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            return;
        }

        let active = true;

        supabase.auth.getSession().then(({ data, error }) => {
            if (!active) return;

            if (error) setError(error.message);
            setSession(data.session);
            setLoading(false);
        });

        const { data } = supabase.auth.onAuthStateChange(
            (_event, newSession) => {
                if (active) setSession(newSession);
            }
        );

        return () => {
            active = false;
            data.subscription.unsubscribe();
        };
    }, []);

    async function handleLogin(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!supabase) {
            setError('Supabase não está configurado. Confira o .env.local.');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (error) setError(error.message);
        } catch {
            setError('Não foi possível conectar. Verifique sua internet.');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleLogout() {
        if (!supabase) return;

        const { error } = await supabase.auth.signOut();

        if (error) setError(error.message);
    }

    if (loading) {
        return <div className="auth-loading">Carregando OS Stock...</div>;
    }

    if (!isSupabaseConfigured || !supabase) {
        return (
            <div className="auth-screen">
                <section className="auth-card">
                    <Zap size={34} />
                    <h1>OS Stock</h1>
                    <p>O Supabase não está configurado.</p>
                    <p>Confira as variáveis VITE_SUPABASE_URL e
                        VITE_SUPABASE_PUBLISHABLE_KEY no .env.local.</p>
                </section>
            </div>
        );
    }

    if (session) {
        return (
            <App
                userEmail={session.user.email ?? 'Usuário'}
                userId={session.user.id}
                onLogout={() => void handleLogout()}
            />
        );
    }

    return (
        <div className="auth-screen">
            <form className="auth-card" onSubmit={handleLogin}>
                <div className="auth-logo"><Zap size={28} /></div>
                <p className="eyebrow">ASSISTÊNCIA TÉCNICA</p>
                <h1>OS Stock</h1>
                <p className="auth-description">
                    Entre para gerenciar ordens de serviço e estoque.
                </p>

                <label htmlFor="login-email">E-mail</label>
                <input
                    id="login-email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    placeholder="seu@email.com"
                />

                <label htmlFor="login-password">Senha</label>
                <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    placeholder="Sua senha"
                />

                {error && <p className="auth-error">{error}</p>}

                <button className="auth-submit" type="submit" disabled={submitting}>
                    <LockKeyhole size={17} />
                    {submitting ? 'Entrando...' : 'Entrar'}
                </button>

                <p className="auth-footer">
                    Acesso restrito aos usuários autorizados.
                </p>
            </form>
        </div>
    );
}