import React, { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearCacheAndReload = () => {
    try {
      localStorage.removeItem("savoirplus_user_profile");
      localStorage.removeItem("savoir_last_active_tab");
      sessionStorage.clear();
    } catch {}
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-slate-900 text-white flex flex-col items-center justify-center p-4 sm:p-6 font-sans select-none">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-center">
            {/* App Icon */}
            <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle size={32} />
            </div>

            {/* Error Message */}
            <div className="space-y-1.5">
              <h2 className="text-xl font-black text-white tracking-tight">
                Génie Mentor Académie (GMA)
              </h2>
              <p className="text-sm font-bold text-amber-400">
                Une interruption d'affichage est survenue
              </p>
              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                L'application a rencontré un imprévu temporaire. Vous pouvez recharger l'interface en toute sécurité sans perdre vos cours enregistrés.
              </p>
            </div>

            {/* Error Detail */}
            {this.state.error && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-left max-h-28 overflow-y-auto">
                <p className="text-[10px] font-mono text-rose-400 break-all">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-2"
              >
                <RefreshCw size={15} />
                <span>Recharger l'application</span>
              </button>

              <button
                type="button"
                onClick={this.handleClearCacheAndReload}
                className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <Trash2 size={14} />
                <span>Réinitialiser la session & Ouvrir l'accueil</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
