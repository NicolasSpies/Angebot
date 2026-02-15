import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { dataService } from '../data/dataService';
import { ShieldCheck, AlertTriangle, ArrowRight, RefreshCw, CheckCircle2, Info, ChevronRight } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useNavigate } from 'react-router-dom';

const AuditPage = () => {
    const { t } = useI18n();
    const navigate = useNavigate();
    const [issues, setIssues] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, critical: 0, healthy: 100 });

    const fetchAuditData = async () => {
        setIsLoading(true);
        try {
            const data = await dataService.getAuditChecks();
            if (data && !data.error) {
                setIssues(data.issues || []);
                const critical = data.issues.length;
                setStats({
                    total: data.issues.length,
                    critical: critical,
                    healthy: critical === 0 ? 100 : Math.max(0, 100 - critical * 10)
                });
            }
        } catch (err) {
            console.error('Failed to fetch audit data', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAuditData();
    }, []);

    const getIssueColor = (type) => {
        if (type === 'critical') return 'text-red-600 bg-red-50 border-red-100';
        return 'text-amber-600 bg-amber-50 border-amber-100';
    };

    const handleFix = (issue) => {
        if (issue.offerId) navigate(`/offers/${issue.offerId}`);
        else if (issue.projectId) navigate(`/projects/${issue.projectId}`);
        else if (issue.customerId) navigate(`/customers`);
    };

    return (
        <div className="page-container pb-24 max-w-[1000px] mx-auto">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-[var(--text-main)] tracking-tight mb-2 flex items-center gap-3">
                        <ShieldCheck className="text-[var(--primary)]" size={32} />
                        Audit Mode
                    </h1>
                    <p className="text-[14px] text-[var(--text-secondary)] font-medium">Verify data integrity and system health.</p>
                </div>
                <Button variant="ghost" onClick={fetchAuditData}>
                    <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Run Checks
                </Button>
            </div>

            {/* Health Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <Card className="p-6 border border-[var(--border-subtle)] shadow-sm">
                    <p className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">System Health</p>
                    <div className="flex items-end gap-2">
                        <span className={`text-4xl font-black ${stats.healthy > 90 ? 'text-[var(--success)]' : stats.healthy > 70 ? 'text-amber-500' : 'text-red-500'}`}>
                            {stats.healthy}%
                        </span>
                        <span className="text-[14px] font-bold text-[var(--text-muted)] pb-1 mb-1">Operational</span>
                    </div>
                </Card>
                <Card className="p-6 border border-[var(--border-subtle)] shadow-sm">
                    <p className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Integrity Issues</p>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-black text-[var(--text-main)]">{stats.total}</span>
                        <span className="text-[14px] font-bold text-[var(--text-muted)] pb-1 mb-1">Detected</span>
                    </div>
                </Card>
                <Card className="p-6 border border-[var(--border-subtle)] shadow-sm">
                    <p className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Last Scan</p>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-black text-[var(--text-main)] underline decoration-[var(--primary)] decoration-4 underline-offset-8">NOW</span>
                    </div>
                </Card>
            </div>

            {/* Issues List */}
            <div className="flex flex-col gap-4">
                {isLoading ? (
                    <div className="text-center p-20 text-[var(--text-muted)]">Running deep scan...</div>
                ) : issues.length === 0 ? (
                    <Card className="p-12 border-2 border-dashed border-[var(--success)]/20 bg-[var(--success-bg)]/5 flex flex-col items-center text-center">
                        <CheckCircle2 size={48} className="text-[var(--success)] mb-4" />
                        <h3 className="text-[18px] font-extrabold text-[var(--text-main)] mb-2">No Issues Detected</h3>
                        <p className="text-[14px] text-[var(--text-secondary)]">Your database is healthy and all relationships are synchronized.</p>
                    </Card>
                ) : (
                    issues.map((issue, idx) => (
                        <Card key={idx} className={`p-0 border overflow-hidden shadow-sm hover:shadow-md transition-all ${getIssueColor(issue.type)}`}>
                            <div className="flex items-stretch">
                                <div className={`w-2 shrink-0 ${issue.type === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                                <div className="p-5 flex-1 flex justify-between items-center">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2 rounded-lg ${issue.type === 'critical' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'} shrink-0`}>
                                            <AlertTriangle size={20} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className={`text-[15px] font-extrabold ${issue.type === 'critical' ? 'text-red-900' : 'text-amber-900'}`}>
                                                    {issue.title || 'Data Discrepancy'}
                                                </h3>
                                                <Badge variant={issue.type === 'critical' ? 'danger' : 'warning'} className="text-[9px] py-0 h-4">
                                                    {issue.type.toUpperCase()}
                                                </Badge>
                                            </div>
                                            <p className={`text-[13px] font-medium leading-normal ${issue.type === 'critical' ? 'text-red-700' : 'text-amber-700'}`}>
                                                {issue.description}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        className={`shrink-0 ml-6 ${issue.type === 'critical' ? 'hover:bg-red-100 text-red-700' : 'hover:bg-amber-100 text-amber-700'}`}
                                        onClick={() => handleFix(issue)}
                                    >
                                        Resolve <ChevronRight size={16} className="ml-1" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            <div className="mt-12 p-6 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-subtle)]">
                <div className="flex items-start gap-3">
                    <Info size={18} className="text-[var(--text-muted)] mt-0.5" />
                    <div>
                        <h4 className="text-[14px] font-bold text-[var(--text-main)] mb-1">About Audit Mode</h4>
                        <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                            Audit mode scans your database for logical discrepancies, such as signed offers without linked projects,
                            orphaned tasks, or inconsistent financial records. Regular audits ensure that your business metrics
                            remains accurate and reliable.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuditPage;
