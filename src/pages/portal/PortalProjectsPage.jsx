import { useOutletContext, useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext';
import { Card } from '../../components/ui/Card';
import { Briefcase, Clock, FileText, ChevronRight } from 'lucide-react';
import StatusPill from '../../components/ui/StatusPill';

const PortalProjectsPage = () => {
    const { t } = useI18n();
    const { portalData } = useOutletContext();
    const navigate = useNavigate();
    const projects = portalData?.projects || [];

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tight">{t('portal.projects.title')}</h1>
                <p className="text-[var(--text-secondary)] mt-1 font-medium">Track the progress of your active and past projects.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {projects.length > 0 ? projects.map(project => {
                    const isDone = ['done', 'completed'].includes(project.status.toLowerCase());
                    return (
                        <Card
                            key={project.id}
                            className="p-6 hover:border-[var(--primary)] hover:shadow-xl transition-all cursor-pointer group flex items-center justify-between bg-white shadow-sm border-[var(--border-subtle)]"
                            onClick={() => navigate(`${project.id}`)}
                        >
                            <div className="flex items-center gap-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${isDone ? 'bg-green-50 text-green-500' : 'bg-[var(--primary-bg)] text-[var(--primary)]'
                                    }`}>
                                    <Briefcase size={24} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-black text-[18px] text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors">
                                        {project.name}
                                    </h3>
                                    <div className="flex items-center gap-4">
                                        <StatusPill status={project.status} />
                                        {project.offer_id && (
                                            <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wider bg-[var(--bg-app)] px-2 py-0.5 rounded-md">
                                                <FileText size={12} />
                                                Agreement Linked
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-10">
                                {project.deadline && (
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-2 text-[14px] font-black text-[var(--text-main)]">
                                            <Clock size={16} className="text-[var(--primary)]" />
                                            {new Date(project.deadline).toLocaleDateString()}
                                        </div>
                                        <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">Deadline</span>
                                    </div>
                                )}
                                <div className="p-2.5 rounded-full bg-[var(--bg-app)] text-[var(--text-muted)] group-hover:bg-[var(--primary)] group-hover:text-white transition-all shadow-sm">
                                    <ChevronRight size={20} />
                                </div>
                            </div>
                        </Card>
                    );
                }) : (
                    <div className="py-24 text-center bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-subtle)] border-dashed">
                        <div className="w-20 h-20 bg-[var(--bg-app)] rounded-full flex items-center justify-center mx-auto mb-6 text-[var(--text-muted)]">
                            <Briefcase size={32} />
                        </div>
                        <h3 className="text-xl font-black text-[var(--text-main)]">No projects found</h3>
                        <p className="text-[var(--text-secondary)] max-w-sm mx-auto mt-2 font-medium">
                            Once your projects begin, you'll be able to track every stage of progress right here.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PortalProjectsPage;
