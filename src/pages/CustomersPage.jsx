import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dataService } from '../data/dataService';
import Modal from '../components/ui/Modal';
import CustomerForm from '../components/customers/CustomerForm';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import { Plus, User, MoreHorizontal, Trash2, Edit2, ExternalLink, Search } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
import StatusPill from '../components/ui/StatusPill';
import { getStatusColor } from '../utils/statusColors';
import DropdownMenu from '../components/ui/DropdownMenu';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const CustomersPage = () => {
    const [customers, setCustomers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [isTrashDialogOpen, setIsTrashDialogOpen] = useState(false);
    const [customerToTrash, setCustomerToTrash] = useState(null);
    const navigate = useNavigate();

    const CUSTOMER_STATUS_OPTIONS = [
        { value: 'all', label: 'All' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
    ];

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        setIsLoading(true);
        const data = await dataService.getCustomers();
        setCustomers(data);
        setIsLoading(false);
    };

    const handleSave = async (customerData) => {
        await dataService.saveCustomer(customerData);
        loadCustomers();
        setIsModalOpen(false);
        setEditingCustomer(null);
    };

    const handleTrashClick = (customer) => {
        setCustomerToTrash(customer);
        setIsTrashDialogOpen(true);
    };

    const confirmTrash = async () => {
        if (!customerToTrash) return;
        try {
            await dataService.archiveResource('customers', customerToTrash.id);
            toast.success('Client moved to Trash');
            loadCustomers();
        } catch (err) {
            toast.error('Failed to move client to trash');
        } finally {
            setIsTrashDialogOpen(false);
            setCustomerToTrash(null);
        }
    };

    const filteredCustomers = customers.filter(c => {
        const matchesSearch = c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.country && c.country.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (c.vat_number && c.vat_number.toLowerCase().includes(searchTerm.toLowerCase()));

        const health = c.health === 'stable' ? 'active' : c.health;
        const matchesStatus = filterStatus === 'all' || health === filterStatus;

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="page-container fade-in">
            {/* Block 1: Standardized Top Bar */}
            <div className="flex items-center justify-between gap-6 mb-6">
                {/* LEFT: Segmented filter pills */}
                <div className="flex bg-[var(--bg-subtle)] p-1 rounded-xl border border-[var(--border-subtle)]">
                    {CUSTOMER_STATUS_OPTIONS.map(opt => (
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
                                backgroundColor: getStatusColor(opt.value === 'all' ? 'active' : opt.value).dot,
                            } : {}}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                {/* RIGHT: Search + New Client */}
                <div className="flex items-center gap-4 flex-1 justify-end max-w-2xl">
                    <div className="relative flex-1 max-w-xs">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by company, country or VAT ID..."
                            className="w-full h-9 pl-9 pr-4 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-xl text-[13px] font-medium outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition-all"
                        />
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    </div>

                    <Button
                        onClick={() => {
                            setEditingCustomer(null);
                            setIsModalOpen(true);
                        }}
                        className="bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm hover:shadow-md transition-all whitespace-nowrap font-bold rounded-lg px-4 h-9"
                        size="sm"
                    >
                        <Plus size={16} className="mr-1.5" /> New Client
                    </Button>
                </div>
            </div>

            <Table headers={['Customer Name', 'Location', 'VAT ID', 'Health', 'Actions']}>
                {isLoading ? (
                    <tr><td colSpan="5" className="py-20 text-center text-[var(--text-muted)]">Loading customers...</td></tr>
                ) : filteredCustomers.length > 0 ? (
                    filteredCustomers.map(customer => (
                        <tr key={customer.id} className="hover:bg-[var(--bg-app)] transition-colors group border-b border-[var(--border-subtle)] last:border-0 text-left align-middle h-16 cursor-pointer" onClick={() => navigate(`/customers/${customer.id}`)}>
                            <td className="py-3 px-6 font-bold">
                                <Link to={`/customers/${customer.id}`} className="flex items-center gap-4 text-[var(--text-main)] hover:text-[var(--primary)] transition-colors">
                                    <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--bg-app)] text-[var(--primary)] flex items-center justify-center shadow-sm border border-[var(--border-subtle)]">
                                        <User size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[14px] leading-tight">{customer.company_name}</span>
                                        {customer.email && <span className="text-[12px] text-[var(--text-muted)] font-medium mt-0.5">{customer.email}</span>}
                                    </div>
                                </Link>
                            </td>
                            <td className="py-3 px-6 text-[14px] font-medium text-[var(--text-secondary)]">
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]/50"></span>
                                    {customer.country || <span className="text-[var(--text-muted)] opacity-50">Not specified</span>}
                                </div>
                            </td>
                            <td className="py-3 px-6">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-mono bg-[var(--bg-app)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                                    {customer.vat_number || 'No VAT'}
                                </span>
                            </td>
                            <td className="py-3 px-6">
                                <StatusPill status={customer.health === 'stable' ? 'active' : customer.health} />
                            </td>
                            <td className="py-3 px-6" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-end pr-2">
                                    <DropdownMenu
                                        trigger={
                                            <Button variant="ghost" size="sm" className="w-8 h-8 p-0 rounded-full hover:bg-[var(--bg-app)]">
                                                <MoreHorizontal size={16} className="text-[var(--text-muted)]" />
                                            </Button>
                                        }
                                        actions={[
                                            { label: 'View Profile', onClick: () => navigate(`/customers/${customer.id}`), icon: ExternalLink },
                                            { label: 'Edit Details', onClick: () => handleEdit(customer), icon: Edit2 },
                                            { label: 'Move to Trash', onClick: () => handleTrashClick(customer), isDestructive: true, icon: Trash2 }
                                        ]}
                                    />
                                </div>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={5}>
                            <EmptyState
                                icon={User}
                                title="No customers found"
                                description="Add a new customer to manage their details."
                            />
                        </td>
                    </tr>
                )}
            </Table>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingCustomer ? 'Edit Customer' : 'Add New Customer'}
            >
                <div className="p-1">
                    <CustomerForm
                        customer={editingCustomer}
                        onSave={handleSave}
                        onDelete={handleTrashClick}
                        onCancel={() => setIsModalOpen(false)}
                    />
                </div>
            </Modal>

            <ConfirmationDialog
                isOpen={isTrashDialogOpen}
                onClose={() => setIsTrashDialogOpen(false)}
                onConfirm={confirmTrash}
                title="Move Client to Trash"
                message={`Are you sure you want to move "${customerToTrash?.company_name}" and all its related projects and offers to the trash?`}
                confirmText="Move to Trash"
                isDestructive={true}
            />
        </div>
    );
};

export default CustomersPage;
