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
                    <div className="flex-1">
                        <div className="group relative">
                            <input
                                type="text"
                                value={project.name}
                                onChange={(e) => setProject(prev => ({ ...prev, name: e.target.value }))}
                                onBlur={async (e) => {
                                    const newName = e.target.value.trim();
                                    if (newName !== project.name) {
                                        // Revert if empty
                                        if (!newName) {
                                            const original = await dataService.getProject(id);
                                            setProject(prev => ({ ...prev, name: original.name }));
                                            return;
                                        }

                                        // Save changes to Project
                                        await dataService.updateProject(id, { ...project, name: newName });

                                        // Sync to Offer if linked
                                        if (project.offer_id) {
                                            const linkedOffer = offers.find(o => o.id === project.offer_id);
                                            if (linkedOffer) {
                                                await dataService.updateOffer(project.offer_id, {
                                                    ...linkedOffer,
                                                    offer_name: newName
                                                });
                                                // Refresh offers to reflect change
                                                const updatedOffers = await dataService.getOffers();
                                                setOffers(updatedOffers);
                                            }
                                        }
                                    }
                                }}
                                className="text-3xl font-extrabold text-[var(--text-main)] w-full bg-transparent border-b-2 border-transparent hover:border-[var(--border)] focus:border-[var(--primary)] focus:outline-none transition-colors py-1"
                            />
                            <Pencil size={16} className="absolute top-1/2 -translate-y-1/2 -left-6 opacity-0 group-hover:opacity-50 text-[var(--text-muted)]" />
                        </div>
                        <div className="flex items-center gap-6 mt-2 text-[14px] text-[var(--text-secondary)] font-medium">
                            <span className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${project.status === 'done' ? 'bg-[var(--success)]' :
                                    project.status === 'in_progress' ? 'bg-[var(--primary)]' :
                                        project.status === 'cancelled' ? 'bg-[var(--danger)]' : 'bg-[var(--warning)]'
                                    }`} />
                                {(STATUS_LABELS[project.status] || project.status).toUpperCase()}
                            </span>
                            {project.customer_name && (
                                <Link to={`/customers/${project.customer_id}`} className="flex items-center gap-2 hover:text-[var(--primary)] transition-colors">
                                    <Globe size={16} className="text-[var(--text-muted)]" /> {project.customer_name}
                                </Link>
                            )}
                            <span className="flex items-center gap-2">
                                <Clock size={16} className="text-[var(--text-muted)]" /> Created {new Date(project.created_at).toLocaleDateString()}
                            </span>
                        </div>
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
                <div className="flex flex-col gap-6">
                    {/* Progress Overview */}
                    <Card padding="1.5rem">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[15px] font-bold text-[var(--text-main)]">Project Roadmap</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-[12px] font-bold text-[var(--text-secondary)]">{Math.round(totalTasks > 0 ? (completedTasks / totalTasks * 100) : 0)}% Complete</span>
                                <Badge variant="neutral">{completedTasks}/{totalTasks} Tasks</Badge>
                            </div>
                        </div>
                        {/* Segmented Progress Bar */}
                        <div className="flex gap-1 h-2 w-full mb-6">
                            {Array.from({ length: totalTasks || 1 }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`flex-1 rounded-full ${i < completedTasks ? 'bg-[var(--primary)]' : 'bg-[var(--secondary-light)]'}`}
                                />
                            ))}
                        </div>

                        {/* Task List Placeholder or Implementation */}
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] opacity-60">
                                <Box size={18} className="text-[var(--text-muted)]" />
                                <span className="text-[13px] font-medium text-[var(--text-muted)]">Task list management coming soon.</span>
                            </div>
                        </div>
                    </Card>

                    {/* Strategic Notes */}
                    <Card padding="2rem" className="border-[var(--border)]">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center">
                                    <FileText size={18} />
                                </div>
                                <div>
                                    <h3 className="text-[15px] font-bold text-[var(--text-main)]">Strategic Notes</h3>
                                    <p className="text-[11px] text-[var(--text-muted)]">Internal only • Auto-saves</p>
                                </div>
                            </div>
                            {project.updated_at && (
                                <span className="text-[11px] text-[var(--text-muted)]">
                                    Last update: {new Date().toLocaleTimeString()}
                                </span>
                            )}
                        </div>
                        <Textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={10}
                            placeholder="Document internal project requirements, meetings, and sensitive information here. Only visible to the project team."
                            className="bg-[var(--bg-main)]/30 border-[var(--border)] focus:bg-white text-[14px] leading-relaxed"
                        />
                    </Card>

                    {/* Activity Timeline */}
                    <Card padding="2rem" className="border-[var(--border)]">
                        <h3 className="text-[15px] font-bold text-[var(--text-main)] mb-6">Project Activity</h3>
                        <ActivityTimeline projectId={id} />
                    </Card>
                </div>

                {/* Sidebar Column */}
                <div className="flex flex-col gap-6">
                    {/* Core Lifecycle */}
                    <Card padding="1.5rem" className="border-[var(--border)] shadow-sm">
                        <h3 className="text-[13px] font-bold uppercase text-[var(--text-muted)] tracking-wider mb-6">Execution & Cycle</h3>
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-[12px] font-bold text-[var(--text-secondary)] uppercase">Current Phase</label>
                                <Select
                                    value={project.status}
                                    onChange={e => handleStatusChange(e.target.value)}
                                    options={STATUS_OPTIONS.map(s => ({ value: s, label: STATUS_LABELS[s] }))}
                                    className="bg-[var(--secondary-light)]/50 border-transparent hover:border-[var(--border)]"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[12px] font-bold text-[var(--text-secondary)] uppercase">Priority</label>
                                <Select
                                    value={project.priority || 'medium'}
                                    onChange={async (e) => {
                                        const newPriority = e.target.value;
                                        await dataService.updateProject(id, { ...project, priority: newPriority });
                                        setProject(prev => ({ ...prev, priority: newPriority }));
                                    }}
                                    options={[
                                        { value: 'low', label: 'Low Priority' },
                                        { value: 'medium', label: 'Medium Priority' },
                                        { value: 'high', label: 'High Priority' }
                                    ]}
                                    className="bg-[var(--secondary-light)]/50 border-transparent hover:border-[var(--border)]"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[12px] font-bold text-[var(--text-secondary)] uppercase">Target Delivery</label>
                                    {project.deadline && (
                                        <Badge variant={
                                            new Date(project.deadline) < new Date() && project.status !== 'done' ? 'danger' : 'neutral'
                                        } size="sm">
                                            {Math.ceil((new Date(project.deadline) - new Date()) / (1000 * 60 * 60 * 24))} days left
                                        </Badge>
                                    )}
                                </div>
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

                            <div className="flex flex-col gap-2">
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
                    <Card padding="0" className="border-[var(--border)] shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] flex justify-between items-center">
                            <h3 className="text-[13px] font-bold uppercase text-[var(--text-muted)] tracking-wider">Financial Link</h3>
                            {project.offer_id && (
                                <Link to={`/offer/preview/${project.offer_id}`} className="text-[var(--primary)] hover:underline text-[12px] font-bold">
                                    Open Proposal <ExternalLink size={12} className="inline ml-1" />
                                </Link>
                            )}
                        </div>

                        <div className="p-6 flex flex-col gap-4">
                            {project.offer_id ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-[14px] font-bold text-[var(--text-main)]">{project.offer_name || 'Unnamed Offer'}</p>
                                            <p className="text-[12px] text-[var(--text-muted)]">ID: #{project.offer_id}</p>
                                        </div>
                                        <Badge variant={project.offer_status === 'signed' ? 'success' : 'warning'}>
                                            {project.offer_status === 'signed' ? 'Signed' : 'Pending'}
                                        </Badge>
                                    </div>
                                    <div className="text-2xl font-extrabold text-[var(--text-main)]">
                                        {formatCurrency(project.offer_total)}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-[13px] text-[var(--text-muted)] mb-3">No proposal linked.</p>
                                    <Select
                                        value={project.offer_id || ''}
                                        onChange={e => handleOfferChange(e.target.value)}
                                        options={[
                                            { value: '', label: 'Link Existing Proposal' },
                                            ...availableOffers.map(o => ({ value: o.id, label: o.offer_name || `#${o.id}` }))
                                        ]}
                                        className="bg-[var(--bg-main)]"
                                    />
                                    <div className="mt-3 relative py-2">
                                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[var(--border-subtle)]"></div></div>
                                        <span className="relative bg-white px-2 text-[10px] text-[var(--text-muted)] uppercase">Or</span>
                                    </div>
                                    <Link to={`/offer/wizard?projectId=${id}${project.customer_id ? `&customerId=${project.customer_id}` : ''}`}>
                                        <Button variant="outline" size="sm" className="w-full mt-2">
                                            Create New Proposal
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </div>
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

// Simple Activity Timeline Component
const ActivityTimeline = ({ projectId }) => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        dataService.getProjectActivity(projectId).then(setEvents).finally(() => setLoading(false));
    }, [projectId]);

    if (loading) return <div className="text-[13px] text-[var(--text-muted)]">Loading activity...</div>;
    if (events.length === 0) return <div className="text-[13px] text-[var(--text-muted)]">No activity recorded.</div>;

    return (
        <div className="relative pl-4 border-l border-[var(--border-subtle)] space-y-6">
            {events.map((e, i) => (
                <div key={i} className="relative">
                    <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white ${e.event_type === 'signed' ? 'bg-[var(--success)]' :
                        e.event_type === 'status_change' ? 'bg-[var(--primary)]' : 'bg-[var(--text-muted)]'
                        }`}></div>
                    <p className="text-[13px] font-medium text-[var(--text-main)]">{e.comment || e.event_type}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{new Date(e.created_at).toLocaleString()}</p>
                </div>
            ))}
        </div>
    );
};

export default ProjectDetailPage;
