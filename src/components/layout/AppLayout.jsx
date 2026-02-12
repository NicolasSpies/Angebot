import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const AppLayout = () => {
    return (
        <div className="app-container">
            <Sidebar />
            <div className="main-content">
                <TopBar />
                <main>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AppLayout;
