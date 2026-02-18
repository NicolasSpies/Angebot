import React from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import Button from './Button';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("[ErrorBoundary] Caught error:", error, errorInfo);

        // Log to our custom logger if available
        if (window.appLogger) {
            window.appLogger.error("UI_CRASH", {
                error: error.toString(),
                componentStack: errorInfo.componentStack
            });
        }
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoBack = () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = '/';
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center p-6">
                    <div className="max-w-md w-full bg-white rounded-[calc(var(--radius-lg)*2)] shadow-2xl border border-red-100 p-10 text-center animate-in fade-in zoom-in-95 duration-500">
                        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                            <AlertTriangle size={40} />
                        </div>

                        <h1 className="text-2xl font-black text-[var(--text-main)] mb-4 uppercase tracking-tight">
                            Something went wrong
                        </h1>

                        <p className="text-[var(--text-secondary)] font-medium mb-10 leading-relaxed text-[15px]">
                            An unexpected error occurred while rendering this page. Our team has been notified.
                        </p>

                        {import.meta.env.DEV && (
                            <div className="mb-8 p-4 bg-slate-50 rounded-xl text-left overflow-auto max-h-40 border border-slate-100 font-mono">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-200 pb-1">Debug Stack Trace</p>
                                <code className="text-[12px] text-red-600 break-all whitespace-pre-wrap">
                                    {this.state.error?.toString()}
                                </code>
                            </div>
                        )}

                        <div className="flex flex-col gap-3">
                            <Button
                                size="lg"
                                className="w-full font-black uppercase tracking-widest shadow-xl shadow-[var(--primary)]/20"
                                onClick={this.handleReload}
                            >
                                <RefreshCw size={18} className="mr-2" /> Reload Page
                            </Button>
                            <Button
                                variant="ghost"
                                size="lg"
                                className="w-full font-bold text-[var(--text-muted)] hover:bg-[var(--bg-app)]"
                                onClick={this.handleGoBack}
                            >
                                <ArrowLeft size={18} className="mr-2" /> Go Back
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
