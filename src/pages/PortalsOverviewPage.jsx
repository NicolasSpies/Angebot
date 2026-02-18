import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../data/dataService';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import { getStatusColor } from '../utils/statusColors';
import StatusPill from '../components/ui/StatusPill';
import { Search, Users, Globe, Eye, ShieldCheck, ShieldAlert, Mail, ArrowRight } from 'lucide-react';

const PortalsOverviewPage = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const navigate = useNavigate();

    const PORTAL_STATUS_OPTIONS = [
        { value: 'all', label: 'All' },
        { value: 'enabled', label: 'Enabled' },
        { value: 'not_enabled', label: 'Not Enabled' }
    ];

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        try {
            const data = await dataService.getCustomers();
            setCustomers(data);
        } catch (err) {
            console.error('Failed to load customers:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredCustomers = customers.filter(c => {
        const matchesSearch = c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));

        const status = c.portal_enabled ? 'enabled' : 'not_enabled';
        const matchesStatus = filterStatus === 'all' || status === filterStatus;

        return matchesSearch && matchesStatus;
    });
    const togglePortal = async (customer) => {
        try {
            const newStatus = !customer.portal_enabled;
            await dataService.saveCustomer({
                ...customer,
                portal_enabled: newStatus
            });
            await loadCustomers();
        } catch (err) {
            console.error('Failed to toggle portal:', err);
        }
    };

    return (
        <div className="page-container fade-in max-w-[1600px] mx-auto pb-24">
            {/* Block 1: Standardized Top Bar */}
            <div className="flex items-center justify-between gap-6 mb-6">
                {/* LEFT: Segmented filter pills */}
                <div className="flex bg-[var(--bg-subtle)] p-1 rounded-xl border border-[var(--border-subtle)]">
                    {PORTAL_STATUS_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setFilterStatus(opt.value)}
                            className={`
                                flex items-center gap-2 px-4 h-8 rounded-lg text-[12px] font-bold transition-all whitespace-nowrap
                                ${filterStatus === opt.value
                                    ? 'text-white shadow-sm'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-white/50'}
                            `}
                            style={filterStatus === opt.value ? {
                                backgroundColor: getStatusColor(opt.value === 'all' ? 'enabled' : opt.value).dot,
                            } : {}}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                {/* RIGHT: Search only */}
                <div className="relative flex-1 max-w-xs">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search portals..."
                        className="w-full h-9 pl-9 pr-4 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-xl text-[13px] font-medium outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition-all"
                    />
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                </div>
            </div>

            <Table headers={[
                { label: 'Customer', width: '35%' },
                { label: 'Email', width: '25%' },
                { label: 'Portal Status', width: '15%' },
                { label: 'Actions', width: '25%', align: 'right' }
            ]}>
                {loading ? (
                    <tr><td colSpan={4} className="py-10 text-center text-[var(--text-muted)]">Loading portals...</td></tr>
                ) : filteredCustomers.length === 0 ? (
                    <tr><td colSpan={4} className="py-10 text-center text-[var(--text-muted)]">No portals found.</td></tr>
                ) : (
                    filteredCustomers.map((customer) => (
                        <tr
                            key={customer.id}
                            className="hover:bg-[var(--bg-app)] transition-colors group border-b border-[var(--border-subtle)] last:border-0 h-16"
                        >
                            <td className="py-3 px-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] font-bold text-xs uppercase group-hover:bg-[var(--primary-light)] group-hover:text-[var(--primary)] transition-colors">
                                        {customer.company_name?.charAt(0) || <Users size={16} />}
                                    </div>
                                    <span className="font-bold text-[14px] text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors">
                                        {customer.company_name}
                                    </span>
                                </div>
                            </td>
                            <td className="py-3 px-6">
                                <div className="flex items-center gap-2 text-[var(--text-secondary)] text-[14px] font-medium">
                                    <Mail size={14} className="opacity-50" />
                                    {customer.email || 'No email provided'}
                                </div>
                            </td>
                            <td className="py-3 px-6">
                                <StatusPill status={customer.portal_enabled ? 'enabled' : 'not_enabled'} />
                            </td>
                            <td className="py-3 px-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--primary-light)] h-9 px-4 rounded-lg font-bold text-[13px]"
                                        onClick={() => navigate(`/portal/preview/${customer.id}`)}
                                    >
                                        <Eye size={14} className="mr-1.5" />
                                        Preview
                                    </Button>
                                    <Button
                                        variant={customer.portal_enabled ? "secondary" : "primary"}
                                        size="sm"
                                        className={`h-9 px-4 rounded-lg font-bold text-[13px] min-w-[120px] shadow-sm transition-all ${customer.portal_enabled ? 'text-[var(--danger)] border-[var(--danger)] hover:bg-red-50 hover:text-[var(--danger)]' : ''}`}
                                        onClick={() => togglePortal(customer)}
                                    >
                                        {customer.portal_enabled ? "Disable Portal" : "Enable Portal"}
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))
                )}
            </Table>

        </div>
    );
};

export default PortalsOverviewPage;
