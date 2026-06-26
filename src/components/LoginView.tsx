/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Compass, ShieldAlert, Eye, EyeOff } from "lucide-react";

interface LoginViewProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent, customCredentials?: { email: string; pass: string }) => {
    if (e) e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const activeEmail = customCredentials ? customCredentials.email : email;
    const activePass = customCredentials ? customCredentials.pass : password;

    if (!activeEmail || !activePass) {
      setError("Please key in both email and password.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: activeEmail, password: activePass })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      // Feed token back to App context
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please check your internet connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="login-container" className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-slate-950 px-4 py-12 sm:px-6 lg:px-8 relative">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 rounded-xl shadow-sm border border-slate-205 dark:border-slate-800">
        <div>
          {/* Custom Header travel themed Logo */}
          <div className="flex justify-center items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Compass className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight block">MANIVTHA</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 block -mt-1">Tours & Travels</span>
            </div>
          </div>
          
          <h2 id="login-headline" className="mt-6 text-center text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            SLA Escalation Portal
          </h2>
          <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
            Secure enterprise access to monitor operational limits
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 p-4 text-xs font-semibold text-red-700 dark:text-red-300 flex gap-2.5 items-start animate-fade-in">
            <ShieldAlert className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-6 space-y-5" onSubmit={(e) => handleLogin(e)}>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Corporate Email
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="name@manivtha.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Security Password
              </label>
              <div className="relative flex items-center">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer focus:outline-none flex items-center"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? "Authenticating security..." : "Sign Into Console"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
