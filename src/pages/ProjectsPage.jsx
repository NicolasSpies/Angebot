import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dataService } from '../data/dataService';
import CreateProjectModal from '../components/CreateProjectModal';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import StatusPill from '../components/ui/StatusPill';
import DueStatusIndicator from '../components/ui/DueStatusIndicator';
import EmptyState from '../components/ui/EmptyState';
import ProjectKanban from '../components/projects/ProjectKanban';
import DropdownMenu from '../components/ui/DropdownMenu';
import { getStatusColor } from '../utils/statusColors';
import { Search, Plus, Briefcase, FileText, LayoutGrid, List, Calendar, Zap, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Select from '../components/ui/Select';

const ProjectsPage = () => {
    const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [filterText, setFilterText] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    // View Mode State (persisted)
    const [viewMode, setViewMode] = useState(() => localStorage.getItem('projectsViewMode') || 'list');

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Sort state
    const [sortField, setSortField] = useState('deadline');
    const [sortDir, setSortDir] = useState('asc');

    const PROJECT_STATUS_OPTIONS = [
        { value: 'all', label: 'All' },
        { value: 'todo', label: 'To Do' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'feedback', label: 'Feedback' },
        { value: 'done', label: 'Done' },
        { value: 'cancelled', label: 'Cancelled' }
    ];

    const STATUS_OPTIONS = ['todo', 'in_progress', 'feedback', 'done', 'cancelled'];
    const STATUS_LABELS = {
        todo: 'To Do',
        in_progress: 'In Progress',
        feedback: 'Feedback',
        done: 'Done',
        cancelled: 'Cancelled',
        all: 'All'
    };

    const loadProjects = async () => {
        // Only show loading if we have no projects at all
        if (projects.length === 0) setLoading(true);
        setError(null);
        try {
            const fetchedProjects = await dataService.getProjects();
            setProjects(fetchedProjects || []);
        } catch (err) {
            setError('Failed to load projects.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProjects();
    }, []);

    const handleViewModeChange = (mode) => {
        setViewMode(mode);
        localStorage.setItem('projectsViewMode', mode);
    };

    const handleStatusChange = async (id, newStatus) => {
        // Optimistic Update
        const originalProjects = [...projects];
        setProjects(projects.map(p => p.id === id ? { ...p, status: newStatus } : p));

        try {
            await dataService.updateProject(id, { status: newStatus });
        } catch (err) {
            console.error('Failed to update status', err);
            // Rollback
            setProjects(originalProjects);
        }
    };

    const handleDeadlineChange = async (id, newDeadline) => {
        // Optimistic Update
        const originalProjects = [...projects];
        setProjects(projects.map(p => p.id === id ? { ...p, deadline: newDeadline } : p));

        try {
            await dataService.updateProject(id, { deadline: newDeadline });
        } catch (err) {
            console.error('Failed to update deadline', err);
            // Rollback
            setProjects(originalProjects);
        }
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    const filteredProjects = projects.filter(project => {
        const matchesSearch = (project.name || '').toLowerCase().includes(filterText.toLowerCase()) ||
            (project.customer_name || '').toLowerCase().includes(filterText.toLowerCase());
        const matchesStatus = filterStatus === 'all' || (project.status || 'todo') === filterStatus;
        return matchesSearch && matchesStatus;
    }).sort((a, b) => {
        const aValue = a[sortField] || '';
        const bValue = b[sortField] || '';

        if (aValue < bValue) return sortDir === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });

    return (
        <div className="page-container fade-in max-w-[1600px] mx-auto pb-24">
            {/* Block 1: Standardized Top Bar */}
            <div className="flex items-center justify-between gap-6 mb-6">
                {/* LEFT: Segmented filter pills */}
                <div className="flex bg-[var(--bg-subtle)] p-1 rounded-xl border border-[var(--border-subtle)]">
                    {PROJECT_STATUS_OPTIONS.map(opt => {
                        const color = opt.value === 'all' ? 'var(--primary)' : getStatusColor(opt.value).dot;
                        return (
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
                                    backgroundColor: color,
                                } : {}}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>

                {/* RIGHT: Search + Actions */}
                <div className="flex items-center gap-4 flex-1 justify-end max-w-2xl">
                    <div className="relative flex-1 max-w-xs">
                        <input
                            type="text"
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            placeholder="Search projects..."
                            className="w-full h-9 pl-9 pr-4 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-xl text-[13px] font-medium outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition-all"
                        />
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex bg-[var(--bg-subtle)] p-1 rounded-xl border border-[var(--border-subtle)]">
                            <button
                                onClick={() => handleViewModeChange('list')}
                                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                                title="List View"
                            >
                                <List size={18} />
                            </button>
                            <button
                                onClick={() => handleViewModeChange('kanban')}
                                className={`p-1.5 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-white shadow-sm text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                                title="Kanban View"
                            >
                                <LayoutGrid size={18} />
                            </button>
                        </div>
                        <Button
                            size="sm"
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm hover:shadow-md transition-all whitespace-nowrap font-bold rounded-lg px-4 h-9"
                        >
                            <Plus size={16} className="mr-1.5" /> New Project
                        </Button>
                    </div>
                </div>
            </div>


            {/* Block 3: Content */}
            {viewMode === 'list' ? (
                <div className="bg-white rounded-xl border border-[var(--border-subtle)] shadow-sm overflow-hidden">
                    <Table headers={[
                        { label: 'Project Name', onClick: () => handleSort('name'), sortField: 'name', currentSort: sortField, sortDir, width: '30%' },
                        { label: 'Customer', onClick: () => handleSort('customer_name'), sortField: 'customer_name', currentSort: sortField, sortDir, width: '20%' },
                        { label: 'Status', onClick: () => handleSort('status'), sortField: 'status', currentSort: sortField, sortDir, width: '12%' },
                        { label: 'Latest Review', width: '18%' },
                        { label: 'Timeline', onClick: () => handleSort('deadline'), sortField: 'deadline', currentSort: sortField, sortDir, width: '15%' },
                        { label: 'Offer', width: '10%', align: 'center' }
                    ]}>
                        {loading ? (
                            <tr><td colSpan={5} className="py-[var(--space-10)] text-center text-[var(--text-muted)]">Loading projects...</td></tr>
                        ) : (filteredProjects.length === 0) ? (
                            <tr>
                                <td colSpan={5}>
                                    <div className="py-24">
                                        <EmptyState
                                            icon={Rocket}
                                            title={filterText ? "No projects found" : "Launch your first Project"}
                                            description={filterText ? "No projects match your search criteria." : "Create a new project to start tracking your work."}
                                            action={
                                                !filterText && (
                                                    <Button onClick={() => setIsCreateModalOpen(true)} className="btn-primary shadow-lg mt-6 px-8 py-3 h-auto text-md">
                                                        <Plus size={20} className="mr-2" /> Start New Project
                                                    </Button>
                                                )
                                            }
                                        />
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredProjects.map(project => (
                                <tr
                                    key={project.id}
                                    onClick={() => navigate(`/projects/${project.id}`)}
                                    className="hover:bg-[var(--bg-app)] transition-colors group border-b border-[var(--border-subtle)] last:border-0 text-left align-middle h-16 cursor-pointer"
                                >
                                    <td className="py-3 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-[var(--primary-light)] group-hover:text-[var(--primary)] transition-colors">
                                                <Briefcase size={16} />
                                            </div>
                                            <span className="font-bold text-[14px] text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors">
                                                {project.name || 'Unnamed Project'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-6 text-[14px] font-medium text-[var(--text-secondary)]">
                                        {project.customer_name ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full bg-[var(--bg-surface)] text-[10px] flex items-center justify-center font-bold text-[var(--text-muted)] border border-[var(--border-subtle)]">
                                                    {project.customer_name.substring(0, 1)}
                                                </div>
                                                {project.customer_name}
                                            </div>
                                        ) : <span className="text-[var(--text-muted)] opacity-50">—</span>}
                                    </td>
                                    <td className="py-3 px-6" onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu
                                            trigger={<button className="hover:opacity-80 transition-opacity"><StatusPill status={project.status || 'todo'} /></button>}
                                            actions={STATUS_OPTIONS.map(s => ({
                                                label: STATUS_LABELS[s],
                                                status: s,
                                                onClick: () => handleStatusChange(project.id, s)
                                            }))}
                                        />
                                    </td>
                                    <td className="py-3 px-6" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex flex-col gap-1 items-start">
                                            {project.latest_review_status ? (
                                                <Link
                                                    to={`/review/${project.latest_review_token}`}
                                                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        <StatusPill status={project.latest_review_status} hideWaitingOn={true} />
                                                        {project.latest_review_unread > 0 && (
                                                            <span className="flex items-center justify-center min-w-[14px] h-[14px] px-0.5 bg-red-500 text-white text-[8px] font-black rounded-full shadow-sm">
                                                                {project.latest_review_unread}
                                                            </span>
                                                        )}
                                                    </div>
                                                </Link>
                                            ) : (
                                                <span className="text-[11px] text-[var(--text-muted)] italic font-medium">No reviews</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3 px-6" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex flex-col gap-1 relative group/date">
                                            <div className="relative">
                                                {(() => {
                                                    if (!project.deadline) return <DueStatusIndicator dueDate={null} />;
                                                    const daysDiff = (new Date(project.deadline) - new Date()) / (1000 * 60 * 60 * 24);
                                                    let colorClass = "bg-[var(--success-bg)] text-[var(--success)] shadow-[0_0_10px_rgba(16,185,129,0.1)]";
                                                    if (daysDiff < 0) colorClass = "bg-[var(--danger-bg)] text-[var(--danger)] shadow-[0_0_10px_rgba(239,68,68,0.1)]";
                                                    else if (daysDiff < 7) colorClass = "bg-[var(--warning-bg)] text-[var(--warning)] shadow-[0_0_10px_rgba(245,158,11,0.1)]";

                                                    return (
                                                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border border-white/50 ${colorClass}`}>
                                                            <Calendar size={12} />
                                                            {new Date(project.deadline).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                                        </div>
                                                    );
                                                })()}
                                                <input
                                                    type="date"
                                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                    value={project.deadline && !isNaN(new Date(project.deadline).getTime()) ? new Date(project.deadline).toISOString().split('T')[0] : ''}
                                                    onChange={(e) => handleDeadlineChange(project.id, e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                                        {project.offer_id && Number(project.offer_id) > 0 ? (
                                            <Link
                                                to={`/offer/preview/${project.offer_id}`}
                                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--primary-light)] transition-all"
                                                title={project.offer_name || `#${project.offer_id}`}
                                            >
                                                <FileText size={16} />
                                            </Link>
                                        ) : (
                                            <span className="text-[var(--text-muted)] font-medium opacity-50">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </Table>
                </div>
            ) : (
                <ProjectKanban projects={filteredProjects} onStatusChange={handleStatusChange} />
            )}

            <CreateProjectModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={loadProjects}
            />
        </div>
    );
};

export default ProjectsPage;
