import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';    // We will verify/create this next
import TopBar from './TopBar';      // We will verify/create this next

const PageShell = () => {
    return (
        <div className="flex h-screen w-full bg-[var(--bg-app)] overflow-x-hidden">
            {/* Fixed Sidebar */}
            <aside className="w-[280px] bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] flex-shrink-0 z-[var(--z-sidebar)] flex flex-col h-full">
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
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default PageShell;
