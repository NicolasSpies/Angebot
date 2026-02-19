import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { dataService } from '../data/dataService';
import logger from '../utils/logger';
import { getStatusColor } from '../utils/statusColors';
import { formatCurrency } from '../utils/pricingEngine';
import {
    ArrowLeft, Plus, Trash2, CheckCircle,
    ExternalLink, Clock, FileText, Pencil, Globe,
    Link as LinkIcon, CheckSquare, AlertTriangle, Truck
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
import ReviewsCard from '../components/projects/ReviewsCard';
import { formatDate } from '../utils/dateUtils';

const STATUS_OPTIONS = ['todo', 'in_progress', 'feedback', 'done', 'cancelled'];
const STATUS_LABELS = {
    todo: 'To Do', in_progress: 'In Progress', feedback: 'Feedback', done: 'Done', cancelled: 'Cancelled'
};

import SearchablePicker from '../components/ui/SearchablePicker';
import SimpleDatePicker from '../components/ui/SimpleDatePicker';
import { toast } from 'react-hot-toast';

const ProjectDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Data State
    const [project, setProject] = useState(null);
    const [customer, setCustomer] = useState(null);
    const [offer, setOffer] = useState(null);
    const [allCustomers, setAllCustomers] = useState([]);
    const [allOffers, setAllOffers] = useState([]);

    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isMismatchDialogOpen, setIsMismatchDialogOpen] = useState(false);
    const [pendingOffer, setPendingOffer] = useState(null);
    const [newLink, setNewLink] = useState({ label: '', url: '' });

    // Notes State
    const [notes, setNotes] = useState('');
    const [notesSaving, setNotesSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const autosaveTimerRef = useRef(null);
    // Name Auto-save State
    const [nameSaving, setNameSaving] = useState(false);
    const [nameError, setNameError] = useState(null);
    const nameAutosaveTimerRef = useRef(null);
    const inFlightNameUpdateRef = useRef(null);

    // Task State
    const [newTaskTitle, setNewTaskTitle] = useState('');

    const loadProject = useCallback(async () => {
        if (!id) {
            setError('Missing Project ID');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        logger.data('Loading project', { projectId: id });

        try {
            const projectData = await dataService.getProject(id);
            if (!projectData) {
                setError('Project not found');
                return;
            }

            setProject(projectData);
            setNotes(projectData.strategic_notes || projectData.internal_notes || '');
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
                try {
                    const offerData = await dataService.getOffer(projectData.offer_id);
                    setOffer(offerData);
                } catch (offerErr) {
                    logger.warn('WIZARD', 'Failed to load linked offer', { offerId: projectData.offer_id, error: offerErr });
                    setOffer(null);
                }
            } else {
                setOffer(null);
            }
        } catch (err) {
            logger.error('DATA', 'Failed to load project data', err);
            setError('Failed to load project details');
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => { loadProject(); }, [loadProject]);

    // --- Actions ---

    const handleUpdateProject = async (updates) => {
        try {
            const response = await dataService.updateProject(id, updates);
            if (response.success && response.project) {
                setProject(response.project);
                // Also update customer/offer if they changed
                if (updates.customer_id !== undefined) {
                    setCustomer(allCustomers.find(c => c.id === updates.customer_id) || null);
                }
                if (updates.offer_id !== undefined) {
                    if (updates.offer_id === null) {
                        setOffer(null);
                    } else {
                        const offerData = await dataService.getOffer(updates.offer_id);
                        setOffer(offerData);
                    }
                }
            }
            return true;
        } catch (error) {
            console.error('Update failed', error);
            toast.error(error.message || 'Failed to update project');
            loadProject(); // Revert on error
            return false;
        }
    };

    const saveProjectName = async (newName) => {
        if (!newName.trim()) return;

        // Cancel in-flight
        if (inFlightNameUpdateRef.current) {
            // No direct cancellation in dataService yet, but we skip the state update
        }

        setNameSaving(true);
        setNameError(null);

        try {
            const updatePromise = dataService.updateProject(id, { name: newName.trim() });
            inFlightNameUpdateRef.current = updatePromise;
            await updatePromise;
            setLastSaved(new Date().toISOString());
        } catch (error) {
            setNameError('Failed to save name');
        } finally {
            setNameSaving(false);
            inFlightNameUpdateRef.current = null;
        }
    };

    const handleNameChange = (e) => {
        const val = e.target.value;
        setProject(prev => ({ ...prev, name: val }));

        if (nameAutosaveTimerRef.current) clearTimeout(nameAutosaveTimerRef.current);
        nameAutosaveTimerRef.current = setTimeout(() => {
            saveProjectName(val);
        }, 600);
    };

    const handleNameBlur = () => {
        if (nameAutosaveTimerRef.current) clearTimeout(nameAutosaveTimerRef.current);
        saveProjectName(project.name);
    };

    const handleLinkOffer = async (selectedOffer) => {
        setIsLoading(true);

        try {
            if (selectedOffer.customer_id && project.customer_id && selectedOffer.customer_id !== project.customer_id) {
                setPendingOffer(selectedOffer);
                setIsMismatchDialogOpen(true);
                setIsLoading(false);
                return;
            }

            await executeLinkOffer(selectedOffer);
        } catch (error) {
            console.error("Failed to link offer:", error);
            toast.error("Failed to link offer. Please try again.");
            setIsLoading(false);
        }
    };

    const executeLinkOffer = async (selectedOffer) => {
        setIsLoading(true);
        try {
            // Atomic-like update (Sequential for MVP)
            const projectUpdates = {
                offer_id: selectedOffer.id,
                ...(selectedOffer.customer_id ? { customer_id: selectedOffer.customer_id } : {})
            };
            await dataService.updateProject(id, projectUpdates);

            // Update Offer (Link Project)
            await dataService.updateOffer(selectedOffer.id, { project_id: id });

            // Re-fetch everything to ensure consistent state
            await loadProject();
            toast.success("Offer linked successfully");
        } catch (error) {
            console.error("Failed to link offer:", error);
            toast.error("Failed to link offer. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const confirmMismatchLink = () => {
        if (pendingOffer) {
            executeLinkOffer(pendingOffer);
            setPendingOffer(null);
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
                await dataService.updateProject(id, { strategic_notes: newValue, internal_notes: newValue });
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

    const handleAddTrackingLink = async () => {
        if (!newLink.url) return;
        try {
            const added = await dataService.addProjectTrackingLink(id, newLink);
            setProject(prev => ({
                ...prev,
                trackingLinks: [...(prev.trackingLinks || []), added]
            }));
            setNewLink({ label: '', url: '' });
            toast.success('Tracking link added');
        } catch (err) {
            toast.error('Failed to add tracking link');
        }
    };

    const handleDeleteTrackingLink = async (linkId) => {
        try {
            await dataService.deleteProjectTrackingLink(linkId);
            setProject(prev => ({
                ...prev,
                trackingLinks: (prev.trackingLinks || []).filter(l => l.id !== linkId)
            }));
            toast.success('Tracking link removed');
        } catch (err) {
            toast.error('Failed to remove tracking link');
        }
    };

    if (isLoading) {
        return (
            <div className="page-container animate-pulse" style={{ maxWidth: '1400px', margin: '0 auto' }}>
                <div className="h-8 w-48 bg-slate-100 rounded mb-8" />
                <div className="h-12 w-full bg-slate-100 rounded-xl mb-12" />
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
                    <div className="space-y-8">
                        <div className="h-64 bg-slate-50 rounded-2xl" />
                        <div className="h-48 bg-slate-50 rounded-2xl" />
                    </div>
                    <div className="h-96 bg-slate-50 rounded-2xl" />
                </div>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="page-container flex flex-col items-center justify-center min-h-[500px] text-center" style={{ maxWidth: '1400px', margin: '0 auto' }}>
                <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mb-6">
                    <AlertTriangle size={40} />
                </div>
                <h1 className="text-2xl font-black text-[var(--text-main)] mb-2 uppercase tracking-tight">Project Not Found</h1>
                <p className="text-[var(--text-secondary)] font-medium mb-8 max-w-md">
                    {error || "We couldn't find the project you're looking for. It might have been deleted or the link is invalid."}
                </p>
                <div className="flex gap-4">
                    <Button variant="outline" onClick={() => navigate('/projects')}>Back to Projects</Button>
                    <Button onClick={() => window.location.reload()}>Retry</Button>
                </div>
            </div>
        );
    }

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
                            <div className="flex items-center gap-3">
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={project.name}
                                        onChange={handleNameChange}
                                        onBlur={handleNameBlur}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.target.blur();
                                            }
                                        }}
                                        placeholder="Enter Project Name"
                                        className="text-3xl font-extrabold text-[var(--text-main)] w-full bg-transparent border-none p-0 focus:ring-0 truncate"
                                    />
                                    {project.name === '' && <span className="absolute left-0 top-0 text-3xl font-extrabold text-[var(--text-muted)] pointer-events-none opacity-30">Unnamed Project</span>}
                                </div>

                                {nameSaving && <div className="animate-spin rounded-full h-3 w-3 border-[1px] border-[var(--primary)] border-t-transparent" />}
                                {nameError && <span className="text-[11px] font-bold text-[var(--danger)] uppercase tracking-wider">{nameError}</span>}
                            </div>
                        </div>

                        {/* Metadata Row */}
                        <div className="flex items-center gap-4 text-[13px] font-medium text-[var(--text-secondary)]">
                            <div className="flex items-center gap-2">
                                <span
                                    className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]"
                                    style={{ backgroundColor: project.status ? getStatusColor(project.status).dot : '#9CA3AF' }}
                                />
                                <span className="uppercase tracking-wider font-extrabold text-[11px] text-[var(--text-main)]">
                                    {project.status ? (STATUS_LABELS[project.status] || project.status.replace('_', ' ')) : 'Unknown'}
                                </span>
                            </div>

                            {/* Client Chip */}
                            {customer ? (
                                <div className="flex items-center gap-1.5 p-1 px-2.5 bg-[var(--bg-active)] hover:bg-[var(--bg-hover)] rounded-full border border-[var(--border)] transition-all group/chip">
                                    <div
                                        className="flex items-center gap-1.5 cursor-pointer hover:text-[var(--primary)] transition-colors"
                                        onClick={() => navigate(`/customers/${customer.id}`)}
                                    >
                                        <Globe size={14} className="text-[var(--text-muted)]" />
                                        <span className="font-bold text-[12px] text-[var(--text-main)]">{customer.company_name}</span>
                                    </div>
                                    <div className="w-px h-3 bg-[var(--border)] mx-1" />
                                    <SearchablePicker
                                        options={[
                                            { value: null, label: 'Unlink Client', color: 'var(--danger)' },
                                            ...allCustomers.map(c => ({ value: c.id, label: c.company_name, subLabel: c.email }))
                                        ]}
                                        value={project.customer_id}
                                        onChange={(opt) => handleUpdateProject({ customer_id: opt.value }).then(loadProject)}
                                        trigger={
                                            <div className="p-1 hover:bg-[var(--bg-app)] rounded-full transition-colors cursor-pointer">
                                                <Pencil size={12} className="text-[var(--text-muted)] group-hover/chip:text-[var(--primary)]" />
                                            </div>
                                        }
                                    />
                                </div>
                            ) : (
                                <SearchablePicker
                                    options={allCustomers.map(c => ({ value: c.id, label: c.company_name, subLabel: c.email }))}
                                    value={project.customer_id}
                                    onChange={(opt) => handleUpdateProject({ customer_id: opt.value }).then(loadProject)}
                                    trigger={
                                        <div className="flex items-center gap-2 text-[var(--primary)] font-bold hover:underline cursor-pointer">
                                            <Plus size={14} /> Link Client
                                        </div>
                                    }
                                />
                            )}

                            {/* Offer Chip */}
                            {offer ? (
                                <div className="flex items-center gap-1.5 p-1 px-2.5 bg-[var(--bg-active)] hover:bg-[var(--bg-hover)] rounded-full border border-[var(--border)] transition-all group/chip">
                                    <div
                                        className="flex items-center gap-1.5 cursor-pointer hover:text-[var(--primary)] transition-colors"
                                        onClick={() => navigate(`/offers/${offer.id}`)}
                                    >
                                        <FileText size={14} className="text-[var(--text-muted)]" />
                                        <span className="font-bold text-[12px] text-[var(--text-main)]">{offer.offer_name}</span>
                                    </div>
                                    <div className="w-px h-3 bg-[var(--border)] mx-1" />
                                    <SearchablePicker
                                        options={[
                                            { value: null, label: 'Unlink Offer', color: 'var(--danger)' },
                                            ...allOffers.filter(o => !project.offer_id || o.id !== project.offer_id).map(o => ({
                                                value: o.id,
                                                label: o.offer_name || `Offer #${o.id}`,
                                                subLabel: `${formatCurrency(o.total)} • Status: ${o.status || 'Draft'}`,
                                                data: o
                                            }))
                                        ]}
                                        value={project.offer_id}
                                        onChange={(opt) => {
                                            if (opt.value === null) {
                                                handleUpdateProject({ offer_id: null }).then(loadProject);
                                            } else {
                                                handleLinkOffer(opt.data);
                                            }
                                        }}
                                        placeholder="Search by offer name or ID..."
                                        trigger={
                                            <div className="p-1 hover:bg-[var(--bg-app)] rounded-full transition-colors cursor-pointer">
                                                <Pencil size={12} className="text-[var(--text-muted)] group-hover/chip:text-[var(--primary)]" />
                                            </div>
                                        }
                                    />
                                </div>
                            ) : (
                                <SearchablePicker
                                    options={allOffers.map(o => ({
                                        value: o.id,
                                        label: o.offer_name || `Offer #${o.id}`,
                                        subLabel: `${formatCurrency(o.total)} • Status: ${o.status || 'Draft'}`,
                                        data: o
                                    }))}
                                    value={project.offer_id}
                                    onChange={(opt) => handleLinkOffer(opt.data)}
                                    placeholder="Search by offer name or ID..."
                                    trigger={
                                        <div className="flex items-center gap-2 text-[var(--primary)] font-bold hover:underline cursor-pointer">
                                            <LinkIcon size={14} /> Link Offer
                                        </div>
                                    }
                                />
                            )}

                            <span className="flex items-center gap-2 text-[var(--text-muted)]">
                                <Clock size={14} /> Created {formatDate(project.created_at)}
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
                            <Plus size={16} className="absolute left-3 top-[22px] -translate-y-1/2 text-[var(--text-muted)] z-10" />
                            <Input
                                type="text"
                                placeholder="Add a new task..."
                                className="pl-6"
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
                                {notesSaving && <div className="animate-spin rounded-full h-3 w-3 border-[1px] border-[var(--warning)] border-t-transparent" />}
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
                                    options={[
                                        { value: 'todo', label: 'To Do', color: getStatusColor('todo').dot },
                                        { value: 'in_progress', label: 'In Progress', color: getStatusColor('in_progress').dot },
                                        { value: 'feedback', label: 'Feedback', color: getStatusColor('feedback').dot },
                                        { value: 'done', label: 'Done', color: getStatusColor('done').dot },
                                        { value: 'cancelled', label: 'Cancelled', color: getStatusColor('cancelled').dot }
                                    ]}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[12px] font-bold text-[var(--text-secondary)]">Target Delivery</label>
                                <SimpleDatePicker
                                    value={project.deadline && !isNaN(new Date(project.deadline).getTime()) ? new Date(project.deadline).toISOString().split('T')[0] : ''}
                                    onChange={(val) => handleUpdateProject({ deadline: val || null })}
                                />
                            </div>



                        </div>
                    </Card>

                    {/* Deliveries / Tracking Links */}
                    <Card padding="1.5rem" className="border-[var(--border)] shadow-md">
                        <div className="flex items-center justify-between mb-4 border-b border-[var(--border)] pb-2">
                            <h3 className="text-[11px] font-black uppercase text-[var(--text-muted)] tracking-widest flex items-center gap-2">
                                <Truck size={14} className="text-[var(--primary)]" />
                                Delivery Tracking
                            </h3>
                            <Badge variant="neutral" className="text-[9px]">{project.trackingLinks?.length || 0}</Badge>
                        </div>

                        <div className="space-y-2 mb-4">
                            {(project.trackingLinks || []).length === 0 ? (
                                <p className="text-[11px] text-[var(--text-muted)] italic py-2">No tracking links added.</p>
                            ) : (
                                project.trackingLinks.map(link => (
                                    <div key={link.id} className="group flex items-center justify-between p-2 hover:bg-[var(--bg-app)] rounded-lg transition-all border border-transparent hover:border-[var(--border-subtle)]">
                                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 flex-1 min-w-0">
                                            <div className="p-2 bg-[var(--bg-active)] rounded-lg text-[var(--primary)]">
                                                <ExternalLink size={14} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[12px] font-bold text-[var(--text-main)] truncate leading-tight">{link.label || 'Direct Link'}</p>
                                                <p className="text-[10px] text-[var(--text-muted)] truncate">{link.url}</p>
                                            </div>
                                        </a>
                                        <button
                                            onClick={() => handleDeleteTrackingLink(link.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-[var(--text-muted)] hover:text-[var(--danger)] transition-all"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="space-y-2 pt-4 border-t border-[var(--border)] border-dashed">
                            <Input
                                placeholder="Label (Optional)"
                                value={newLink.label}
                                onChange={e => setNewLink({ ...newLink, label: e.target.value })}
                                size="sm"
                                className="h-8 text-[12px]"
                            />
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Tracking URL..."
                                    value={newLink.url}
                                    onChange={e => setNewLink({ ...newLink, url: e.target.value })}
                                    size="sm"
                                    className="flex-1 h-8 text-[12px]"
                                />
                                <Button size="sm" onClick={handleAddTrackingLink} disabled={!newLink.url} className="h-8 px-2">
                                    <Plus size={14} />
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Reviews */}
                    <ReviewsCard projectId={id} />
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

            <ConfirmationDialog
                isOpen={isMismatchDialogOpen}
                onClose={() => { setIsMismatchDialogOpen(false); setPendingOffer(null); }}
                onConfirm={confirmMismatchLink}
                title="Client Mismatch"
                message={`The offer "${pendingOffer?.offer_name || `Offer #${pendingOffer?.id}`}" belongs to a different client. Do you want to link it anyway? This will update the project's client to match the offer.`}
                confirmText="Link & Update Client"
                isDestructive={false}
            />

        </div >
    );
};

export default ProjectDetailPage;
