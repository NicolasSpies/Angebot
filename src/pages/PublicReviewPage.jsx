import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import {
    CheckCircle2, ShieldAlert, Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
    MessageSquare, MousePointer2, Hand, X, History, User, Check, Edit3, Type, ArrowUpRight
} from 'lucide-react';
import { dataService } from '../data/dataService';
import Button from '../components/ui/Button';
import StatusPill from '../components/ui/StatusPill';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

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
    const [activeTool, setActiveTool] = useState('pin'); // 'pin', 'draw', 'highlight', 'strike'
    const [showIdentityModal, setShowIdentityModal] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState([]);
    const [annotations, setAnnotations] = useState([]);

    const canvasRef = useRef(null);
    const overlayRef = useRef(null);
    const renderTaskRef = useRef(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await dataService.getReviewByToken(token);
            if (res.error) {
                setError(res.error);
                return;
            }
            setData(res);

            // Load annotations for this version
            const commentData = await dataService.getReviewComments(res.versionId);
            setAnnotations(Array.isArray(commentData) ? commentData.map(c => ({
                id: c.id,
                page: c.page_number,
                type: c.type,
                x: c.x,
                y: c.y,
                data: c.annotation_data ? JSON.parse(c.annotation_data) : null,
                content: c.content
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

        annotations.filter(ann => ann.page === currentPage).forEach(ann => {
            const xPos = ann.x * width / 100;
            const yPos = ann.y * height / 100;

            if (ann.type === 'draw' && ann.data) {
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
                ctx.lineWidth = 2;
                ann.data.path.forEach((p, i) => {
                    if (i === 0) ctx.moveTo(p.x * width / 100, p.y * height / 100);
                    else ctx.lineTo(p.x * width / 100, p.y * height / 100);
                });
                ctx.stroke();
            } else if (ann.type === 'comment') {
                // Draw a pin for comments
                ctx.beginPath();
                ctx.arc(xPos, yPos, 8, 0, Math.PI * 2);
                ctx.fillStyle = '#FB923C'; // Orange-400
                ctx.fill();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Optional: number or icon inside pin
            }
        });
    }, [annotations, currentPage]);

    useEffect(() => { renderPage(); }, [renderPage]);

    const handleMouseDown = (e) => {
        if (activeTool !== 'draw') return;
        setIsDrawing(true);
        const rect = overlayRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setCurrentPath([{ x, y }]);
    };

    const handleMouseMove = (e) => {
        if (!isDrawing || activeTool !== 'draw') return;
        const rect = overlayRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setCurrentPath([...currentPath, { x, y }]);

        // Preview draw
        const ctx = overlayRef.current.getContext('2d');
        const { width, height } = overlayRef.current;
        ctx.clearRect(0, 0, width, height); // Clear previous preview
        drawAnnotations(); // Redraw existing annotations
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)';
        ctx.lineWidth = 2;
        currentPath.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x * width / 100, p.y * height / 100);
            else ctx.lineTo(p.x * width / 100, p.y * height / 100);
        });
        ctx.stroke();
    };

    const handleMouseUp = async () => {
        if (!isDrawing || activeTool !== 'draw') return;
        setIsDrawing(false);
        if (currentPath.length < 2) return;

        try {
            const res = await dataService.createReviewComment(data.versionId, {
                type: 'draw',
                annotation_data: JSON.stringify({ path: currentPath }),
                page_number: currentPage,
                x: currentPath[0].x,
                y: currentPath[0].y,
                content: 'Drawing'
            });
            setAnnotations([...annotations, {
                id: res.id, page: currentPage, type: 'draw', data: { path: currentPath }, x: currentPath[0].x, y: currentPath[0].y
            }]);
            setCurrentPath([]);
        } catch (err) {
            console.error('Save draw failed');
        }
    };

    const handleCanvasClick = async (e) => {
        if (activeTool !== 'pin' || isReadOnly) return;
        const rect = overlayRef.current.getBoundingClientRect();

        // Use clientX/clientY and normalize to percentage of the visual container
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        const content = prompt('Add a comment:');
        if (!content) return;

        try {
            const res = await dataService.createReviewComment(data.versionId, {
                content,
                x,
                y,
                page_number: currentPage,
                type: 'comment',
                author_name: 'Client', // Placeholder or from some state if available
                author_email: ''
            });

            setAnnotations([...annotations, {
                id: res.id,
                page: currentPage,
                type: 'comment',
                x,
                y,
                content,
                author_name: 'Client'
            }]);
        } catch (err) {
            console.error('Save comment failed:', err);
        }
    };

    const handleActionSubmit = async (identity) => {
        try {
            let res;
            if (pendingAction === 'approve') {
                res = await dataService.approveReview(data.containerId, data.versionId, identity);
            } else {
                res = await dataService.requestChanges(data.containerId, data.versionId, identity);
            }

            if (res.success) {
                setShowIdentityModal(false);
                loadData();
            } else {
                alert(res.error || 'Action failed.');
            }
        } catch (err) {
            console.error('Action failed:', err);
            alert('An unexpected error occurred.');
        }
    };

    // Placeholder for highlight/strike if we had text selection (simplified for now)
    const handleAddAnnotation = async (type, extraData = {}) => {
        try {
            const res = await dataService.createReviewComment(data.versionId, {
                type,
                annotation_data: JSON.stringify(extraData),
                page_number: currentPage,
                x: 10, // Fixed position for non-click annotations
                y: 10,
                content: `${type} added`
            });
            setAnnotations([...annotations, { id: res.id, page: currentPage, type, data: extraData, x: 10, y: 10 }]);
        } catch (err) { }
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

    return (
        <div className="flex flex-col h-screen bg-[#F5F5F7] overflow-hidden font-sans">
            <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-0.5">{data.project_name}</span>
                        <h1 className="text-lg font-bold text-[var(--text-main)] leading-none">{data.title}</h1>
                    </div>
                    <div className="h-10 w-px bg-gray-200" />
                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <button className="flex items-center gap-2 bg-[var(--bg-app)] border border-[var(--border-subtle)] px-3 py-2 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors">
                                <History size={16} className="text-[var(--text-secondary)]" />
                                Version v{data.version_number}
                                <StatusPill status={data.status} />
                            </button>
                            {/* Version Switcher Dropdown Placeholder */}
                        </div>
                        <span className="text-[12px] font-medium text-[var(--text-muted)]">
                            Revisions: <span className="text-[var(--text-main)] font-bold">{data.revisions_used}</span> of {data.review_limit}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-[var(--bg-app)] p-1 rounded-xl border border-[var(--border-subtle)] mr-4">
                        <button
                            onClick={() => setActiveTool('pin')}
                            className={`p-2 rounded-lg transition-all ${activeTool === 'pin' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-white/50'}`}
                            title="Comment Pin"
                        >
                            <MessageSquare size={18} />
                        </button>
                        <button
                            onClick={() => setActiveTool('draw')}
                            className={`p-2 rounded-lg transition-all ${activeTool === 'draw' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-white/50'}`}
                            title="Freehand Draw"
                        >
                            <Edit3 size={18} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 bg-[var(--bg-app)] px-3 py-2 rounded-xl border border-[var(--border-subtle)] mr-4">
                        <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-1 hover:bg-white rounded-lg transition-colors"><ZoomOut size={16} /></button>
                        <span className="text-xs font-bold w-12 text-center">{Math.round(scale * 100)}%</span>
                        <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-1 hover:bg-white rounded-lg transition-colors"><ZoomIn size={16} /></button>
                    </div>

                    {!isReadOnly ? (
                        <>
                            <button
                                onClick={() => { setPendingAction('request-changes'); setShowIdentityModal(true); }}
                                className="px-6 py-2.5 rounded-xl border-2 border-[var(--border-subtle)] text-sm font-bold hover:bg-gray-50 transition-all active:scale-95"
                            >
                                Request Changes
                            </button>
                            <button
                                onClick={() => { setPendingAction('approve'); setShowIdentityModal(true); }}
                                className="px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-bold hover:brightness-110 shadow-lg shadow-[var(--primary)]/20 transition-all active:scale-95"
                            >
                                Approve Final
                            </button>
                        </>
                    ) : (
                        <div className="flex items-center gap-2 px-6 py-2.5 bg-green-50 text-green-700 rounded-xl border border-green-100 text-sm font-bold">
                            <CheckCircle2 size={18} />
                            {data.status === 'approved' ? 'Successfully Approved' : 'Viewing Older Version (Read Only)'}
                        </div>
                    )}
                </div>
            </header>

            <main className="flex-1 overflow-auto bg-[#F5F5F7] flex flex-col items-center p-12 custom-scrollbar relative">
                <div className="relative bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-sm mb-12">
                    <canvas ref={canvasRef} className="block" />
                    <canvas
                        ref={overlayRef}
                        className="absolute top-0 left-0"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp} // End drawing if mouse leaves canvas
                        onClick={handleCanvasClick}
                    />
                </div>

                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md border border-white/20 shadow-2xl px-6 py-3 rounded-2xl flex items-center gap-6 z-20">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="p-2 hover:bg-black/5 rounded-lg transition-colors"><ChevronLeft size={20} /></button>
                        <span className="text-sm font-bold tracking-widest min-w-[60px] text-center">{currentPage} / {numPages}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} className="p-2 hover:bg-black/5 rounded-lg transition-colors"><ChevronRight size={20} /></button>
                    </div>
                </div>
            </main>

            <IdentityModal
                isOpen={showIdentityModal}
                onClose={() => setShowIdentityModal(false)}
                onSubmit={handleActionSubmit}
                action={pendingAction}
            />
        </div>
    );
};

export default PublicReviewPage;
