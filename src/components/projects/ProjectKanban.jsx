import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Calendar, GripVertical } from 'lucide-react';
import { getStatusColor } from '../../utils/statusColors';

const COLUMNS = [
    { id: 'pending', label: 'Pending' },
    { id: 'todo', label: 'To Do' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'feedback', label: 'Feedback' },
    { id: 'done', label: 'Done' },
    { id: 'cancelled', label: 'Cancelled' }
];

const ProjectKanban = ({ projects, onStatusChange }) => {
    const [draggingId, setDraggingId] = useState(null);

    const handleDragStart = (e, projectId) => {
        setDraggingId(projectId);
        e.dataTransfer.setData('projectId', projectId);
        e.dataTransfer.effectAllowed = 'move';
        // Hide preview by using a custom drag image or just opacity
        // e.target.style.opacity = '0.5';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, status) => {
        e.preventDefault();
        const projectId = e.dataTransfer.getData('projectId');
        if (projectId && onStatusChange) {
            onStatusChange(parseInt(projectId), status);
        }
        setDraggingId(null);
    };

    const getProjectsByStatus = (status) => {
        return projects.filter(p => (p.status || 'todo') === status);
    };

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-220px)] min-h-[500px]">
            {COLUMNS.map(col => {
                const statusColor = getStatusColor(col.id);
                return (
                    <div
                        key={col.id}
                        className="flex-shrink-0 w-80 flex flex-col bg-[var(--bg-subtle)] rounded-xl border transition-colors"
                        style={{ borderColor: 'var(--border-subtle)' }}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.id)}
                    >
                        {/* Header */}
                        <div
                            className="p-3 border-b flex items-center justify-between sticky top-0 z-10 rounded-t-xl"
                            style={{
                                backgroundColor: statusColor.bg,
                                borderColor: 'transparent',
                                color: statusColor.text
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColor.dot }}></span>
                                <span className="font-bold text-[14px]">{col.label}</span>
                                <span
                                    className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/50 border border-transparent"
                                >
                                    {getProjectsByStatus(col.id).length}
                                </span>
                            </div>
                        </div>

                        {/* Cards */}
                        <div className="p-3 flex-1 overflow-y-auto space-y-3 scrollbar-thin">
                            {getProjectsByStatus(col.id).map(project => (
                                <div
                                    key={project.id}
                                    draggable="true"
                                    onDragStart={(e) => handleDragStart(e, project.id)}
                                    className={`
                                    bg-[var(--bg-surface)] p-4 rounded-lg border border-[var(--border-subtle)] shadow-sm hover:shadow-md transition-all cursor-move group
                                    ${draggingId == project.id ? 'opacity-50 rotate-2 scale-95 ring-2 ring-[var(--primary)]' : ''}
                                `}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <Link
                                            to={`/projects/${project.id}`}
                                            className="font-semibold text-[14px] text-[var(--text-main)] hover:text-[var(--primary)] line-clamp-2 leading-snug"
                                            title={project.name}
                                        >
                                            {project.name}
                                        </Link>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-muted)]">
                                            <GripVertical size={14} />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        {project.customer_name && (
                                            <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
                                                <User size={12} className="text-[var(--text-muted)]" />
                                                <span className="truncate max-w-[180px]">{project.customer_name}</span>
                                            </div>
                                        )}

                                        {project.deadline && (
                                            <div className={`flex items-center gap-1.5 text-[12px] font-medium ${new Date(project.deadline) < new Date() && project.status !== 'done' ? 'text-red-600' : 'text-[var(--text-secondary)]'
                                                }`}>
                                                <Calendar size={12} className={new Date(project.deadline) < new Date() && project.status !== 'done' ? 'text-red-500' : 'text-[var(--text-muted)]'} />
                                                <span>{new Date(project.deadline).toLocaleDateString()}</span>
                                            </div>
                                        )}

                                        {project.offer_name && (
                                            <div className="pt-2 border-t border-[var(--border-subtle)] mt-2">
                                                <span className="inline-block px-2 py-0.5 bg-[var(--bg-subtle)] text-[var(--text-secondary)] text-[10px] uppercase font-bold tracking-wider rounded border border-[var(--border-subtle)]">
                                                    {project.offer_name}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {getProjectsByStatus(col.id).length === 0 && (
                                <div className="text-center py-8 border-2 border-dashed border-[var(--border-subtle)] rounded-lg">
                                    <span className="text-[12px] text-[var(--text-muted)]">No projects</span>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ProjectKanban;
