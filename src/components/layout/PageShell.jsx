import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import CommandPalette from '../CommandPalette';

const PageShell = () => {
    return (
        <div className="flex h-screen w-full bg-[var(--bg-app)] overflow-x-hidden">
            <CommandPalette />
            {/* Fixed Sidebar */}
            <aside className="w-[240px] bg-[var(--bg-sidebar)] border-r border-[rgba(0,0,0,0.06)] flex-shrink-0 z-[var(--z-sidebar)] flex flex-col h-full">
                <Sidebar />
            </aside>

            {/* Main Content Area */}
            <div className="flex flex-col flex-1 min-w-0 h-full">
                {/* Fixed TopBar */}
                <header className="h-[64px] bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] flex-shrink-0 z-[var(--z-header)] px-8 flex items-center justify-between sticky top-0">
                    <TopBar />
                </header>

                {/* Scrollable Page Content */}
                <main className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="min-h-full">
                        <Suspense fallback={<div className="p-8 text-[var(--text-muted)]">Loading page...</div>}>
                            <Outlet />
                        </Suspense>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default PageShell;
