import React, { useState, useEffect } from 'react';
import { dataService } from '../data/dataService';
import { useNavigate } from 'react-router-dom';
import {
    Activity, FileText, Briefcase, Users, Filter,
    CheckCircle, XCircle, Clock, ArrowRight, RefreshCw, Zap
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import StatusPill from '../components/ui/StatusPill';

const ActivityPage = () => {
    const navigate = useNavigate();
    const [activities, setActivities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, offer, project, customer

    const fetchActivities = async () => {
        setIsLoading(true);
        try {
            const params = { limit: 50 };
            if (filter !== 'all') params.entityType = filter;

            const data = await dataService.getActivities(params);
            setActivities(data || []);
        } catch (err) {
            console.error('Failed to load activities', err);
            setActivities([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchActivities();
    }, [filter]);

    const getIcon = (type) => {
        if (type === 'offer') return <FileText size={20} />;
        if (type === 'project') return <Briefcase size={20} />;
        if (type === 'customer') return <Users size={20} />;
        return <Activity size={20} />;
    };

    const getActionColor = (action) => {
        if (action === 'created') return 'bg-blue-50 text-blue-600';
        if (action === 'signed') return 'bg-green-50 text-green-600';
        if (action === 'declined') return 'bg-red-50 text-red-600';
        if (action === 'sent') return 'bg-amber-50 text-amber-600';
        return 'bg-gray-50 text-gray-600'; // updated, status_change
    };

    const getMetadataDescription = (act) => {
        const { entity_type, action, metadata } = act;

        switch (action) {
            case 'created':
                return <span>Created {entity_type} <span className="font-bold">"{metadata.name || 'Untitled'}"</span></span>;
            case 'updated':
                if (metadata.renamed) return <span>Renamed {entity_type} to <span className="font-bold">"{metadata.name}"</span></span>;
                return <span>Updated details</span>;
            case 'status_change':
                return (
                    <span className="flex items-center gap-1.5 flex-wrap">
                        Changed status
                        {metadata.oldStatus && <StatusPill status={metadata.oldStatus} className="scale-75 origin-left" />}
                        <ArrowRight size={12} className="text-gray-400" />
                        {metadata.newStatus && <StatusPill status={metadata.newStatus} className="scale-75 origin-left" />}
                    </span>
                );
            case 'sent':
                return <span>Sent offer to client</span>;
            case 'signed':
                return <span>Signed by <span className="font-bold">{metadata.signedBy || 'Client'}</span></span>;
            case 'declined':
                return <span>Declined by client</span>;
            default:
                return <span>{action.replace(/_/g, ' ')}</span>;
        }
    };

    const handleNavigate = (act) => {
        if (act.entity_type === 'offer') navigate(`/offers/${act.entity_id}`);
        else if (act.entity_type === 'project') navigate(`/projects/${act.entity_id}`);
        else if (act.entity_type === 'customer') navigate(`/customers`);
    };

    return (
        <div className="page-container pb-24 max-w-[1000px] mx-auto">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-[var(--text-main)] tracking-tight mb-2">Activity Log</h1>
                    <p className="text-[14px] text-[var(--text-secondary)] font-medium">Global history of all actions.</p>
                </div>
                <Button variant="ghost" onClick={fetchActivities}>
                    <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
                </Button>
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {['all', 'project', 'offer', 'customer'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`
                            px-4 py-2 rounded-full text-[13px] font-bold border transition-all capitalize
                            ${filter === f
                                ? 'bg-[var(--text-main)] text-[var(--bg-app)] border-transparent shadow-md'
                                : 'bg-white text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--text-muted)]'}
                        `}
                    >
                        {f === 'all' ? 'All Activity' : f + 's'}
                    </button>
                ))}
            </div>

            <Card padding="0" className="border border-[var(--border-subtle)] shadow-sm min-h-[400px]">
                {isLoading && activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)]">
                        <RefreshCw size={24} className="animate-spin mb-3" />
                        <span className="text-sm font-medium">Loading history...</span>
                    </div>
                ) : activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)]">
                        <Activity size={48} className="mb-4 opacity-20" />
                        <p className="font-medium">No activity recorded yet.</p>
                    </div>
                ) : (
                    <div>
                        {activities.map((act) => (
                            <div
                                key={act.id}
                                onClick={() => handleNavigate(act)}
                                className="group flex items-start gap-4 p-5 border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-subtle)] cursor-pointer transition-colors relative"
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-1 ${getActionColor(act.action)}`}>
                                    {getIcon(act.entity_type)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <Badge variant="neutral" className="uppercase text-[10px] tracking-wider py-0 px-1.5 h-5 border-transparent bg-gray-100 text-gray-500">
                                            {act.entity_type}
                                        </Badge>
                                        <span className="text-[12px] text-[var(--text-muted)]">
                                            {act.created_at ? new Date(act.created_at).toLocaleString(undefined, {
                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                            }) : '—'}
                                        </span>
                                    </div>
                                    <div className="text-[15px] font-medium text-[var(--text-main)] pr-8 leading-snug">
                                        {getMetadataDescription(act)}
                                    </div>
                                </div>

                                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200">
                                    <ArrowRight size={20} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
};

export default ActivityPage;
