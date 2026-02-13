import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import { dataService } from '../data/dataService';
import { formatCurrency } from '../utils/pricingEngine';
import { ArrowLeft, Plus, Trash2, CheckCircle, Circle, ExternalLink, Save, Calendar, Clock, DollarSign, Zap } from 'lucide-react';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import Badge from '../components/ui/Badge';

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
    const availableOffers = project.customer_id
        ? offers.filter(o => o.customer_id === project.customer_id)
        : offers;

    return (
        <div className="page-container" style={{ maxWidth: '1100px' }}>
            {/* Header / Breadcrumb */}
            <div className="mb-4">
                <Link to="/projects" className="flex items-center gap-2 text-sm text-muted mb-2" style={{ textDecoration: 'none' }}>
                    <ArrowLeft size={16} /> Back to Projects
                </Link>
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>{project.name}</h1>
                        <div className="flex items-center gap-2">
                            <Badge variant={project.status === 'done' ? 'success' : 'warning'}>
                                {STATUS_LABELS[project.status]}
                            </Badge>
                            <span className="text-xs text-muted">ID: #{project.id}</span>
                        </div>
                    </div>
                    <Button variant="ghost" onClick={() => setIsDeleteModalOpen(true)} className="text-danger flex items-center gap-2">
                        <Trash2 size={18} /> Delete
                    </Button>
                </div>
            </div>

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>
                <div className="flex flex-column gap-4">
                    {/* Tasks Section */}
                    <Card>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold uppercase text-muted">Tasks ({completedTasks}/{totalTasks})</h3>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', marginBottom: '1.5rem', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%',
                                background: 'var(--primary)',
                                width: totalTasks > 0 ? `${(completedTasks / totalTasks) * 100}%` : '0%',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>

                        {/* Add Task Input */}
                        <div className="flex gap-2 mb-4">
                            <input
                                value={newTaskTitle}
                                onChange={e => setNewTaskTitle(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                                placeholder="Add a new task..."
                            />
                            <Button onClick={handleAddTask} disabled={!newTaskTitle.trim()} style={{ whiteSpace: 'nowrap' }}>
                                <Plus size={18} />
                            </Button>
                        </div>

                        {/* Task List */}
                        <div className="flex flex-column gap-2">
                            {(project.tasks || []).map(task => (
                                <div key={task.id} className="flex gap-3 p-3 border rounded-md" style={{ background: task.completed ? 'var(--bg-main)' : 'white', borderColor: 'var(--border)' }}>
                                    <button
                                        onClick={() => handleToggleTask(task)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: task.completed ? 'var(--success)' : 'var(--text-muted)', marginTop: '2px' }}
                                    >
                                        {task.completed ? <CheckCircle size={20} /> : <Circle size={20} />}
                                    </button>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        {editingTaskId === task.id ? (
                                            <div className="flex flex-column gap-3">
                                                <Input
                                                    value={editTaskValues.title}
                                                    onChange={e => setEditTaskValues({ ...editTaskValues, title: e.target.value })}
                                                    autoFocus
                                                />
                                                <Textarea
                                                    value={editTaskValues.description}
                                                    onChange={e => setEditTaskValues({ ...editTaskValues, description: e.target.value })}
                                                    placeholder="Description (optional)"
                                                    rows={2}
                                                />
                                                <div className="flex gap-3">
                                                    <Select
                                                        label="Priority"
                                                        value={editTaskValues.priority}
                                                        onChange={e => setEditTaskValues({ ...editTaskValues, priority: e.target.value })}
                                                        options={[
                                                            { value: 'low', label: 'Low' },
                                                            { value: 'medium', label: 'Medium' },
                                                            { value: 'high', label: 'High' }
                                                        ]}
                                                        style={{ marginBottom: 0 }}
                                                    />
                                                    <Input
                                                        type="date"
                                                        label="Due Date"
                                                        value={editTaskValues.due_date}
                                                        onChange={e => setEditTaskValues({ ...editTaskValues, due_date: e.target.value })}
                                                        style={{ marginBottom: 0 }}
                                                    />
                                                </div>
                                                <div className="flex gap-2 justify-end">
                                                    <Button variant="ghost" size="sm" onClick={() => setEditingTaskId(null)}>Cancel</Button>
                                                    <Button size="sm" onClick={() => handleSaveTask(task)}>Save Changes</Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div onClick={() => handleEditTask(task)} style={{ cursor: 'pointer' }}>
                                                <div className="flex items-center gap-2">
                                                    <span style={{ fontWeight: 600, textDecoration: task.completed ? 'line-through' : 'none', opacity: task.completed ? 0.5 : 1 }}>
                                                        {task.title}
                                                    </span>
                                                    {task.priority && task.priority !== 'medium' && (
                                                        <Badge variant={PRIORITY_VARIANTS[task.priority]} scale={0.8}>
                                                            {task.priority}
                                                        </Badge>
                                                    )}
                                                </div>
                                                {task.description && <p className="text-secondary text-sm mt-1">{task.description}</p>}
                                                <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                                                    {task.due_date && <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(task.due_date).toLocaleDateString()}</span>}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {editingTaskId !== task.id && (
                                        <button onClick={() => handleDeleteTask(task.id)} className="text-muted hover:text-danger" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {totalTasks === 0 && (
                                <div className="text-center py-8 text-muted italic">No tasks created yet.</div>
                            )}
                        </div>
                    </Card>

                    {/* Internal Notes */}
                    <Card>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold uppercase text-muted">Internal Notes</h3>
                            <Button variant="ghost" size="sm" onClick={handleSaveNotes} disabled={notesSaving} className="text-primary font-bold">
                                <Save size={16} style={{ marginRight: '4px' }} /> {notesSaving ? 'Saving...' : 'Save'}
                            </Button>
                        </div>
                        <Textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={6}
                            placeholder="Add internal notes... (Visible only to you)"
                        />
                    </Card>
                </div>

                {/* Sidebar Column */}
                <div className="flex flex-column gap-4">
                    {/* Project Config */}
                    <Card>
                        <h3 className="text-xs font-bold uppercase text-muted mb-4">Settings</h3>
                        <div className="flex flex-column gap-4">
                            <Select
                                label="Status"
                                value={project.status}
                                onChange={e => handleStatusChange(e.target.value)}
                                options={STATUS_OPTIONS.map(s => ({ value: s, label: STATUS_LABELS[s] }))}
                            />
                            <Input
                                type="date"
                                label="Target Deadline"
                                value={project.deadline ? project.deadline.split('T')[0] : ''}
                                onChange={e => handleDeadlineChange(e.target.value)}
                            />
                            <Select
                                label="Customer"
                                value={project.customer_id || ''}
                                onChange={e => handleCustomerChange(e.target.value)}
                                options={[
                                    { value: '', label: '-- None --' },
                                    ...customers.map(c => ({ value: c.id, label: c.company_name }))
                                ]}
                            />
                        </div>
                    </Card>

                    {/* Linked Offer */}
                    <Card className="flex flex-column">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-bold uppercase text-muted">Offer</h3>
                            {project.offer_id && (
                                <Link to={`/offer/preview/${project.offer_id}`} className="text-primary"><ExternalLink size={16} /></Link>
                            )}
                        </div>

                        <Select
                            value={project.offer_id || ''}
                            onChange={e => handleOfferChange(e.target.value)}
                            options={[
                                { value: '', label: 'Select an offer...' },
                                ...availableOffers.map(o => ({ value: o.id, label: o.offer_name || `#${o.id}` }))
                            ]}
                        />

                        {project.offer_id ? (
                            <div className="mt-2 p-3 bg-main rounded-md border">
                                <div className="text-xs text-muted font-bold uppercase mb-1">Total Value</div>
                                <div className="text-xl font-bold mb-2">{formatCurrency(project.offer_total)}</div>
                                <Badge variant={project.offer_status === 'signed' ? 'success' : 'warning'}>
                                    {project.offer_status.toUpperCase()}
                                </Badge>
                            </div>
                        ) : (
                            <div className="text-center py-4 text-muted text-sm">
                                <p>No offer linked.</p>
                                <Link to={`/offer/wizard?projectId=${id}${project.customer_id ? `&customerId=${project.customer_id}` : ''}`}>
                                    <Button variant="secondary" size="sm" className="w-full mt-3">Create New Offer</Button>
                                </Link>
                            </div>
                        )}
                    </Card>

                    {/* Insights Block */}
                    <Card style={{ background: 'var(--primary-light)', borderColor: 'rgba(79, 70, 229, 0.2)' }}>
                        <h4 className="flex items-center gap-2 text-xs font-bold uppercase text-primary mb-2">
                            <Zap size={14} /> Quick Action
                        </h4>
                        <p className="text-xs text-secondary mb-3">Keep your project data in sync by linking the correct customer and offer.</p>
                        <Button variant="primary" size="sm" className="w-full" onClick={() => navigate(`/offer/preview/${project.offer_id}`)} disabled={!project.offer_id}>
                            Preview Signed Offer
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
