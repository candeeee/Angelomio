"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Profile, Role } from "@/lib/types";

// ─────────────────────────────────────────────────────────────
// Fuente de verdad ÚNICA para autenticación y autorización.
// Ningún componente debe guardar su propio estado local de "soy admin"
// o duplicar esta lógica: siempre se consulta este contexto vía useAuth().
//
// role SIEMPRE sale de la tabla `profiles` en Supabase — nunca hardcodeado.
// isAdmin se calcula, nunca se asigna directamente.
// ─────────────────────────────────────────────────────────────

interface AuthResult {
  error: string | null;
}

interface AuthContextValue {
  user: SupabaseUser | null;
  profile: Profile | null;
  role: Role | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string, name: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, role")
        .eq("id", userId)
        .single();

      if (error) {
        // No hardcodeamos un rol por defecto acá: si no se pudo leer el
        // perfil, el usuario queda sin rol (isAdmin=false) hasta que se
        // resuelva el error, en vez de asumir silenciosamente "admin".
        console.error("[Auth] Error obteniendo el perfil:", error.message);
        setProfile(null);
        return;
      }

      setProfile(data as Profile);
    },
    [supabase]
  );

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) await fetchProfile(session.user.id);
      setLoading(false);
    });

    // Se dispara en login, logout, refresh de token y cambios de sesión
    // en otra pestaña — mantiene todo sincronizado sin lógica duplicada.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  async function signUp(email: string, password: string, name: string): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // El trigger `handle_new_user` en Supabase lee este `name` para
        // crear el perfil, siempre con role='user' (ver migración SQL).
        data: { full_name: name },
      },
    });

    if (error) return { error: error.message };
    if (data.user) await fetchProfile(data.user.id);
    return { error: null };
  }

  async function signIn(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data.user) await fetchProfile(data.user.id);
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id);
  }

  const role = profile?.role ?? null;
  // Único lugar donde se decide qué significa "ser admin": cualquier rol
  // que no sea el default de cliente ("user") tiene acceso al panel.
  const isAdmin = role !== null && role !== "user";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        loading,
        isAuthenticated: !!user,
        isAdmin,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
