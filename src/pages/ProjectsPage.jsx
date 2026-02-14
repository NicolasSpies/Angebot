import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import { dataService } from '../data/dataService';
import CreateProjectModal from '../components/CreateProjectModal';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import ListPageHeader from '../components/layout/ListPageHeader';
import ListPageToolbar from '../components/layout/ListPageToolbar';
import StatusPill from '../components/ui/StatusPill';
import DueStatusIndicator from '../components/ui/DueStatusIndicator';
import EmptyState from '../components/ui/EmptyState';
import ProjectKanban from '../components/projects/ProjectKanban';
import DropdownMenu from '../components/ui/DropdownMenu';
import { getStatusColor } from '../utils/statusColors';
import { Plus, Briefcase, FileText, LayoutGrid, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProjectsPage = () => {
    const { t } = useI18n();
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
    const [sortField, setSortField] = useState('name');
    const [sortDir, setSortDir] = useState('asc');

    const STATUS_OPTIONS = ['pending', 'todo', 'in_progress', 'feedback', 'done', 'cancelled'];
    const STATUS_LABELS = {
        pending: 'Pending',
        todo: 'To Do',
        in_progress: 'In Progress',
        feedback: 'Feedback',
        done: 'Done',
        cancelled: 'Cancelled',
        all: 'All Status'
    };

    const loadProjects = async () => {
        setLoading(true);
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
            // Optional: Show toast
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
        <div className="page-container fade-in">
            {/* Block 1: Title */}
            <ListPageHeader
                title={t('nav.projects')}
                description="Manage and track all customer projects in one place."
                action={
                    <div className="flex items-center gap-3">
                        <div className="flex bg-[var(--bg-subtle)] p-1 rounded-lg border border-[var(--border-subtle)]">
                            <button
                                onClick={() => handleViewModeChange('list')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                                title="List View"
                            >
                                <List size={18} />
                            </button>
                            <button
                                onClick={() => handleViewModeChange('kanban')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white shadow-sm text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                                title="Kanban View"
                            >
                                <LayoutGrid size={18} />
                            </button>
                        </div>
                        <Button onClick={() => setIsCreateModalOpen(true)} className="btn-primary shadow-sm">
                            <Plus size={18} /> New Project
                        </Button>
                    </div>
                }
            />

            {/* Block 2: Toolbar */}
            <ListPageToolbar
                searchProps={{
                    value: filterText,
                    onChange: setFilterText,
                    placeholder: "Search projects..."
                }}
                filters={
                    ['all', ...STATUS_OPTIONS].map(s => {
                        const isActive = filterStatus === s;
                        const statusColor = s === 'all' ? { bg: 'var(--primary)', text: 'white', dot: 'white' } : getStatusColor(s);

                        // Special case for 'All' to match OffersPage logic or keep it simple?
                        // "Pending is gray..." -> 'All' is usually neutral or primary.
                        // OffersPage used primary for active.
                        // Let's use the same logic as OffersPage for consistency.

                        return (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-3 py-1.5 rounded-full text-[13px] font-bold transition-all border flex items-center gap-2 ${isActive
                                    ? 'shadow-sm'
                                    : 'bg-transparent border-transparent hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                                    }`}
                                style={isActive ? {
                                    backgroundColor: s === 'all' ? 'var(--primary)' : statusColor.bg,
                                    color: s === 'all' ? 'white' : statusColor.text,
                                    borderColor: s === 'all' ? 'var(--primary)' : statusColor.bg
                                } : {}}
                            >
                                {isActive && s !== 'all' && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor.dot }} />}
                                {STATUS_LABELS[s] || s}
                            </button>
                        );
                    })
                }
            />

            {/* Block 3: Content */}
            {viewMode === 'list' ? (
                <Table headers={[
                    { label: 'Project Name', onClick: () => handleSort('name'), sortField: 'name', currentSort: sortField, sortDir },
                    { label: 'Customer', onClick: () => handleSort('customer_name'), sortField: 'customer_name', currentSort: sortField, sortDir },
                    { label: 'Status', onClick: () => handleSort('status'), sortField: 'status', currentSort: sortField, sortDir },
                    { label: 'Due Date', onClick: () => handleSort('deadline'), sortField: 'deadline', currentSort: sortField, sortDir },
                    { label: 'Linked Offer' }
                ]}>
                    {loading ? (
                        <tr><td colSpan={5} className="py-[var(--space-10)] text-center text-[var(--text-muted)]">Loading projects...</td></tr>
                    ) : (filteredProjects.length === 0) ? (
                        <tr>
                            <td colSpan={5}>
                                <EmptyState
                                    icon={Briefcase}
                                    title="No projects found"
                                    description={filterText ? "No projects match your search." : "Get started by creating a new project."}
                                    action={
                                        !filterText && (
                                            <Button onClick={() => setIsCreateModalOpen(true)} className="btn-primary shadow-sm mt-[var(--space-4)]">
                                                <Plus size={18} className="mr-[var(--space-2)]" /> Create Project
                                            </Button>
                                        )
                                    }
                                />
                            </td>
                        </tr>
                    ) : (
                        filteredProjects.map(project => (
                            <tr
                                key={project.id}
                                onClick={() => navigate(`/projects/${project.id}`)}
                                className="hover:bg-[var(--bg-app)] transition-colors group border-b border-[var(--border-subtle)] last:border-0 text-left align-middle h-14 cursor-pointer"
                            >
                                <td className="py-3 px-6">
                                    <span className="font-bold text-[14px] text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors">
                                        {project.name || 'Unnamed Project'}
                                    </span>
                                </td>
                                <td className="py-3 px-6 text-[14px] font-medium text-[var(--text-secondary)]">
                                    {project.customer_name || <span className="text-[var(--text-muted)] opacity-50">—</span>}
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
                                <td className="py-3 px-6">
                                    <DueStatusIndicator dueDate={project.deadline} />
                                </td>
                                <td className="py-3 px-6" onClick={(e) => e.stopPropagation()}>
                                    {project.offer_id ? (
                                        <Link to={`/offer/preview/${project.offer_id}`} className="inline-flex items-center gap-[var(--space-1)] px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--bg-app)] text-[var(--text-main)] text-[12px] font-bold hover:bg-[var(--primary)] hover:text-white transition-all shadow-[var(--shadow-sm)] border border-[var(--border-subtle)]">
                                            <FileText size={12} />
                                            {project.offer_name || `#${project.offer_id}`}
                                        </Link>
                                    ) : (
                                        <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider opacity-50">No Offer</span>
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                </Table>
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
