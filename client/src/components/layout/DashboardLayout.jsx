import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import AiChat from '../AiChat';
import CommandPalette from '../common/CommandPalette';
import { useAuth } from '../../context/AuthContext';

const titles = {
  '/': 'Dashboard',
  '/materials': 'Items',
  '/products': 'Sales Products & Recipes',
  '/analytics': 'Analytics & Performance',
  '/transactions': 'Stock Management System',
  '/transactions/cash-grv': 'Cash Goods Receiving Voucher',
  '/transactions/credit-grv': 'Credit Goods Receiving Voucher',
  '/transactions/pos-adjustment': 'Positive Stock Adjustment Voucher',
  '/transactions/disposal': 'Goods Disposal Voucher',
  '/transactions/neg-adjustment': 'Negative Stock Adjustment Voucher',
  '/sales-import': 'Sales & POS Import',
  '/purchases': 'Purchases',
  '/suppliers': 'Suppliers Directory',
  '/reports': 'Reports & Analytics',
  '/reports/summary': 'Overview Summary Report',
  '/reports/stock-balance': 'Stock Balance Report',
  '/reports/inventory-count': 'Inventory Count',
  '/reports/daily': 'Daily Movement Report',
  '/reports/cash-grv': 'Cash GRV Report',
  '/reports/credit-grv': 'Credit GRV Report',
  '/reports/pos-adjustment': '+ve Adjustment Report',
  '/reports/disposal': 'Goods Disposal Report',
  '/reports/neg-adjustment': '−ve Adjustment Report',
  '/reports/stock-levels': 'Stock Levels Report',
  '/reports/purchases': 'Purchases Report',
  '/users': 'Staff Accounts',
  '/employees': 'Employee Management',
  '/consumption': 'Consumption Management',
  '/settings': 'System Settings',
  '/profile': 'User Profile',
  '/recycle-bin': 'Recycle Bin',
  '/stock-requests': 'Stock Issue & Request',
};
const DashboardLayout = () => {
  const { companyInfo } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);  // mobile overlay
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);  // desktop collapse
  const location = useLocation();
  const title = titles[location.pathname] || (companyInfo?.companyName ? `${companyInfo.companyName} Stock` : 'Sharp Plus Stock');

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f6fb]">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
      />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          onToggleCollapse={() => setSidebarCollapsed(c => !c)}
          title={title}
        />
        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8 flex flex-col justify-between bg-[#f4f6fb]">
          <div className="w-full">
            <Outlet />
          </div>
          <footer className="mt-8 pt-4 pb-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <p className="font-medium text-slate-500">
              © 2026 <strong className="text-slate-700 font-semibold">{companyInfo?.companyName || 'Sharp Plus Trading PLC'}</strong>. All Rights Reserved.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
              <span className="text-slate-400">Powered by M*GH 1 Batch</span>
              <a
                href="https://t.me/+251918592028"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                Telegram Help
              </a>
              <span className="text-slate-300">|</span>
              <a
                href="https://wa.me/251918592028"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                WhatsApp Support
              </a>
            </div>
          </footer>
        </main>
      </div>
      {/* AI Chat — floats over every page */}
      <AiChat />
      {/* Global Command Palette & Quick Navigation (Ctrl+K) */}
      <CommandPalette onToggleSidebarCollapse={() => setSidebarCollapsed(c => !c)} />
    </div>
  );
};
export default DashboardLayout;
