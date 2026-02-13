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
import { Plus, Briefcase, FileText } from 'lucide-react';

const ProjectsPage = () => {
    const { t } = useI18n();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [filterText, setFilterText] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Sort state
    const [sortField, setSortField] = useState('name');
    const [sortDir, setSortDir] = useState('asc');

    const STATUS_OPTIONS = ['active', 'completed', 'on_hold', 'cancelled'];
    const STATUS_LABELS = {
        active: 'Active',
        completed: 'Completed',
        on_hold: 'On Hold',
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
        const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
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
                    <Button onClick={() => setIsCreateModalOpen(true)} className="btn-primary shadow-sm">
                        <Plus size={18} /> New Project
                    </Button>
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
                    ['all', ...STATUS_OPTIONS].map(s => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={`px-3 py-1.5 rounded-[var(--radius-md)] text-[13px] font-medium transition-all border ${filterStatus === s
                                ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-[var(--shadow-sm)]'
                                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-medium)] hover:text-[var(--text-main)]'
                                }`}
                        >
                            {STATUS_LABELS[s] || s}
                        </button>
                    ))
                }
            />

            {/* Block 3: Table */}
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
                        <tr key={project.id} className="hover:bg-[var(--bg-app)] transition-colors group border-b border-[var(--border-subtle)] last:border-0 text-left align-middle h-14">
                            <td className="py-3 px-6">
                                <Link to={`/projects/${project.id}`} className="font-bold text-[14px] text-[var(--text-main)] hover:text-[var(--primary)] transition-colors">
                                    {project.name || 'Unnamed Project'}
                                </Link>
                            </td>
                            <td className="py-3 px-6 text-[14px] font-medium text-[var(--text-secondary)]">
                                {project.customer_name || <span className="text-[var(--text-muted)] opacity-50">—</span>}
                            </td>
                            <td className="py-3 px-6">
                                <StatusPill status={project.status} label={STATUS_LABELS[project.status]} />
                            </td>
                            <td className="py-3 px-6">
                                <DueStatusIndicator dueDate={project.deadline} />
                            </td>
                            <td className="py-3 px-6">
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

            <CreateProjectModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={loadProjects}
            />
        </div>
    );
};

export default ProjectsPage;
