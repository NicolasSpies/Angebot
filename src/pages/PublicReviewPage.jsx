import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import {
    CheckCircle2, ShieldAlert, Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
    MessageSquare, MousePointer2, Hand, X, History, User, Check, Highlighter, Strikethrough, Type, ArrowUpRight
} from 'lucide-react';
import { dataService } from '../data/dataService';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import StatusPill from '../components/ui/StatusPill';
import ReviewSidebar from '../components/reviews/ReviewSidebar';
import { toast } from 'react-hot-toast';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText, isDestructive }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95">
                <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">{title}</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-[var(--text-secondary)] hover:bg-gray-50 transition-colors">Cancel</button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95 ${isDestructive ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-[var(--primary)] hover:brightness-110 shadow-[var(--primary)]/20'} shadow-lg`}
                    >
                        {confirmText || 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const IdentityModal = ({ isOpen, onClose, onSubmit, action }) => {
    const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', confirm: false });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
                <div className="w-12 h-12 bg-[var(--primary-light)] text-[var(--primary)] rounded-xl flex items-center justify-center mb-6">
                    <User size={24} />
                </div>
                <h2 className="text-xl font-bold text-[var(--text-main)] mb-2">Confirm Your Identity</h2>
                <p className="text-[var(--text-secondary)] text-sm mb-6">
                    Please provide your details to complete the <strong>{action === 'approve' ? 'Approval' : 'Change Request'}</strong>.
                </p>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">First Name</label>
                            <input
                                type="text"
                                value={formData.firstName}
                                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                className="w-full p-3 bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-xl outline-none focus:border-[var(--primary)] text-sm"
                                placeholder="Sabrina"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Last Name</label>
                            <input
                                type="text"
                                value={formData.lastName}
                                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                className="w-full p-3 bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-xl outline-none focus:border-[var(--primary)] text-sm"
                                placeholder="Cremer"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Email Address</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            className="w-full p-3 bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-xl outline-none focus:border-[var(--primary)] text-sm"
                            placeholder="sabrina@email.com"
                        />
                    </div>
                    <label className="flex items-start gap-3 cursor-pointer group mt-4">
                        <input
                            type="checkbox"
                            checked={formData.confirm}
                            onChange={e => setFormData({ ...formData, confirm: e.target.checked })}
                            className="mt-1"
                        />
                        <span className="text-sm text-[var(--text-secondary)] leading-tight">
                            I confirm that I am authorized to provide feedback and {action === 'approve' ? 'approve this document' : 'request these changes'}.
                        </span>
                    </label>
                </div>

                <div className="flex gap-3 mt-8">
                    <button onClick={onClose} className="flex-1 btn-secondary py-3">Cancel</button>
                    <button
                        disabled={!formData.firstName || !formData.lastName || !formData.email || !formData.confirm}
                        onClick={() => onSubmit(formData)}
                        className="flex-1 btn-primary py-3 disabled:opacity-50"
                    >
                        Confirm & Submit
                    </button>
                </div>
            </div>
        </div>
    );
};

const PublicReviewPage = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [pdf, setPdf] = useState(null);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [scale, setScale] = useState(1.2);
    const [activeTool, setActiveTool] = useState('pin'); // 'pin', 'draw'
    const [showIdentityModal, setShowIdentityModal] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState(null);
    const [dragEnd, setDragEnd] = useState(null);
    const [annotations, setAnnotations] = useState([]);
    const [settings, setSettings] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [allVersions, setAllVersions] = useState([]);
    const [newCommentPos, setNewCommentPos] = useState(null);
    const [newCommentText, setNewCommentText] = useState('');
    const [clientIdentity, setClientIdentity] = useState(() => {
        const saved = localStorage.getItem(`client_identity_${token}`);
        return saved ? JSON.parse(saved) : null;
    });
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState({});

    const canvasRef = useRef(null);
    const overlayRef = useRef(null);
    const renderTaskRef = useRef(null);
    const [highlightedCommentId, setHighlightedCommentId] = useState(null);
    const [highlightedPinId, setHighlightedPinId] = useState(null);

    const loadData = useCallback(async (vId = null) => {
        setLoading(true);
        setError(null);
        try {
            const [res, settingsData] = await Promise.all([
                dataService.getReviewByToken(token, vId),
                dataService.getSettings()
            ]);

            if (res.error) {
                setError(res.error);
                return;
            }
            setData(res);
            setSettings(settingsData);
            setAllVersions(res.allVersions || []);

            // Load annotations for this version
            const commentData = await dataService.getReviewComments(res.versionId);
            setAnnotations(Array.isArray(commentData) ? commentData.map(c => ({
                id: c.id,
                page: c.page_number,
                type: c.type,
                x: c.x,
                y: c.y,
                data: c.annotation_data ? JSON.parse(c.annotation_data) : null,
                content: c.content,
                author_name: c.author_name,
                is_resolved: c.is_resolved
            })) : []);

            if (res.file_url) {
                const loadingTask = pdfjsLib.getDocument(res.file_url);
                const pdfDoc = await loadingTask.promise;
                setPdf(pdfDoc);
                setNumPages(pdfDoc.numPages);
            }
        } catch (err) {
            setError('Failed to load review.');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { loadData(); }, [loadData]);

    const renderPage = useCallback(async () => {
        if (!pdf || !canvasRef.current || !overlayRef.current) return;
        if (renderTaskRef.current) renderTaskRef.current.cancel();

        try {
            const page = await pdf.getPage(currentPage);
            const viewport = page.getViewport({ scale });

            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const overlay = overlayRef.current;
            overlay.height = viewport.height;
            overlay.width = viewport.width;

            renderTaskRef.current = page.render({ canvasContext: context, viewport });
            await renderTaskRef.current.promise;

            drawAnnotations();
        } catch (err) {
            if (err.name !== 'RenderingCancelledException') console.error(err);
        }
    }, [pdf, currentPage, scale, annotations]);

    const drawAnnotations = useCallback(() => {
        if (!overlayRef.current) return;
        const ctx = overlayRef.current.getContext('2d');
        const { width, height } = overlayRef.current;
        ctx.clearRect(0, 0, width, height);

        const { width: drawWidth, height: drawHeight } = overlayRef.current;
        annotations.filter(ann => ann.page === currentPage).forEach(ann => {
            const isHighlighted = ann.id === highlightedPinId;

            if (ann.type === 'highlight' && ann.data) {
                ctx.fillStyle = isHighlighted ? 'rgba(255, 255, 0, 0.5)' : 'rgba(255, 255, 0, 0.3)';
                ctx.fillRect(
                    ann.data.x * drawWidth / 100,
                    ann.data.y * drawHeight / 100,
                    ann.data.width * drawWidth / 100,
                    ann.data.height * drawHeight / 100
                );
                if (isHighlighted) {
                    ctx.strokeStyle = 'rgba(255, 165, 0, 0.8)';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(
                        ann.data.x * drawWidth / 100,
                        ann.data.y * drawHeight / 100,
                        ann.data.width * drawWidth / 100,
                        ann.data.height * drawHeight / 100
                    );
                }
            } else if (ann.type === 'strike' && ann.data) {
                ctx.beginPath();
                ctx.strokeStyle = isHighlighted ? 'rgba(255, 0, 0, 1)' : 'rgba(255, 0, 0, 0.6)';
                ctx.lineWidth = isHighlighted ? 3 : 2;
                const midY = (ann.data.y + ann.data.height / 2) * drawHeight / 100;
                ctx.moveTo(ann.data.x * drawWidth / 100, midY);
                ctx.lineTo((ann.data.x + ann.data.width) * drawWidth / 100, midY);
                ctx.stroke();
            } else if (ann.type === 'comment') {
                const xPos = ann.x * drawWidth / 100;
                const yPos = ann.y * drawHeight / 100;
                ctx.beginPath();
                ctx.arc(xPos, yPos, 8, 0, Math.PI * 2);
                ctx.fillStyle = ann.is_resolved ? '#94A3B8' : '#FB923C';
                ctx.fill();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        });
    }, [annotations, currentPage, highlightedPinId]);

    useEffect(() => { renderPage(); }, [renderPage]);

    const handleMouseDown = (e) => {
        if (activeTool !== 'highlight' && activeTool !== 'strike') return;
        setIsDragging(true);
        const rect = overlayRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setDragStart({ x, y });
        setDragEnd({ x, y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging || (activeTool !== 'highlight' && activeTool !== 'strike')) return;
        const rect = overlayRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setDragEnd({ x, y });

        // Preview rendering
        const ctx = overlayRef.current.getContext('2d');
        const { width, height } = overlayRef.current;
        ctx.clearRect(0, 0, width, height);
        drawAnnotations();

        const xMin = Math.min(dragStart.x, x);
        const yMin = Math.min(dragStart.y, y);
        const xMax = Math.max(dragStart.x, x);
        const yMax = Math.max(dragStart.y, y);

        if (activeTool === 'highlight') {
            ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
            ctx.fillRect(xMin * width / 100, yMin * height / 100, (xMax - xMin) * width / 100, (yMax - yMin) * height / 100);
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
            ctx.strokeRect(xMin * width / 100, yMin * height / 100, (xMax - xMin) * width / 100, (yMax - yMin) * height / 100);
        } else if (activeTool === 'strike') {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)';
            ctx.lineWidth = 2;
            const midY = (yMin + (yMax - yMin) / 2) * height / 100;
            ctx.moveTo(xMin * width / 100, midY);
            ctx.lineTo(xMax * width / 100, midY);
            ctx.stroke();
        }
    };

    const handleMouseUp = async () => {
        if (!isDragging) return;
        setIsDragging(false);

        const xMin = Math.min(dragStart.x, dragEnd.x);
        const yMin = Math.min(dragStart.y, dragEnd.y);
        const width = Math.max(dragStart.x, dragEnd.x) - xMin;
        const height = Math.max(dragStart.y, dragEnd.y) - yMin;

        if (width < 1 && height < 1) return;

        try {
            const res = await dataService.createReviewComment(data.versionId, {
                type: activeTool,
                annotation_data: JSON.stringify({ x: xMin, y: yMin, width, height }),
                page_number: currentPage,
                x: xMin,
                y: yMin,
                content: activeTool === 'highlight' ? 'Highlight' : 'Strike-through',
                author_name: clientIdentity ? `${clientIdentity.firstName} ${clientIdentity.lastName}` : 'Client',
                author_email: clientIdentity?.email || ''
            });
            setAnnotations([...annotations, {
                id: res.id,
                page: currentPage,
                type: activeTool,
                data: { x: xMin, y: yMin, width, height },
                x: xMin,
                y: yMin,
                content: activeTool === 'highlight' ? 'Highlight' : 'Strike-through',
                author_name: clientIdentity ? `${clientIdentity.firstName} ${clientIdentity.lastName}` : 'Client',
                is_resolved: false
            }]);
            setDragStart(null);
            setDragEnd(null);
            toast.success(`${activeTool === 'highlight' ? 'Highlight' : 'Strike-through'} added`);
        } catch (err) {
            toast.error('Failed to add annotation');
        }
    };

    const handleCanvasClick = async (e) => {
        const rect = overlayRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        // Hit testing for Highlights and Strikes
        const hit = annotations.find(ann => {
            if (ann.page !== currentPage) return false;
            if (ann.type === 'highlight' || ann.type === 'strike') {
                const { x: ax, y: ay, width: aw, height: ah } = ann.data;
                return x >= ax && x <= ax + aw && y >= ay && y <= ay + ah;
            }
            return false;
        });

        if (hit) {
            const el = document.getElementById(`comment-${hit.id}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setHighlightedCommentId(hit.id);
                setTimeout(() => setHighlightedCommentId(null), 3000);
            }
            return;
        }

        if (activeTool !== 'pin' || isReadOnly) return;

        setNewCommentPos({ x, y });
        setNewCommentText('');
    };

    const handleActionSubmit = async (identity) => {
        try {
            setClientIdentity(identity);
            localStorage.setItem(`client_identity_${token}`, JSON.stringify(identity));

            let res;
            if (pendingAction === 'approve') {
                res = await dataService.approveReview(data.containerId, data.versionId, identity);
            } else {
                res = await dataService.requestChanges(data.containerId, data.versionId, identity);
            }

            if (res.success) {
                setShowIdentityModal(false);
                toast.success(pendingAction === 'approve' ? 'Review Approved' : 'Changes Requested');
                loadData();
            } else {
                toast.error(res.error || 'Action failed.');
            }
        } catch (err) {
            console.error('Action failed:', err);
            toast.error('An unexpected error occurred.');
        }
    };

    const confirmDelete = (id) => {
        setConfirmConfig({
            title: 'Delete Comment?',
            message: 'Are you sure you want to delete this comment? This action cannot be undone.',
            confirmText: 'Delete',
            isDestructive: true,
            onConfirm: async () => {
                try {
                    await dataService.deleteReviewComment(id);
                    setAnnotations(prev => prev.filter(a => a.id !== id));
                    toast.success('Comment deleted');
                } catch (err) {
                    toast.error('Failed to delete comment');
                }
                setShowConfirmModal(false);
            }
        });
        setShowConfirmModal(true);
    };

    const handleCommentSubmit = async () => {
        if (!newCommentText.trim() || !newCommentPos) return;

        try {
            const res = await dataService.createReviewComment(data.versionId, {
                content: newCommentText,
                x: newCommentPos.x,
                y: newCommentPos.y,
                page_number: currentPage,
                type: 'comment',
                author_name: clientIdentity ? `${clientIdentity.firstName} ${clientIdentity.lastName}` : 'Client',
                author_email: clientIdentity?.email || ''
            });

            setAnnotations([...annotations, {
                id: res.id,
                page: currentPage,
                type: 'comment',
                x: newCommentPos.x,
                y: newCommentPos.y,
                content: newCommentText,
                author_name: clientIdentity ? `${clientIdentity.firstName} ${clientIdentity.lastName}` : 'Client',
                is_resolved: false
            }]);

            setNewCommentPos(null);
            setNewCommentText('');
            toast.success('Comment added');
        } catch (err) {
            toast.error('Failed to add comment');
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen bg-[var(--bg-app)] italic text-[var(--text-muted)]">Loading Review...</div>;

    if (error) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-app)] p-6 text-center">
            <ShieldAlert size={48} className="text-red-500 mb-4" />
            <h3 className="text-lg font-bold">Review Unavailable</h3>
            <p className="text-[var(--text-secondary)]">{error}</p>
        </div>
    );

    const isReadOnly = !data.isCurrent || data.status === 'approved';
    const hasComments = annotations.filter(a => !a.is_resolved).length > 0;

    return (
        <div className="flex flex-col h-screen bg-[#F8F9FA] overflow-hidden font-sans">
            <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.02)] z-10">
                <div className="flex items-center gap-8">
                    {settings?.logo_url ? (
                        <img src={settings.logo_url} alt="Logo" className="h-10 w-auto object-contain" />
                    ) : (
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-[0.2em] mb-0.5">Brand</span>
                            <h1 className="text-lg font-black text-[var(--text-main)] leading-none italic">LOGO</h1>
                        </div>
                    )}

                    <div className="h-10 w-px bg-gray-100" />

                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">{data.project_name}</span>
                        <div className="flex items-center gap-3">
                            <h1 className="text-[15px] font-bold text-[var(--text-main)] leading-none">
                                {data.title || data.file_url?.split('/').pop()?.replace(/^comp-/, '') || 'Review PDF'}
                            </h1>
                            <div className="flex items-center gap-2 px-3 py-1 bg-[#F1F3F5] rounded-xl border border-gray-100 shadow-sm">
                                <History size={14} className="text-[var(--text-muted)]" />
                                <Select
                                    value={data.versionId}
                                    onChange={(e) => loadData(e.target.value)}
                                    options={allVersions.map(v => ({
                                        value: v.id,
                                        label: `v${v.version_number}`
                                    }))}
                                    className="min-w-[50px]"
                                    triggerStyle={{
                                        height: '24px',
                                        paddingLeft: '0',
                                        paddingRight: '0',
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        fontSize: '11px',
                                        fontWeight: '900',
                                        color: 'var(--text-secondary)'
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className={`px-4 py-2 rounded-full border text-[11px] font-black uppercase tracking-widest shadow-sm flex items-center gap-3 ${data.revisions_used >= (data.review_limit || 3) ? 'bg-red-50 border-red-200 text-red-600' :
                        data.revisions_used >= (data.review_limit || 3) * 0.6 ? 'bg-amber-50 border-amber-200 text-amber-600' :
                            'bg-emerald-50 border-emerald-200 text-emerald-600'
                        }`}>
                        <span className="opacity-60 text-[10px]">Revisions</span>
                        <div className="flex items-center gap-1.5 min-w-[32px] justify-center">
                            <span className="text-[14px]">{data.revisions_used || 0}</span>
                            <span className="opacity-40 text-[10px]">/</span>
                            <span className="text-[14px]">{data.review_limit || 3}</span>
                        </div>
                    </div>

                    <div className="w-px h-10 bg-gray-100 mx-2" />

                    <div className="flex items-center gap-1.5 bg-[#F1F3F5] p-1.5 rounded-2xl border border-gray-200">
                        <button
                            onClick={() => setActiveTool('pin')}
                            className={`p-2 rounded-xl transition-all ${activeTool === 'pin' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-white/50'}`}
                            title="Comment Pin"
                        >
                            <MessageSquare size={18} />
                        </button>
                        <button
                            onClick={() => setActiveTool('highlight')}
                            className={`p-2 rounded-xl transition-all ${activeTool === 'highlight' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-white/50'}`}
                            title="Highlight"
                        >
                            <Highlighter size={18} />
                        </button>
                        <button
                            onClick={() => setActiveTool('strike')}
                            className={`p-2 rounded-xl transition-all ${activeTool === 'strike' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-white/50'}`}
                            title="Strike-through"
                        >
                            <Strikethrough size={18} />
                        </button>
                    </div>

                    <div className="w-px h-10 bg-gray-100 mx-2" />

                    {!isReadOnly ? (
                        <>
                            <button
                                onClick={() => { setPendingAction('request-changes'); setShowIdentityModal(true); }}
                                className="h-11 px-6 rounded-2xl bg-white border-2 border-orange-500 text-orange-500 text-sm font-black hover:bg-orange-50 transition-all active:scale-95 shadow-sm"
                            >
                                REQUEST CHANGES
                            </button>
                            <div className="relative group">
                                <button
                                    disabled={hasComments}
                                    onClick={() => { setPendingAction('approve'); setShowIdentityModal(true); }}
                                    className={`h-11 px-8 rounded-2xl bg-emerald-500 text-white text-sm font-black transition-all active:scale-95 shadow-lg shadow-emerald-200 ${hasComments ? 'opacity-40 cursor-not-allowed grayscale' : 'hover:brightness-110'}`}
                                >
                                    APPROVE
                                </button>
                                {hasComments && (
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-gray-900 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center font-bold">
                                        Please resolve all comments before approving.
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-3 px-6 py-2.5 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 text-[12px] font-black uppercase tracking-wider">
                            <CheckCircle2 size={18} />
                            {data.status === 'approved' ? 'Successfully Approved' : 'Viewing History Only'}
                        </div>
                    )}

                    <div className="w-px h-10 bg-gray-100 mx-2" />

                    <a
                        href={`${data.file_url}?download=1`}
                        download
                        className="p-3 bg-white border border-gray-200 rounded-2xl text-[var(--text-secondary)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-all shadow-sm"
                        title="Download PDF"
                    >
                        <Download size={20} />
                    </a>

                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className={`p-3 rounded-2xl transition-all ${isSidebarOpen ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20' : 'bg-white border border-gray-200 text-[var(--text-secondary)] hover:bg-gray-50 shadow-sm'}`}
                    >
                        <MessageSquare size={20} />
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <main className="flex-1 overflow-auto bg-[#F8F9FA] flex flex-col items-center p-12 custom-scrollbar relative">
                    <div className="relative bg-white shadow-[0_30px_80px_rgba(0,0,0,0.12)] rounded-sm mb-12 border border-gray-100">
                        <canvas ref={canvasRef} className="block" />
                        <canvas
                            ref={overlayRef}
                            className={`absolute top-0 left-0 ${activeTool === 'pin' ? 'cursor-crosshair' : activeTool === 'draw' ? 'cursor-cell' : 'cursor-default'}`}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            onClick={handleCanvasClick}
                        />

                        {newCommentPos && (
                            <div
                                className="absolute z-50 bg-white shadow-2xl rounded-2xl p-4 border border-gray-100 animate-in zoom-in-95"
                                style={{ left: `${newCommentPos.x}%`, top: `${newCommentPos.y}%`, width: '280px', transform: 'translate(10px, 10px)' }}
                            >
                                <textarea
                                    autoFocus
                                    placeholder="Add your feedback..."
                                    value={newCommentText}
                                    onChange={e => setNewCommentText(e.target.value)}
                                    className="w-full h-24 p-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 resize-none font-medium"
                                />
                                <div className="flex gap-2 mt-3">
                                    <button
                                        onClick={() => setNewCommentPos(null)}
                                        className="flex-1 px-3 py-2 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:bg-gray-100 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCommentSubmit}
                                        className="flex-1 px-3 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-black shadow-lg shadow-[var(--primary)]/20 transition-all active:scale-95"
                                    >
                                        Add Comment
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="absolute inset-0 pointer-events-none">
                            {annotations.filter(c => c.page === currentPage && c.type === 'comment').map(comment => (
                                <div
                                    key={comment.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const el = document.getElementById(`comment-${comment.id}`);
                                        if (el) {
                                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            setHighlightedCommentId(comment.id);
                                            setTimeout(() => setHighlightedCommentId(null), 3000);
                                        }
                                    }}
                                    className={`absolute w-8 h-8 -ml-4 -mt-4 text-white border-2 border-white rounded-full flex items-center justify-center shadow-lg pointer-events-auto cursor-pointer transition-all hover:scale-110 ${comment.is_resolved ? 'bg-slate-400' : 'bg-orange-500'} ${highlightedPinId === comment.id ? 'scale-125 ring-4 ring-orange-400 ring-offset-2 z-30' : ''}`}
                                    style={{ left: `${comment.x}%`, top: `${comment.y}%` }}
                                >
                                    <MessageSquare size={16} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl border border-white shadow-[0_15px_35px_rgba(0,0,0,0.1)] px-8 py-4 rounded-[2rem] flex items-center gap-10 hover:bg-white transition-all z-20 group">
                        <div className="flex items-center gap-6">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="p-2 hover:bg-[#F1F3F5] rounded-xl transition-colors text-[var(--text-secondary)]"><ChevronLeft size={22} /></button>
                            <span className="text-[13px] font-black tracking-[0.2em] min-w-[100px] text-center text-[var(--text-main)] uppercase">{currentPage} / {numPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} className="p-2 hover:bg-[#F1F3F5] rounded-xl transition-colors text-[var(--text-secondary)]"><ChevronRight size={22} /></button>
                        </div>
                        <div className="w-px h-8 bg-gray-200" />
                        <div className="flex items-center gap-6">
                            <button onClick={() => setScale(s => Math.max(0.7, s - 0.1))} className="p-2 hover:bg-[#F1F3F5] rounded-xl transition-colors text-[var(--text-secondary)]"><ZoomOut size={20} /></button>
                            <span className="text-[13px] font-black text-[var(--text-main)] min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
                            <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-2 hover:bg-[#F1F3F5] rounded-xl transition-colors text-[var(--text-secondary)]"><ZoomIn size={20} /></button>
                        </div>
                    </div>
                </main>

                {isSidebarOpen && (
                    <ReviewSidebar
                        comments={annotations}
                        activeVersion={data}
                        highlightedCommentId={highlightedCommentId}
                        onCommentClick={(c) => {
                            setCurrentPage(c.page || 1);
                            setHighlightedPinId(c.id);
                            setTimeout(() => setHighlightedPinId(null), 3000);
                        }}
                        onResolveComment={confirmDelete}
                    />
                )}
            </div>

            <IdentityModal
                isOpen={showIdentityModal}
                onClose={() => setShowIdentityModal(false)}
                onSubmit={handleActionSubmit}
                action={pendingAction}
            />

            <ConfirmationModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                {...confirmConfig}
            />
        </div>
    );
};

export default PublicReviewPage;
