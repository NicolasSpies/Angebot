import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import { dataService } from '../data/dataService';
import { ArrowUpDown, Plus, Search, Filter } from 'lucide-react';
import CreateProjectModal from '../components/CreateProjectModal';
import { formatDateDash } from '../utils/dateUtils';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';

const STATUS_OPTIONS = ['pending', 'todo', 'in_progress', 'feedback', 'done', 'cancelled'];
const STATUS_LABELS = {
    pending: 'Pending',
    todo: 'To Do',
    in_progress: 'In Progress',
    feedback: 'Feedback',
    done: 'Done',
    cancelled: 'Cancelled'
};
const STATUS_VARIANTS = {
    pending: 'warning',
    todo: 'primary',
    in_progress: 'warning',
    feedback: 'info',
    done: 'success',
    cancelled: 'danger'
};

const ProjectsPage = () => {
    const { t } = useI18n();
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [sortField, setSortField] = useState('created_at');
    const [sortDir, setSortDir] = useState('desc');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [filterText, setFilterText] = useState('');

    const loadProjects = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await dataService.getProjects();
            setProjects(data);
        } catch (err) {
            console.error('Failed to load projects', err);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        loadProjects();
    }, [loadProjects]);

    const handleUpdateStatus = async (id, newStatus) => {
        setProjects(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
        try {
            await dataService.updateProject(id, { status: newStatus });
        } catch (error) {
            console.error('Failed to update status', error);
            loadProjects();
        }
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    const filtered = projects.filter(p => {
        const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
        const matchesText = filterText === '' ||
            (p.name && p.name.toLowerCase().includes(filterText.toLowerCase())) ||
            (p.customer_name && p.customer_name.toLowerCase().includes(filterText.toLowerCase()));
        return matchesStatus && matchesText;
    });

    const sorted = [...filtered].sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        if (sortField === 'deadline') {
            return ((a.deadline || '') > (b.deadline || '') ? 1 : -1) * dir;
        }
        if (sortField === 'status') {
            return (STATUS_OPTIONS.indexOf(a.status) - STATUS_OPTIONS.indexOf(b.status)) * dir;
        }
        return ((a[sortField] || '') > (b[sortField] || '') ? 1 : -1) * dir;
    });

    if (isLoading) return <div className="page-container">Loading...</div>;

    return (
        <div className="page-container">
            <div className="flex justify-between items-center mb-4">
                <h1 className="page-title" style={{ marginBottom: 0 }}>{t('nav.projects')}</h1>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                    <Plus size={18} style={{ marginRight: '0.5rem' }} /> New Project
                </Button>
            </div>

            <Card className="mb-4" padding="0.75rem">
                <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-muted" />
                        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '4px' }} className="no-scrollbar">
                            {['all', ...STATUS_OPTIONS].map(s => (
                                <Button
                                    key={s}
                                    variant={filterStatus === s ? 'primary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setFilterStatus(s)}
                                    style={{ whiteSpace: 'nowrap', minWidth: 'auto', padding: '0.25rem 0.75rem' }}
                                >
                                    {s === 'all' ? 'All' : STATUS_LABELS[s]}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <div style={{ position: 'relative', width: '280px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <Input
                            placeholder="Search projects or clients..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            style={{ paddingLeft: '2.5rem', marginBottom: 0 }}
                        />
                    </div>
                </div>
            </Card>

            <Card padding="0">
                <Table headers={[
                    <div onClick={() => handleSort('name')} className="flex items-center gap-2 cursor-pointer">
                        Project {sortField === 'name' && <ArrowUpDown size={12} />}
                    </div>,
                    <div onClick={() => handleSort('status')} className="flex items-center gap-2 cursor-pointer">
                        Status {sortField === 'status' && <ArrowUpDown size={12} />}
                    </div>,
                    <div onClick={() => handleSort('deadline')} className="flex items-center gap-2 cursor-pointer">
                        Deadline {sortField === 'deadline' && <ArrowUpDown size={12} />}
                    </div>,
                    'Customer',
                    'Linked Offer'
                ]}>
                    {sorted.length === 0 && (
                        <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                                No projects found matching your criteria.
                            </td>
                        </tr>
                    )}
                    {sorted.map(project => (
                        <tr key={project.id}>
                            <td>
                                <Link to={`/projects/${project.id}`} style={{ color: 'var(--text-main)', fontWeight: 600, textDecoration: 'none' }} className="hover:text-primary transition-colors">
                                    {project.name || <span className="text-muted italic">Untitled Project #{project.id}</span>}
                                </Link>
                                {project.internal_notes && (
                                    <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.125rem', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {project.internal_notes}
                                    </p>
                                )}
                            </td>
                            <td>
                                <div style={{ width: '140px' }}>
                                    <Select
                                        value={project.status}
                                        onChange={(e) => handleUpdateStatus(project.id, e.target.value)}
                                        options={STATUS_OPTIONS.map(s => ({ value: s, label: STATUS_LABELS[s] }))}
                                        style={{ margin: 0, padding: '0.25rem' }}
                                    />
                                </div>
                            </td>
                            <td>
                                <span className="text-sm">
                                    {formatDateDash(project.deadline, true)}
                                </span>
                            </td>
                            <td className="text-secondary">
                                {project.customer_name || '—'}
                            </td>
                            <td>
                                {project.offer_id ? (
                                    <Link to={`/offer/preview/${project.offer_id}`} className="text-sm font-semibold" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                                        {project.offer_name || `#${project.offer_id}`}
                                    </Link>
                                ) : (
                                    <span className="text-xs text-muted">No offer</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </Table>
            </Card>

            <CreateProjectModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={loadProjects}
            />
        </div>
    );
};

export default ProjectsPage;
