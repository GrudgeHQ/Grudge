"use client";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (provider?: string) => {
    setLoading(true);
    await signIn(provider);
    setLoading(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-950">
      <div className="w-full max-w-md bg-slate-900 p-8 rounded-xl shadow-2xl border border-slate-800">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="24" cy="24" r="24" fill="#3B82F6" />
              <text x="50%" y="55%" textAnchor="middle" fill="#fff" fontSize="22" fontWeight="bold" dy=".3em">G</text>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Sign in to Grudge</h1>
          <p className="text-slate-400 text-center">Access your account to manage teams, leagues, and tournaments.</p>
        </div>
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded mb-4 text-center">
            {error === "CredentialsSignin" ? "Invalid email or password." : "Authentication error. Please try again."}
          </div>
        )}
        <div className="space-y-4">
          <button
            onClick={() => handleSignIn("google")}
            className="w-full flex items-center justify-center gap-2 bg-white text-slate-900 font-semibold px-4 py-2 rounded hover:bg-blue-100 transition-colors shadow"
            disabled={loading}
          >
            <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_17_40)"><path d="M47.5 24.5C47.5 22.6 47.3 20.8 47 19H24V29.1H37.3C36.7 32.1 34.7 34.6 31.8 36.3V42H39.5C44.1 38.1 47.5 32 47.5 24.5Z" fill="#4285F4"/><path d="M24 48C30.6 48 36.1 45.7 39.5 42L31.8 36.3C29.9 37.5 27.6 38.2 24 38.2C17.7 38.2 12.2 34.1 10.3 28.7H2.3V34.6C5.7 41.1 14.1 48 24 48Z" fill="#34A853"/><path d="M10.3 28.7C9.7 26.7 9.7 24.7 9.7 22.7C9.7 20.7 9.7 18.7 10.3 16.7V10.8H2.3C0.8 13.7 0 16.8 0 20C0 23.2 0.8 26.3 2.3 29.2L10.3 28.7Z" fill="#FBBC05"/><path d="M24 9.8C27.6 9.8 30.3 11.1 32.1 12.7L39.6 5.2C36.1 2.1 30.6 0 24 0C14.1 0 5.7 6.9 2.3 13.4L10.3 19.3C12.2 13.9 17.7 9.8 24 9.8Z" fill="#EA4335"/></g><defs><clipPath id="clip0_17_40"><rect width="48" height="48" fill="white"/></clipPath></defs></svg>
            Sign in with Google
          </button>
          <button
            onClick={() => handleSignIn("credentials")}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded transition-colors shadow"
            disabled={loading}
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mr-2"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 01-8 0m8 0V8a4 4 0 10-8 0v4m8 0v4a4 4 0 01-8 0v-4" /></svg>
            Sign in with Email
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-6 text-center">By signing in, you agree to our Terms of Service and Privacy Policy.</p>
      </div>
    </main>
  );
}
