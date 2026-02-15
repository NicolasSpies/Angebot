import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import { dataService } from '../data/dataService';
import { formatCurrency } from '../utils/pricingEngine';
import {
    ArrowLeft, Plus, Trash2, CheckCircle, Circle,
    ExternalLink, Save, Calendar, Clock, DollarSign,
    Zap, FileText, MoreVertical, Box, Pencil, Globe,
    AlertTriangle, Link as LinkIcon, CheckSquare,
    User, File
} from 'lucide-react';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import LinkOfferModal from '../components/LinkOfferModal';
import StatusSelect from '../components/ui/StatusSelect';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import Badge from '../components/ui/Badge';
import StatusPill from '../components/ui/StatusPill';
import AttachmentSection from '../components/common/AttachmentSection';
import ReviewsCard from '../components/projects/ReviewsCard';

const STATUS_OPTIONS = ['todo', 'in_progress', 'feedback', 'done', 'cancelled'];
const STATUS_LABELS = {
    todo: 'To Do', in_progress: 'In Progress', feedback: 'Feedback', done: 'Done', cancelled: 'Cancelled'
};
const PRIORITY_OPTIONS = ['low', 'medium', 'high'];
const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High' };

const ProjectDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useI18n();

    // Data State
    const [project, setProject] = useState(null);
    const [customer, setCustomer] = useState(null);
    const [offer, setOffer] = useState(null);
    const [allCustomers, setAllCustomers] = useState([]);
    const [allOffers, setAllOffers] = useState([]);

    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isLinkOfferModalOpen, setIsLinkOfferModalOpen] = useState(false);

    // Notes State
    const [notes, setNotes] = useState('');
    const [notesSaving, setNotesSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const autosaveTimerRef = useRef(null);

    // Task State
    const [newTaskTitle, setNewTaskTitle] = useState('');

    const loadProject = useCallback(async () => {
        setIsLoading(true);
        try {
            const projectData = await dataService.getProject(id);
            setProject(projectData);
            setNotes(projectData.internal_notes || '');
            setLastSaved(projectData.updated_at);

            // Load Linked Data
            const [customers, offers] = await Promise.all([
                dataService.getCustomers(),
                dataService.getOffers()
            ]);
            setAllCustomers(customers);
            setAllOffers(offers);

            if (projectData.customer_id) {
                setCustomer(customers.find(c => c.id === projectData.customer_id));
            }
            if (projectData.offer_id) {
                const offerData = await dataService.getOffer(projectData.offer_id);
                setOffer(offerData);
            }
        } catch (err) {
            console.error('Failed to load project data', err);
        }
        setIsLoading(false);
    }, [id]);

    useEffect(() => { loadProject(); }, [loadProject]);

    // --- Actions ---

    const handleUpdateProject = async (updates) => {
        const updated = { ...project, ...updates };
        setProject(updated); // Optimistic
        try {
            await dataService.updateProject(id, updated);
        } catch (error) {
            console.error('Update failed', error);
            loadProject(); // Revert on error
        }
    };

    const handleLinkOffer = async (selectedOffer) => {
        setIsLinkOfferModalOpen(false);
        setIsLoading(true);

        try {
            // Customer Mismatch Check
            if (selectedOffer.customer_id && project.customer_id && selectedOffer.customer_id !== project.customer_id) {
                const proceed = window.confirm(
                    `The offer "${selectedOffer.offer_name}" belongs to a different client. Do you want to link it anyway?\n\nThis will update the project's client to match the offer.`
                );
                if (!proceed) {
                    setIsLoading(false);
                    return;
                }
            }

            // Atomic-like update (Sequential for MVP)
            // 1. Update Project (Link Offer & Update Customer if needed)
            const projectUpdates = {
                offer_id: selectedOffer.id,
                ...(selectedOffer.customer_id ? { customer_id: selectedOffer.customer_id } : {})
            };
            await dataService.updateProject(id, projectUpdates);

            // 2. Update Offer (Link Project)
            await dataService.updateOffer(selectedOffer.id, { project_id: id });

            // 3. Trigger Sync explicitly to ensure status updates (Sent -> Pending, etc)
            // The updateProject call above already triggers syncOfferWithProject (notes)
            // But we need to ensure the PROJECT status reacts to the OFFER status
            // dataService.syncProjectWithOffer contains the logic: if offer.status -> update project.status
            // We can simulate this by re-triggering a sync or just relying on the fact that we loaded the offer data

            // Re-fetch everything to ensure consistent state
            await loadProject();

        } catch (error) {
            console.error("Failed to link offer:", error);
            alert("Failed to link offer. Please try again.");
            setIsLoading(false);
        }
    };

    const handleNotesChange = (e) => {
        const newValue = e.target.value;
        setNotes(newValue);

        // Debounced Autosave
        if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = setTimeout(async () => {
            setNotesSaving(true);
            try {
                await dataService.updateProject(id, { ...project, internal_notes: newValue });
                setLastSaved(new Date().toISOString());
            } catch (error) {
                console.error('Autosave failed', error);
            }
            setNotesSaving(false);
        }, 1500);
    };

    const handleAddTask = async (e) => {
        if (e && e.key !== 'Enter') return;
        if (!newTaskTitle.trim()) return;

        try {
            await dataService.createTask(id, { title: newTaskTitle.trim() });
            setNewTaskTitle('');
            // Refresh logic - ideally we'd just append, but full reload ensures ID sync
            const refreshed = await dataService.getProject(id);
            setProject(refreshed);
        } catch (error) {
            console.error('Add task failed', error);
        }
    };

    const handleToggleTask = async (task) => {
        // Optimistic update
        const updatedTasks = project.tasks.map(t =>
            t.id === task.id ? { ...t, completed: !t.completed } : t
        );
        setProject({ ...project, tasks: updatedTasks });

        try {
            await dataService.updateTask(task.id, { completed: !task.completed });
        } catch (error) {
            loadProject();
        }
    };

    const handleDeleteTask = async (taskId) => {
        const updatedTasks = project.tasks.filter(t => t.id !== taskId);
        setProject({ ...project, tasks: updatedTasks });

        try {
            await dataService.deleteTask(taskId);
        } catch (error) {
            loadProject();
        }
    };

    const handleDeleteProject = async () => {
        try {
            await dataService.deleteProject(id);
            navigate('/projects');
        } catch (error) {
            console.error('Delete failed', error);
        }
    };

    if (isLoading) return <div className="page-container flex items-center justify-center min-h-[400px]">Loading project...</div>;
    if (!project) return <div className="page-container text-[var(--danger)]">Project not found.</div>;

    const completedTasks = (project.tasks || []).filter(t => t.completed).length;
    const totalTasks = (project.tasks || []).length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return (
        <div className="page-container" style={{ maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div className="mb-8">
                <Link to="/projects" className="inline-flex items-center gap-2 text-[13px] font-bold text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors mb-4 group">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Projects
                </Link>

                <div className="flex justify-between items-start gap-8">
                    <div className="flex-1 min-w-0">
                        {/* Inline Edit Title */}
                        <div className="group relative mb-2">
                            <input
                                type="text"
                                value={project.name || ''}
                                onChange={(e) => setProject({ ...project, name: e.target.value })}
                                onBlur={(e) => {
                                    if (e.target.value.trim() && e.target.value !== project.name) {
                                        handleUpdateProject({ name: e.target.value.trim() });
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') e.target.blur();
                                }}
                                className="text-3xl font-extrabold text-[var(--text-main)] w-full bg-transparent border-none p-0 focus:ring-0 truncate"
                            />
                            <Pencil size={16} className="absolute right-full top-1/2 -translate-y-1/2 mr-2 opacity-0 group-hover:opacity-50 text-[var(--text-muted)]" />
                        </div>

                        {/* Metadata Row */}
                        <div className="flex items-center gap-6 text-[13px] font-medium text-[var(--text-secondary)]">
                            <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${project.status === 'done' ? 'bg-[var(--success)]' : project.status === 'in_progress' ? 'bg-[var(--primary)]' : project.status === 'cancelled' ? 'bg-[var(--danger)]' : 'bg-[var(--warning)]'}`} />
                                <span className="uppercase tracking-wider font-bold">{STATUS_LABELS[project.status]}</span>
                            </div>

                            {customer && (
                                <Link to={`/customers/${customer.id}`} className="flex items-center gap-2 hover:text-[var(--primary)] transition-colors">
                                    <Globe size={14} className="text-[var(--text-muted)]" />
                                    {customer.company_name}
                                </Link>
                            )}

                            {offer && (
                                <Link to={`/offer/preview/${offer.id}`} className="flex items-center gap-2 hover:text-[var(--primary)] transition-colors">
                                    <FileText size={14} className="text-[var(--text-muted)]" />
                                    {offer.offer_name}
                                </Link>
                            )}

                            <span className="flex items-center gap-2 text-[var(--text-muted)]">
                                <Clock size={14} /> Created {new Date(project.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>

                    <Button variant="ghost" className="text-[var(--danger)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)]" onClick={() => setIsDeleteModalOpen(true)}>
                        <Trash2 size={18} />
                    </Button>
                </div>
            </div>

            {/* 2-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">

                {/* Left Column (Main) */}
                <div className="flex flex-col gap-8">

                    {/* Roadmap / Tasks */}
                    <Card padding="2rem" className="border-[var(--border)] shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[15px] font-extrabold text-[var(--text-main)] flex items-center gap-2">
                                <CheckSquare size={18} className="text-[var(--primary)]" />
                                Roadmap & Tasks
                            </h3>
                            {totalTasks > 0 && <Badge variant="neutral">{progress}% Complete</Badge>}
                        </div>

                        {/* Progress Bar */}
                        {totalTasks > 0 && (
                            <div className="mb-8">
                                <div className="h-2 w-full bg-[var(--bg-active)] rounded-full overflow-hidden flex">
                                    <div
                                        className="h-full bg-[var(--primary)] transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <div className="flex justify-between mt-2 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                                    <span>Start</span>
                                    <span>Finish</span>
                                </div>
                            </div>
                        )}

                        {/* Task List */}
                        <div className="space-y-1 mb-6">
                            {(project.tasks || []).length === 0 ? (
                                <div className="text-center py-8 border-2 border-dashed border-[var(--border)] rounded-xl">
                                    <div className="w-12 h-12 rounded-full bg-[var(--bg-active)] flex items-center justify-center mx-auto mb-3 text-[var(--text-muted)]">
                                        <CheckSquare size={20} />
                                    </div>
                                    <p className="text-[13px] font-medium text-[var(--text-muted)]">No tasks properly defined.</p>
                                </div>
                            ) : (
                                (project.tasks || []).map(task => (
                                    <div key={task.id} className="group flex items-start gap-3 p-3 hover:bg-[var(--bg-app)] rounded-lg transition-colors">
                                        <button
                                            onClick={() => handleToggleTask(task)}
                                            className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border transition-colors flex items-center justify-center ${task.completed ? 'bg-[var(--primary)] border-[var(--primary)] text-white' : 'border-[var(--border-strong)] hover:border-[var(--primary)]'}`}
                                        >
                                            {task.completed && <CheckCircle size={14} />}
                                        </button>
                                        <span className={`flex-1 text-[14px] leading-relaxed transition-all ${task.completed ? 'text-[var(--text-muted)] line-through decoration-2' : 'text-[var(--text-main)] font-medium'}`}>
                                            {task.title}
                                        </span>
                                        <button
                                            onClick={() => handleDeleteTask(task.id)}
                                            className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--danger)] transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Add Task */}
                        <div className="relative">
                            <Plus size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                            <input
                                type="text"
                                placeholder="Add a new task..."
                                className="w-full pl-10 pr-4 py-3 bg-[var(--bg-active)] border border-transparent focus:bg-white focus:border-[var(--primary)] rounded-lg text-[14px] font-medium transition-all outline-none"
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                onKeyDown={handleAddTask}
                            />
                        </div>
                    </Card>

                    {/* Strategic Notes */}
                    <Card padding="2rem" className="border-[var(--border)] shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-[var(--warning)]" />
                        <div className="flex justify-between items-center mb-6 pl-2">
                            <h3 className="text-[15px] font-extrabold text-[var(--text-main)] flex items-center gap-2">
                                <FileText size={18} className="text-[var(--warning-text)]" />
                                Strategic Notes
                            </h3>
                            <div className="flex items-center gap-2">
                                {notesSaving && <span className="text-[11px] text-[var(--text-muted)] animate-pulse">Saving...</span>}
                                {!notesSaving && lastSaved && <span className="text-[11px] text-[var(--text-muted)] opacity-50">Saved {new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                            </div>
                        </div>
                        <Textarea
                            value={notes}
                            onChange={handleNotesChange}
                            placeholder="Capture internal strategic notes, risks, or key requirements..."
                            className="min-h-[200px] bg-[var(--bg-active)]/50 border-none focus:bg-white focus:ring-1 focus:ring-[var(--warning)] resize-none text-[15px] leading-relaxed"
                        />
                        <div className="mt-2 flex items-center gap-2 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider pl-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                            Private & Internal Only
                        </div>
                    </Card>

                    {/* Activity Timeline */}
                    <Card padding="2rem" className="border-[var(--border)]">
                        <h3 className="text-[15px] font-bold text-[var(--text-main)] mb-6">Project Activity</h3>
                        <ActivityTimeline projectId={id} />
                    </Card>

                </div>

                {/* Right Column (Sidebar) */}
                <div className="flex flex-col gap-6">

                    {/* Execution & Cycle */}
                    <Card padding="1.5rem" className="border-[var(--border)] shadow-md bg-gradient-to-br from-white to-[var(--bg-app)]">
                        <h3 className="text-[11px] font-black uppercase text-[var(--text-muted)] tracking-widest mb-6 border-b border-[var(--border)] pb-2">Execution & Cycle</h3>

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[12px] font-bold text-[var(--text-secondary)]">Current Phase</label>
                                <Select
                                    value={project.status}
                                    onChange={(e) => handleUpdateProject({ status: e.target.value })}
                                    options={STATUS_OPTIONS.map(s => ({ value: s, label: STATUS_LABELS[s] }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[12px] font-bold text-[var(--text-secondary)]">Priority Level</label>
                                <Select
                                    value={project.priority || 'medium'}
                                    onChange={(e) => handleUpdateProject({ priority: e.target.value })}
                                    options={PRIORITY_OPTIONS.map(p => ({ value: p, label: PRIORITY_LABELS[p] }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[12px] font-bold text-[var(--text-secondary)]">Target Delivery</label>
                                <input
                                    type="date"
                                    className="w-full px-3 py-2 bg-white border border-[var(--border)] rounded-md text-[14px] font-medium focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                                    value={project.deadline ? project.deadline.split('T')[0] : ''}
                                    onChange={(e) => handleUpdateProject({ deadline: e.target.value || null })}
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Linked Customer */}
                    <Card padding="1.5rem" className="border-[var(--border)] shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3 text-[var(--primary)]">
                                <User size={18} />
                                <h3 className="text-[13px] font-bold uppercase tracking-wider text-[var(--text-main)]">Client Entity</h3>
                            </div>
                            {!customer && (
                                <Select
                                    className="w-40 text-[11px]"
                                    value=""
                                    onChange={async (e) => {
                                        if (!e.target.value) return;
                                        await handleUpdateProject({ customer_id: parseInt(e.target.value) });
                                        loadProject();
                                    }}
                                    options={[
                                        { value: '', label: 'Link Client...' },
                                        ...allCustomers.map(c => ({ value: c.id, label: c.company_name }))
                                    ]}
                                />
                            )}
                            {customer && (
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-[var(--text-muted)] hover:text-[var(--danger)]" onClick={() => handleUpdateProject({ customer_id: null }).then(loadProject)}>
                                    <Trash2 size={12} />
                                </Button>
                            )}
                        </div>
                        {customer ? (
                            <div>
                                <Link to={`/customers/${customer.id}`} className="block text-[15px] font-extrabold text-[var(--text-main)] hover:text-[var(--primary)] mb-1">
                                    {customer.company_name}
                                </Link>
                                <div className="text-[13px] text-[var(--text-secondary)]">
                                    {customer.first_name} {customer.last_name}
                                </div>
                                <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex gap-2">
                                    <Badge variant="neutral">{customer.country}</Badge>
                                </div>
                            </div>
                        ) : (
                            <div className="text-[13px] text-[var(--text-muted)] italic">No client linked. Select a client to enable offer creation.</div>
                        )}
                    </Card>

                    {/* Linked Offer */}
                    <Card padding="1.5rem" className="border-[var(--border)] shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3 text-[var(--primary)]">
                                <FileText size={18} />
                                <h3 className="text-[13px] font-bold uppercase tracking-wider text-[var(--text-main)]">Strategic Basis</h3>
                            </div>
                            {offer && (
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-[var(--text-muted)] hover:text-[var(--danger)]" onClick={() => handleUpdateProject({ offer_id: null }).then(() => { setOffer(null); loadProject(); })}>
                                    <Trash2 size={12} />
                                </Button>
                            )}
                        </div>
                        {offer ? (
                            <div>
                                <Link to={`/offer/preview/${offer.id}`} className="block text-[15px] font-extrabold text-[var(--text-main)] hover:text-[var(--primary)] mb-1 break-words">
                                    {offer.offer_name}
                                </Link>
                                <div className="text-[13px] font-bold text-[var(--text-secondary)] mb-3">
                                    {formatCurrency(offer.total)}
                                </div>
                                <StatusPill status={offer.status} />

                                {/* Quick Actions */}
                                <div className="mt-6 space-y-2">
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start text-[13px] h-8"
                                        onClick={() => navigate(`/offer/preview/${offer.id}`)}
                                    >
                                        <ExternalLink size={14} className="mr-2" /> View Proposal
                                    </Button>
                                    {offer.token && (
                                        <Button
                                            variant="ghost"
                                            className="w-full justify-start text-[13px] h-8"
                                            onClick={() => window.open(`/offer/sign/${offer.token}`, '_blank')}
                                        >
                                            <LinkIcon size={14} className="mr-2" /> Open Signing Page
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="text-[13px] text-[var(--text-muted)] italic">No offer linked.</div>
                                <div className="flex flex-col gap-2">
                                    <Button
                                        onClick={async () => {
                                            if (!customer) { alert('Please link a client first.'); return; }
                                            const newOffer = await dataService.createOfferFromProject(project);
                                            navigate(`/offer/edit/${newOffer.id}`);
                                        }}
                                        className="w-full btn-primary text-[13px]"
                                        disabled={!customer}
                                        title={!customer ? "Link a client first" : ""}
                                    >
                                        <Plus size={14} className="mr-2" /> Create New Offer
                                    </Button>

                                    <Button
                                        variant="secondary"
                                        className="w-full text-[13px] bg-white border-[var(--border)] shadow-sm hover:bg-[var(--bg-app)]"
                                        onClick={() => setIsLinkOfferModalOpen(true)}
                                    >
                                        <LinkIcon size={14} className="mr-2" /> Link Existing Offer
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Reviews Management */}
                    <ReviewsCard projectId={id} />

                    {/* Attachments Section */}
                    <AttachmentSection entityType="projects" entityId={id} />
                </div>
            </div>

            <ConfirmationDialog
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteProject}
                title="Archive Project?"
                message={`Are you sure you want to archive "${project.name}"? This action cannot be undone.`}
                confirmText="Archive Project"
                isDestructive={true}
            />

            <LinkOfferModal
                isOpen={isLinkOfferModalOpen}
                onClose={() => setIsLinkOfferModalOpen(false)}
                onLink={handleLinkOffer}
                offers={allOffers}
                customerId={customer?.id}
                currentOfferId={project.offer_id}
            />
        </div>
    );
};

// Activity Component
const ActivityTimeline = ({ projectId }) => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        dataService.getProjectActivity(projectId)
            .then(data => {
                setEvents(Array.isArray(data) ? data : []);
            })
            .catch(() => setEvents([]))
            .finally(() => setLoading(false));
    }, [projectId]);

    if (loading) return <div className="text-[13px] text-[var(--text-muted)]">Loading activity...</div>;
    if (!events || events.length === 0) return <div className="text-[13px] text-[var(--text-muted)]">No activity recorded.</div>;

    return (
        <div className="relative pl-4 border-l border-[var(--border-subtle)] space-y-6">
            {events.map((e, i) => (
                <div key={i} className="relative">
                    <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white ${e.event_type === 'signed' ? 'bg-[var(--success)]' :
                        e.event_type === 'status_change' ? 'bg-[var(--primary)]' :
                            e.event_type === 'created' ? 'bg-[var(--text-main)]' : 'bg-[var(--text-muted)]'
                        }`}></div>
                    <p className="text-[13px] font-medium text-[var(--text-main)]">{e.comment || e.event_type}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{new Date(e.created_at).toLocaleString()}</p>
                </div>
            ))}
        </div>
    );
};

export default ProjectDetailPage;
