import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import { dataService } from '../data/dataService';
import { formatCurrency } from '../utils/pricingEngine';
import { ArrowLeft, Plus, Trash2, CheckCircle, Circle, ExternalLink, Save, Calendar, Clock, DollarSign, Zap, FileText, MoreVertical, Box } from 'lucide-react';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import Badge from '../components/ui/Badge';
import QuickActionCard from '../components/QuickActionCard';

const STATUS_OPTIONS = ['todo', 'in_progress', 'feedback', 'done', 'cancelled'];
const STATUS_LABELS = {
    todo: 'To Do', in_progress: 'In Progress', feedback: 'Feedback', done: 'Done', cancelled: 'Cancelled'
};
const PRIORITY_VARIANTS = {
    low: 'neutral', medium: 'warning', high: 'danger'
};

const ProjectDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useI18n();
    const [project, setProject] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [offers, setOffers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [notes, setNotes] = useState('');
    const [notesSaving, setNotesSaving] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [editTaskValues, setEditTaskValues] = useState({});
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const loadProject = useCallback(async () => {
        setIsLoading(true);
        try {
            const [projectData, customersData, offersData] = await Promise.all([
                dataService.getProject(id),
                dataService.getCustomers(),
                dataService.getOffers()
            ]);
            setProject(projectData);
            setCustomers(customersData);
            setOffers(offersData);
            setNotes(projectData.internal_notes || '');
        } catch (err) {
            console.error('Failed to load project data', err);
        }
        setIsLoading(false);
    }, [id]);

    useEffect(() => { loadProject(); }, [loadProject]);

    const handleStatusChange = async (newStatus) => {
        await dataService.updateProject(id, { ...project, status: newStatus });
        setProject(prev => ({ ...prev, status: newStatus }));
    };

    const handleDeadlineChange = async (newDeadline) => {
        await dataService.updateProject(id, { ...project, deadline: newDeadline || null });
        setProject(prev => ({ ...prev, deadline: newDeadline }));
    };

    const handleCustomerChange = async (customerId) => {
        const selectedCustomer = customers.find(c => c.id === parseInt(customerId));
        const newCustomerId = selectedCustomer ? selectedCustomer.id : null;
        const newCustomerName = selectedCustomer ? selectedCustomer.company_name : null;

        await dataService.updateProject(id, { ...project, customer_id: newCustomerId });
        setProject(prev => ({ ...prev, customer_id: newCustomerId, customer_name: newCustomerName }));
    };

    const handleOfferChange = async (offerId) => {
        const selectedOffer = offers.find(o => o.id === parseInt(offerId));
        const newOfferId = selectedOffer ? selectedOffer.id : null;

        const newOfferName = selectedOffer ? (selectedOffer.offer_name || `#${selectedOffer.id}`) : null;
        const newOfferTotal = selectedOffer ? selectedOffer.total : null;
        const newOfferStatus = selectedOffer ? selectedOffer.status : null;

        await dataService.updateProject(id, { ...project, offer_id: newOfferId });
        setProject(prev => ({
            ...prev,
            offer_id: newOfferId,
            offer_name: newOfferName,
            offer_total: newOfferTotal,
            offer_status: newOfferStatus
        }));
    };

    const handleSaveNotes = async () => {
        setNotesSaving(true);
        try {
            await dataService.updateProject(id, { ...project, internal_notes: notes });
        } catch (error) {
            console.error('Failed to save notes', error);
        }
        setNotesSaving(false);
    };

    const handleAddTask = async () => {
        if (!newTaskTitle.trim()) return;
        await dataService.createTask(id, { title: newTaskTitle.trim() });
        setNewTaskTitle('');
        loadProject();
    };

    const handleToggleTask = async (task) => {
        await dataService.updateTask(task.id, { ...task, completed: !task.completed });
        loadProject();
    };

    const handleDeleteTask = async (taskId) => {
        await dataService.deleteTask(taskId);
        loadProject();
    };

    const handleEditTask = (task) => {
        setEditingTaskId(task.id);
        setEditTaskValues({
            title: task.title,
            description: task.description || '',
            priority: task.priority || 'medium',
            due_date: task.due_date ? task.due_date.split('T')[0] : '',
            status: task.status || 'todo'
        });
    };

    const handleSaveTask = async (task) => {
        await dataService.updateTask(task.id, {
            ...task,
            ...editTaskValues,
            due_date: editTaskValues.due_date || null
        });
        setEditingTaskId(null);
        loadProject();
    };

    const handleDeleteProject = async () => {
        try {
            await dataService.deleteProject(id);
            navigate('/projects');
        } catch (error) {
            console.error('Failed to delete project', error);
        }
    };

    if (isLoading || !project) return <div className="page-container">Loading project...</div>;

    const completedTasks = (project.tasks || []).filter(t => t.completed).length;
    const totalTasks = (project.tasks || []).length;
    const availableOffers = (project.customer_id
        ? offers.filter(o => o.customer_id === project.customer_id)
        : offers).filter(o => o.status !== 'draft' || o.id === project.offer_id);

    return (
        <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header / Breadcrumb */}
            <div className="mb-10">
                <Link to="/projects" className="inline-flex items-center gap-2 text-[13px] font-bold text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors mb-6 group">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Workspace
                </Link>
                <div className="flex justify-between items-start gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-extrabold text-[var(--text-main)]">{project.name}</h1>
                            <Badge variant={project.status === 'done' ? 'success' : 'warning'} className="mt-1 shadow-sm">
                                {STATUS_LABELS[project.status]}
                            </Badge>
                        </div>
                        <p className="text-[14px] text-[var(--text-secondary)] font-medium">Project ID: <span className="text-[var(--text-main)] font-bold">#{project.id}</span> • Managed by Nicolas</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="ghost" className="text-[var(--danger)] hover:bg-[var(--danger-bg)] font-bold" onClick={() => setIsDeleteModalOpen(true)}>
                            <Trash2 size={18} className="mr-2" /> Archive Project
                        </Button>
                        <Button size="lg" className="shadow-lg" onClick={handleSaveNotes} disabled={notesSaving}>
                            <Save size={18} className="mr-2" /> {notesSaving ? 'Saving...' : 'Sync Changes'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid" style={{ gridTemplateColumns: '1fr 360px', gap: '2rem', alignItems: 'start' }}>
                <div className="flex flex-column gap-6">
                    {/* Progress Overview (Mock Task Stats since section was missing) */}
                    <Card padding="1.5rem">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[15px] font-bold text-[var(--text-main)]">Project Roadmap</h3>
                            <Badge variant="neutral">{completedTasks}/{totalTasks} Tasks</Badge>
                        </div>
                        <div className="w-full bg-[var(--secondary-light)] h-2 rounded-full overflow-hidden mb-6">
                            <div
                                className="h-full bg-[var(--primary)] rounded-full transition-all duration-500"
                                style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks * 100) : 0}%` }}
                            />
                        </div>
                        <div className="flex flex-column gap-3">
                            <div className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] opacity-60">
                                <Box size={18} className="text-[var(--text-muted)]" />
                                <span className="text-[13px] font-medium text-[var(--text-muted)]">No active milestones defined. Start adding tasks to track progress.</span>
                            </div>
                        </div>
                    </Card>

                    {/* Internal Notes */}
                    <Card padding="2rem" className="border-[var(--border)]">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center">
                                <FileText size={18} />
                            </div>
                            <h3 className="text-[15px] font-bold text-[var(--text-main)]">Strategic Notes</h3>
                        </div>
                        <Textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={10}
                            placeholder="Document internal project requirements, meetings, and sensitive information here. Only visible to the project team."
                            className="bg-[var(--bg-main)]/30 border-[var(--border)] focus:bg-white text-[14px] leading-relaxed"
                        />
                    </Card>
                </div>

                {/* Sidebar Column */}
                <div className="flex flex-column gap-6">
                    {/* Core Lifecycle */}
                    <Card padding="1.5rem" className="border-[var(--border)] shadow-sm">
                        <h3 className="text-[13px] font-bold uppercase text-[var(--text-muted)] tracking-wider mb-6">Execution & Cycle</h3>
                        <div className="flex flex-column gap-6">
                            <div className="flex flex-column gap-2">
                                <label className="text-[12px] font-bold text-[var(--text-secondary)] uppercase">Current Phase</label>
                                <Select
                                    value={project.status}
                                    onChange={e => handleStatusChange(e.target.value)}
                                    options={STATUS_OPTIONS.map(s => ({ value: s, label: STATUS_LABELS[s] }))}
                                    className="bg-[var(--secondary-light)]/50 border-transparent hover:border-[var(--border)]"
                                />
                            </div>
                            <div className="flex flex-column gap-2">
                                <label className="text-[12px] font-bold text-[var(--text-secondary)] uppercase">Target Delivery</label>
                                <div className="relative group">
                                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                                    <Input
                                        type="date"
                                        value={project.deadline ? project.deadline.split('T')[0] : ''}
                                        onChange={e => handleDeadlineChange(e.target.value)}
                                        className="pl-10 bg-[var(--secondary-light)]/50 border-transparent hover:border-[var(--border)]"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-column gap-2">
                                <label className="text-[12px] font-bold text-[var(--text-secondary)] uppercase">Lead Client</label>
                                <Select
                                    value={project.customer_id || ''}
                                    onChange={e => handleCustomerChange(e.target.value)}
                                    options={[
                                        { value: '', label: 'Ghost Project (Unassigned)' },
                                        ...customers.map(c => ({ value: c.id, label: c.company_name }))
                                    ]}
                                    className="bg-[var(--secondary-light)]/50 border-transparent hover:border-[var(--border)]"
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Linked Offer Pipeline */}
                    <Card padding="1.5rem" className="border-[var(--border)] shadow-sm overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[13px] font-bold uppercase text-[var(--text-muted)] tracking-wider">Financial Link</h3>
                            {project.offer_id && (
                                <Link to={`/offer/preview/${project.offer_id}`} className="p-2 rounded-full hover:bg-[var(--secondary-light)] text-[var(--primary)] transition-colors">
                                    <ExternalLink size={16} />
                                </Link>
                            )}
                        </div>

                        <div className="flex flex-column gap-4">
                            <Select
                                value={project.offer_id || ''}
                                onChange={e => handleOfferChange(e.target.value)}
                                options={[
                                    { value: '', label: 'Select Financial Proposal' },
                                    ...availableOffers.map(o => ({ value: o.id, label: o.offer_name || `#${o.id}` }))
                                ]}
                                className="bg-[var(--bg-main)]"
                            />

                            {project.offer_id ? (
                                <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--primary-light)]/30 border border-[var(--primary)]/10">
                                    <div className="flex flex-column">
                                        <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase mb-1">Signed Contract Value</span>
                                        <div className="text-2xl font-extrabold text-[var(--text-main)] mb-3">{formatCurrency(project.offer_total)}</div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={project.offer_status === 'signed' ? 'success' : 'warning'} size="sm">
                                                {project.offer_status === 'signed' ? 'Confirmed' : 'Awaiting Signature'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6 px-4 bg-[var(--bg-main)]/50 rounded-[var(--radius-lg)] border border-dashed border-[var(--border)]">
                                    <p className="text-[13px] text-[var(--text-secondary)] font-medium mb-4">No active proposal linked to this project pipeline.</p>
                                    <Link to={`/offer/wizard?projectId=${id}${project.customer_id ? `&customerId=${project.customer_id}` : ''}`}>
                                        <Button variant="primary" size="sm" className="w-full">
                                            Initialize Proposal
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Quick Insight */}
                    <Card padding="1.25rem" className="bg-[var(--primary)] border-none text-white shadow-lg overflow-hidden relative">
                        <div className="absolute -right-4 -top-4 opacity-10">
                            <Zap size={80} />
                        </div>
                        <h4 className="flex items-center gap-2 text-[12px] font-bold uppercase mb-2">
                            <Zap size={14} className="fill-white" /> Smart Advice
                        </h4>
                        <p className="text-[12px] leading-relaxed opacity-90 mb-4">You have {totalTasks - completedTasks} pending tasks for this milestone. Consider allocating more resources.</p>
                        <Button variant="secondary" size="sm" className="w-full bg-white text-[var(--primary)] hover:bg-[var(--secondary-light)] border-none font-bold" onClick={() => navigate(`/offer/preview/${project.offer_id}`)} disabled={!project.offer_id}>
                            Review Project Scope
                        </Button>
                    </Card>
                </div>
            </div>

            <ConfirmationDialog
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteProject}
                title="Delete Project?"
                message={`Are you sure you want to delete "${project.name}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                isDestructive={true}
            />
        </div>
    );
};

export default ProjectDetailPage;
