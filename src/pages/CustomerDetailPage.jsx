import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { dataService } from '../data/dataService';
import { useI18n } from '../i18n/I18nContext';
import { formatCurrency } from '../utils/pricingEngine';
import {
    Briefcase, Clock, CheckCircle, FileText, AlertTriangle,
    TrendingUp, Plus, Copy, Pencil, ExternalLink,
    ChevronLeft, Globe, Mail, Phone, MapPin, FolderOpen
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import CustomerForm from '../components/customers/CustomerForm';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import StatusPill from '../components/ui/StatusPill';
import DueStatusIndicator from '../components/ui/DueStatusIndicator';
import DropdownMenu from '../components/ui/DropdownMenu';
import TableCard from '../components/ui/TableCard';

const CustomerDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useI18n();
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await dataService.getCustomerDashboard(id);
            setData(result);
        } catch (err) {
            console.error('Failed to load customer dashboard', err);
        }
        setIsLoading(false);
    }, [id]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleEditCustomer = async (customerData) => {
        await dataService.saveCustomer(customerData);
        loadData();
        setIsEditModalOpen(false);
    };

    const handleDuplicateOffer = async (offerId) => {
        const result = await dataService.duplicateOffer(offerId);
        if (result.success) {
            navigate(`/offer/edit/${result.id}`);
        }
    };

    if (isLoading) return <div className="page-container">Loading customer...</div>;
    if (!data || !data.customer) return <div className="page-container">Customer not found.</div>;

    const { customer, offers = [], projects = [], stats = {} } = data;

    return (
        <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header / Breadcrumb */}
            <div className="mb-10">
                <Link to="/customers" className="inline-flex items-center gap-2 text-[13px] font-bold text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors mb-6 group">
                    <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Directory
                </Link>
                <div className="flex justify-between items-start gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-extrabold text-[var(--text-main)]">{customer.company_name}</h1>
                            <Badge variant="neutral" className="mt-1 shadow-sm px-3 py-1">#{customer.id}</Badge>
                        </div>
                        <div className="flex items-center gap-6 text-[14px] text-[var(--text-secondary)] font-medium">
                            <span className="flex items-center gap-2"><MapPin size={16} className="text-[var(--text-muted)]" /> {customer.city || 'N/A'}, {customer.country || 'N/A'}</span>
                            <span className="flex items-center gap-2"><FileText size={16} className="text-[var(--text-muted)]" /> <span className="uppercase font-bold text-[12px]">{customer.vat_number || 'VAT Exempt'}</span></span>
                            <span className="flex items-center gap-2">
                                <Globe size={16} className="text-[var(--text-muted)]" />
                                <span className="uppercase font-bold text-[12px] tracking-wider">{customer.language === 'de' ? 'German (DE)' : 'French (FR)'}</span>
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="ghost" className="font-bold border-[var(--border)]" onClick={() => setIsEditModalOpen(true)}>
                            <Pencil size={18} className="mr-2" /> Update Profile
                        </Button>
                        <Button size="lg" className="shadow-lg" onClick={() => navigate('/offer/new', { state: { customerId: customer.id } })}>
                            <Plus size={18} className="mr-2" /> New Business Offer
                        </Button>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-3 gap-6 mb-10">
                <Card padding="1.5rem" className="border-[var(--border)] shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center shadow-sm">
                            <FileText size={24} />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Open Offers</p>
                            <h2 className="text-[24px] font-black text-[var(--text-main)] tracking-tight">{stats.openOffersCount || 0}</h2>
                            <p className="text-[13px] text-[var(--text-secondary)] font-medium mt-0.5">Value: {formatCurrency(stats.openOffersValue || 0)}</p>
                        </div>
                    </div>
                </Card>
                <Card padding="1.5rem" className="border-[var(--border)] shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-xl bg-[var(--warning-bg)] text-[var(--warning)] flex items-center justify-center shadow-sm">
                            <Briefcase size={24} />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Active Projects</p>
                            <h2 className="text-[24px] font-black text-[var(--text-main)] tracking-tight">{stats.activeProjectsCount || 0}</h2>
                            <div className="flex items-center gap-2 mt-1 text-[11px] font-bold text-[var(--text-muted)]">
                                {stats.projectStatusBreakdown ? (
                                    <>
                                        <span>{stats.projectStatusBreakdown.pending || 0} pending</span>
                                        <span className="opacity-30">·</span>
                                        <span>{stats.projectStatusBreakdown.todo || 0} to do</span>
                                        <span className="opacity-30">·</span>
                                        <span>{stats.projectStatusBreakdown.in_progress || 0} active</span>
                                    </>
                                ) : <span>No active work</span>}
                            </div>
                        </div>
                    </div>
                </Card>
                <Card padding="1.5rem" className="border-[var(--border)] shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-xl bg-[var(--success-bg)] text-[var(--success)] flex items-center justify-center shadow-sm">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Total Revenue</p>
                            <h2 className="text-[24px] font-black text-[var(--text-main)] tracking-tight">{formatCurrency(stats.totalRevenue || 0)}</h2>
                            <p className="text-[13px] text-[var(--text-secondary)] font-medium mt-0.5">{stats.signedCount || 0} signed contracts</p>
                        </div>
                    </div>
                </Card>
            </div>



            {/* Offer History */}
            < TableCard
                title="Financial Pipeline"
                action={
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => offers.length > 0 && handleDuplicateOffer(offers[0].id)}
                        disabled={offers.length === 0}
                        className="text-[var(--primary)] hover:bg-[var(--primary-light)] font-bold px-4"
                    >
                        <Copy size={16} className="mr-2" /> Clone Recent
                    </Button>
                }
                className="mb-10"
            >
                <Table headers={['Offer Name', 'Creation Date', 'Contract Value', 'Status', 'Actions']}>
                    {offers.length > 0 ? offers.map(offer => (
                        <tr key={offer.id} className="group hover:bg-[var(--bg-main)] transition-colors h-14 border-b border-[var(--border-subtle)] last:border-0">
                            <td className="py-3 px-6 font-bold text-[var(--text-main)]">
                                <Link to={`/offer/preview/${offer.id}`} className="hover:text-[var(--primary)] transition-colors">
                                    {offer.offer_name || `ANB-${offer.id}`}
                                </Link>
                            </td>
                            <td className="py-3 px-6 text-[14px] text-[var(--text-secondary)] font-medium">
                                {new Date(offer.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </td>
                            <td className="py-3 px-6 font-extrabold text-[var(--text-main)]">{formatCurrency(offer.total)}</td>
                            <td className="py-3 px-6">
                                <div className="flex items-center">
                                    <Badge variant={
                                        offer.status === 'signed' ? 'success' :
                                            offer.status === 'sent' ? 'warning' :
                                                offer.status === 'declined' ? 'danger' : 'neutral'
                                    } showDot={true} className="shadow-sm">
                                        {(offer.status || 'draft').toUpperCase()}
                                    </Badge>
                                </div>
                            </td>
                            <td className="py-3 px-6">
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                    <Button variant="ghost" size="sm" onClick={() => navigate(`/offer/preview/${offer.id}`)} className="text-[var(--primary)]">
                                        <ExternalLink size={16} />
                                    </Button>
                                    <DropdownMenu
                                        actions={[
                                            { label: 'View Preview', onClick: () => navigate(`/offer/preview/${offer.id}`) },
                                            { label: 'Edit Draft', onClick: () => navigate(`/offer/edit/${offer.id}`) },
                                            { label: 'Duplicate Offer', onClick: () => handleDuplicateOffer(offer.id) }
                                        ]}
                                    />
                                </div>
                            </td>
                        </tr>
                    )) : (
                        <tr><td colSpan="5" className="py-20 px-6 text-center">
                            <FileText size={40} className="mx-auto text-[var(--text-muted)] opacity-20 mb-4" />
                            <p className="text-[var(--text-muted)] font-medium">No financial history recorded for this customer.</p>
                        </td></tr>
                    )}
                </Table>
            </TableCard>

            {/* Projects Table */}
            <TableCard title="Projects">
                <Table headers={['Project Name', 'Status', 'Deadline', 'Linked Offer']}>
                    {(projects || []).length > 0 ? (projects || []).map(project => (
                        <tr key={project.id} className="group hover:bg-[var(--bg-main)] transition-colors h-14 border-b border-[var(--border-subtle)] last:border-0">
                            <td className="py-3 px-6">
                                <Link to={`/projects/${project.id}`} className="font-bold text-[var(--text-main)] hover:text-[var(--primary)] transition-colors">
                                    {project.name}
                                </Link>
                            </td>
                            <td className="py-3 px-6">
                                <div className="flex items-center">
                                    <StatusPill status={project.status} />
                                </div>
                            </td>
                            <td className="py-3 px-6 text-[14px] text-[var(--text-secondary)] font-medium">
                                {project.deadline ? (
                                    <DueStatusIndicator dueDate={project.deadline} status={project.status} />
                                ) : '—'}
                            </td>
                            <td className="py-3 px-6 text-[14px] text-[var(--text-secondary)] font-medium">
                                {project.offer_name || '—'}
                            </td>
                        </tr>
                    )) : (
                        <tr><td colSpan="4" className="py-20 px-6 text-center">
                            <FolderOpen size={40} className="mx-auto text-[var(--text-muted)] opacity-20 mb-4" />
                            <p className="text-[var(--text-muted)] font-medium">No projects recorded for this customer.</p>
                        </td></tr>
                    )}
                </Table>
            </TableCard>

            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Customer Profile"
            >
                <CustomerForm
                    customer={customer}
                    onSave={handleEditCustomer}
                    onCancel={() => setIsEditModalOpen(false)}
                />
            </Modal>
        </div >
    );
};

export default CustomerDetailPage;
