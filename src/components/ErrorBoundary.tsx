import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#151619] flex items-center justify-center p-6 font-mono text-white">
          <div className="max-w-md w-full bg-[#1c1d21] border border-[#2a2b30] rounded-2xl p-8 shadow-2xl relative overflow-hidden">
            {/* Decorative hardware elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500/50"></div>
            <div className="absolute top-2 right-4 flex gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <div className="w-2 h-2 rounded-full bg-[#3a3b40]"></div>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>

              <h1 className="text-xl font-bold mb-2 tracking-tight uppercase">System Exception</h1>
              <p className="text-[#8e9299] text-sm mb-8 leading-relaxed">
                An unexpected error occurred in the application runtime. 
                The session has been suspended to prevent data corruption.
              </p>

              {this.state.error && (
                <div className="w-full bg-[#0a0a0b] border border-[#2a2b30] rounded-lg p-4 mb-8 text-left overflow-auto max-h-32">
                  <p className="text-xs text-red-400 font-mono break-all">
                    {this.state.error.name}: {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 w-full">
                <button
                  onClick={this.handleReset}
                  className="flex items-center justify-center gap-2 bg-[#2a2b30] hover:bg-[#3a3b40] text-white py-3 rounded-xl transition-all active:scale-95 text-sm font-bold uppercase tracking-wider"
                >
                  <RefreshCw className="w-4 h-4" />
                  Restart
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="flex items-center justify-center gap-2 bg-white text-black hover:bg-gray-200 py-3 rounded-xl transition-all active:scale-95 text-sm font-bold uppercase tracking-wider"
                >
                  <Home className="w-4 h-4" />
                  Home
                </button>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#2a2b30] flex justify-between items-center">
              <span className="text-[10px] text-[#5a5b60] uppercase tracking-[2px]">OneVoice OS v1.0</span>
              <span className="text-[10px] text-[#5a5b60] uppercase tracking-[2px]">Error Code: 0x505</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
