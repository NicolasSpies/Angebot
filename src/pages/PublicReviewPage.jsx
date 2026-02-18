import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
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
    const { t } = useI18n();
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95">
                <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">{title}</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-[var(--text-secondary)] hover:bg-gray-50 transition-colors">{t('common.cancel')}</button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95 ${isDestructive ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-[var(--primary)] hover:brightness-110 shadow-[var(--primary)]/20'} shadow-lg`}
                    >
                        {confirmText || t('common.confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ClientOnboardingModal = ({ isOpen, onSubmit, data }) => {
    const { t } = useI18n();
    const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', company: '' });
    const [isValidEmail, setIsValidEmail] = useState(true);

    if (!isOpen) return null;

    const validateEmail = (email) => {
        return /\S+@\S+\.\S+/.test(email);
    };

    const handleEmailChange = (e) => {
        const email = e.target.value;
        setFormData({ ...formData, email });
        setIsValidEmail(validateEmail(email));
    };

    const isComplete = formData.firstName.trim() && formData.lastName.trim() && formData.email.trim() && validateEmail(formData.email);

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] max-w-lg w-full p-10 animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-[var(--primary-light)] text-[var(--primary)] rounded-2xl flex items-center justify-center mb-8 mx-auto shadow-sm">
                    <User size={32} />
                </div>

                <div className="text-center mb-10">
                    <h2 className="text-2xl font-black text-[var(--text-main)] mb-3">{t('public_review.welcome')}</h2>
                    <p className="text-[var(--text-secondary)] text-sm leading-relaxed px-4">
                        {t('public_review.intro')} <strong>{data?.title || t('portal.reviews.title')}</strong>.
                    </p>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.15em] ml-1">{t('common.first_name') || 'First Name'}</label>
                            <input
                                type="text"
                                autoFocus
                                value={formData.firstName}
                                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all text-[15px] font-medium"
                                placeholder="Sabrina"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.15em] ml-1">{t('common.last_name') || 'Last Name'}</label>
                            <input
                                type="text"
                                value={formData.lastName}
                                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all text-[15px] font-medium"
                                placeholder="Cremer"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.15em] ml-1">{t('common.email') || 'Email Address'}</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={handleEmailChange}
                            className={`w-full p-4 bg-gray-50 border ${!isValidEmail && formData.email ? 'border-red-300 focus:border-red-500 ring-red-100' : 'border-gray-100 focus:border-[var(--primary)] focus:ring-[var(--primary)]/20'} rounded-2xl outline-none transition-all text-[15px] font-medium`}
                            placeholder="sabrina@example.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.15em] ml-1">{t('common.company') || 'Company (Optional)'}</label>
                        <input
                            type="text"
                            value={formData.company}
                            onChange={e => setFormData({ ...formData, company: e.target.value })}
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all text-[15px] font-medium"
                            placeholder="Acme Inc."
                        />
                    </div>
                </div>

                <div className="mt-12">
                    <button
                        disabled={!isComplete}
                        onClick={() => onSubmit(formData)}
                        className="w-full btn-primary py-5 rounded-[1.5rem] text-[15px] font-black uppercase tracking-widest shadow-xl shadow-[var(--primary)]/20 disabled:opacity-30 disabled:grayscale transition-all hover:translate-y-[-2px] active:translate-y-[0px]"
                    >
                        {t('public_review.start_btn')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const IdentityModal = ({ isOpen, onClose, onSubmit, action }) => {
    const { t } = useI18n();
    const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', confirm: false });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[210] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
                <div className="w-12 h-12 bg-[var(--primary-light)] text-[var(--primary)] rounded-xl flex items-center justify-center mb-6">
                    <User size={24} />
                </div>
                <h2 className="text-xl font-bold text-[var(--text-main)] mb-2">{t('public_review.final_confirmation')}</h2>
                <p className="text-[var(--text-secondary)] text-sm mb-6">
                    {action === 'approve' ? t('portal.reviews.approve') : t('portal.reviews.request_changes')}
                </p>

                <div className="space-y-4">
                    <label className="flex items-start gap-3 cursor-pointer group mt-4">
                        <input
                            type="checkbox"
                            checked={formData.confirm}
                            onChange={e => setFormData({ ...formData, confirm: e.target.checked })}
                            className="mt-1"
                        />
                        <span className="text-sm text-[var(--text-secondary)] leading-tight">
                            {t('public_review.confirm_instruction', { action: action === 'approve' ? t('portal.reviews.approve') : t('portal.reviews.request_changes') })}
                        </span>
                    </label>
                </div>

                <div className="flex gap-3 mt-8">
                    <button onClick={onClose} className="flex-1 btn-secondary py-3">{t('common.cancel')}</button>
                    <button
                        disabled={!formData.confirm}
                        onClick={() => onSubmit(formData)}
                        className="flex-1 btn-primary py-3 disabled:opacity-50"
                    >
                        {t('public_review.confirm_submit')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const PublicReviewPage = () => {
    const { token } = useParams();
    const { t, setLocale } = useI18n();
    const outletContext = useOutletContext();
    const portalData = outletContext?.portalData;
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [pdf, setPdf] = useState(null);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [scale, setScale] = useState(1.2);
    const [activeTool, setActiveTool] = useState('pin'); // 'pin', 'highlight', 'strike'
    const [showIdentityModal, setShowIdentityModal] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const [dragStart, setDragStart] = useState(null);
    const [dragEnd, setDragEnd] = useState(null);
    const [annotations, setAnnotations] = useState([]);
    const [settings, setSettings] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [allVersions, setAllVersions] = useState([]);
    const [newCommentPos, setNewCommentPos] = useState(null);
    const [newCommentText, setNewCommentText] = useState('');
    const [pendingAnnotation, setPendingAnnotation] = useState(null);
    const [editingAnnotationId, setEditingAnnotationId] = useState(null);
    const [clientIdentity, setClientIdentity] = useState(() => {
        const saved = sessionStorage.getItem(`client_identity_${token}`);
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

            if (res.language) {
                setLocale(res.language);
            } else if (res.project_language) {
                setLocale(res.project_language);
            }

            // Load annotations for this version
            const commentData = await dataService.getReviewComments(res.id);
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

    useEffect(() => {
        if (portalData?.profile && !clientIdentity) {
            const identity = {
                firstName: portalData.profile.first_name,
                lastName: portalData.profile.last_name,
                email: portalData.profile.email,
                company: portalData.profile.company
            };
            setClientIdentity(identity);
            sessionStorage.setItem(`client_identity_${token}`, JSON.stringify(identity));
        }
    }, [portalData, token, clientIdentity]);

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
            const isHighlighted = ann.id === highlightedPinId || ann.id === editingAnnotationId;

            if (ann.type === 'highlight' && ann.data) {
                ctx.fillStyle = isHighlighted ? 'rgba(255, 255, 0, 0.5)' : 'rgba(255, 255, 0, 0.3)';
                ctx.fillRect(
                    ann.data.x * drawWidth / 100,
                    ann.data.y * drawHeight / 100,
                    ann.data.width * drawWidth / 100,
                    ann.data.height * drawHeight / 100
                );
                if (isHighlighted) {
                    ctx.strokeStyle = '#FB923C';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([5, 5]);
                    ctx.strokeRect(
                        ann.data.x * drawWidth / 100,
                        ann.data.y * drawHeight / 100,
                        ann.data.width * drawWidth / 100,
                        ann.data.height * drawHeight / 100
                    );
                    ctx.setLineDash([]);
                }
            } else if (ann.type === 'strike' && ann.data) {
                ctx.beginPath();
                ctx.strokeStyle = isHighlighted ? 'rgba(255, 0, 0, 1)' : 'rgba(255, 0, 0, 0.6)';
                ctx.lineWidth = isHighlighted ? 4 : 2;
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

                if (isHighlighted) {
                    ctx.beginPath();
                    ctx.arc(xPos, yPos, 12, 0, Math.PI * 2);
                    ctx.strokeStyle = '#FB923C';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([3, 3]);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            }
        });

        // Draw pending annotation
        if (pendingAnnotation && pendingAnnotation.page === currentPage) {
            ctx.setLineDash([5, 5]);
            if (pendingAnnotation.type === 'highlight') {
                ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
                ctx.fillRect(pendingAnnotation.data.x * drawWidth / 100, pendingAnnotation.data.y * drawHeight / 100, pendingAnnotation.data.width * drawWidth / 100, pendingAnnotation.data.height * drawHeight / 100);
                ctx.strokeStyle = '#FB923C';
                ctx.strokeRect(pendingAnnotation.data.x * drawWidth / 100, pendingAnnotation.data.y * drawHeight / 100, pendingAnnotation.data.width * drawWidth / 100, pendingAnnotation.data.height * drawHeight / 100);
            } else if (pendingAnnotation.type === 'strike') {
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
                ctx.lineWidth = 3;
                const midY = (pendingAnnotation.data.y + pendingAnnotation.data.height / 2) * drawHeight / 100;
                ctx.beginPath();
                ctx.moveTo(pendingAnnotation.data.x * drawWidth / 100, midY);
                ctx.lineTo((pendingAnnotation.data.x + pendingAnnotation.data.width) * drawWidth / 100, midY);
                ctx.stroke();
            } else if (pendingAnnotation.type === 'comment') {
                ctx.beginPath();
                ctx.arc(pendingAnnotation.x * drawWidth / 100, pendingAnnotation.y * drawHeight / 100, 8, 0, Math.PI * 2);
                ctx.fillStyle = '#FB923C';
                ctx.fill();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            ctx.setLineDash([]);
        }
    }, [annotations, currentPage, highlightedPinId, editingAnnotationId, pendingAnnotation]);

    useEffect(() => { renderPage(); }, [renderPage]);

    const handleMouseDown = (e) => {
        if (isReadOnly) return;
        const rect = overlayRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        // Check for clicking on existing annotation to move
        const hit = annotations.find(ann => {
            if (ann.page !== currentPage) return false;
            if (ann.type === 'comment') {
                return Math.abs(ann.x - x) < 2 && Math.abs(ann.y - y) < 2;
            } else if (ann.data) {
                return x >= ann.data.x && x <= ann.data.x + ann.data.width &&
                    y >= ann.data.y && y <= ann.data.y + ann.data.height;
            }
            return false;
        });

        if (hit) {
            setIsMoving(true);
            setEditingAnnotationId(hit.id);
            setDragStart({ x, y, originalAnn: { ...hit } });
            return;
        }

        if (activeTool === 'highlight' || activeTool === 'strike') {
            setIsDragging(true);
            setDragStart({ x, y });
            setDragEnd({ x, y });
        }
    };

    const handleMouseMove = (e) => {
        if (isReadOnly) return;
        const rect = overlayRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        if (isMoving && editingAnnotationId) {
            const dx = x - dragStart.x;
            const dy = y - dragStart.y;
            setAnnotations(prev => prev.map(ann => {
                if (ann.id === editingAnnotationId) {
                    if (ann.type === 'comment') {
                        return { ...ann, x: dragStart.originalAnn.x + dx, y: dragStart.originalAnn.y + dy };
                    } else if (ann.data) {
                        return {
                            ...ann,
                            x: dragStart.originalAnn.x + dx,
                            y: dragStart.originalAnn.y + dy,
                            data: { ...ann.data, x: dragStart.originalAnn.data.x + dx, y: dragStart.originalAnn.data.y + dy }
                        };
                    }
                }
                return ann;
            }));
            return;
        }

        if (isDragging && (activeTool === 'highlight' || activeTool === 'strike')) {
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
                ctx.strokeStyle = '#FB923C';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(xMin * width / 100, yMin * height / 100, (xMax - xMin) * width / 100, (yMax - yMin) * height / 100);
                ctx.setLineDash([]);
            } else if (activeTool === 'strike') {
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)';
                ctx.lineWidth = 3;
                const midY = (yMin + (yMax - yMin) / 2) * height / 100;
                ctx.moveTo(xMin * width / 100, midY);
                ctx.lineTo(xMax * width / 100, midY);
                ctx.stroke();
            }
        }
    };

    const handleMouseUp = async (e) => {
        if (isMoving) {
            const finalAnn = annotations.find(a => a.id === editingAnnotationId);
            if (finalAnn) {
                try {
                    await dataService.updateReviewComment(finalAnn.id, {
                        x: finalAnn.x,
                        y: finalAnn.y,
                        annotation_data: finalAnn.data ? JSON.stringify(finalAnn.data) : null
                    });
                    toast.success('Position updated');
                } catch (err) {
                    toast.error('Failed to save position');
                    // Revert? For now keep UI as is
                }
            }
            setIsMoving(false);
            setEditingAnnotationId(null);
            return;
        }

        if (!isDragging) return;
        setIsDragging(false);

        const xMin = Math.min(dragStart.x, dragEnd.x);
        const yMin = Math.min(dragStart.y, dragEnd.y);
        const width = Math.max(dragStart.x, dragEnd.x) - xMin;
        const height = Math.max(dragStart.y, dragEnd.y) - yMin;

        if (width < 0.5 && height < 0.5) {
            setDragStart(null);
            setDragEnd(null);
            return;
        }

        // Instead of API, set pending for mandatory comment
        setPendingAnnotation({
            type: activeTool,
            page: currentPage,
            x: xMin,
            y: yMin,
            data: { x: xMin, y: yMin, width, height }
        });
        setNewCommentPos({ x: xMin, y: yMin });
        setNewCommentText('');
    };

    const handleCanvasClick = async (e) => {
        const rect = overlayRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        // Hit testing for Highlights and Strikes
        const hit = annotations.find(ann => {
            if (ann.page !== currentPage) return false;
            if (ann.type === 'comment') {
                return Math.abs(ann.x - x) < 2 && Math.abs(ann.y - y) < 2;
            } else if (ann.data) {
                const { x: ax, y: ay, width: aw, height: ah } = ann.data;
                return x >= ax && x <= ax + aw && y >= ay && y <= ay + ah;
            }
            return false;
        });

        if (hit) {
            // Select and open edit modal
            setEditingAnnotationId(hit.id);
            setNewCommentText(hit.content);
            setNewCommentPos({ x: hit.x, y: hit.y });

            const el = document.getElementById(`comment-${hit.id}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setHighlightedCommentId(hit.id);
            }
            return;
        }

        if (activeTool !== 'pin' || isReadOnly) return;

        setPendingAnnotation({ type: 'comment', page: currentPage, x, y });
        setNewCommentPos({ x, y });
        setNewCommentText('');
    };

    const handleActionSubmit = async (confirmData) => {
        try {
            const identity = { ...clientIdentity };
            // identity.firstName and lastName are already in clientIdentity

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

    const handleOnboardingSubmit = (identity) => {
        setClientIdentity(identity);
        sessionStorage.setItem(`client_identity_${token}`, JSON.stringify(identity));
        toast.success(`Welcome, ${identity.firstName}!`);
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
        if (!newCommentText.trim()) return;

        try {
            if (editingAnnotationId) {
                // Update existing
                await dataService.updateReviewComment(editingAnnotationId, {
                    content: newCommentText
                });
                setAnnotations(prev => prev.map(a =>
                    a.id === editingAnnotationId ? { ...a, content: newCommentText } : a
                ));
                toast.success('Comment updated');
            } else if (pendingAnnotation) {
                // Create new
                const res = await dataService.createReviewComment(data.versionId, {
                    content: newCommentText,
                    x: pendingAnnotation.x,
                    y: pendingAnnotation.y,
                    page_number: pendingAnnotation.page,
                    type: pendingAnnotation.type,
                    annotation_data: pendingAnnotation.data ? JSON.stringify(pendingAnnotation.data) : null,
                    author_name: clientIdentity ? `${clientIdentity.firstName} ${clientIdentity.lastName}` : 'Client',
                    author_email: clientIdentity?.email || ''
                });

                setAnnotations([...annotations, {
                    id: res.id,
                    page: pendingAnnotation.page,
                    type: pendingAnnotation.type,
                    x: pendingAnnotation.x,
                    y: pendingAnnotation.y,
                    data: pendingAnnotation.data,
                    content: newCommentText,
                    author_name: clientIdentity ? `${clientIdentity.firstName} ${clientIdentity.lastName}` : 'Client',
                    is_resolved: false
                }]);
                toast.success('Annotation added');
            }

            setNewCommentPos(null);
            setNewCommentText('');
            setPendingAnnotation(null);
            setEditingAnnotationId(null);
        } catch (err) {
            toast.error('Failed to save comment');
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen bg-[var(--bg-app)] italic text-[var(--text-muted)]">{t('public_offer.loading')}</div>;

    if (error) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-app)] p-6 text-center">
            <ShieldAlert size={48} className="text-red-500 mb-4" />
            <h3 className="text-lg font-bold">{t('public_review.viewing_history')}</h3>
            <p className="text-[var(--text-secondary)]">{error}</p>
        </div>
    );

    const isPortalMode = !!portalData;

    const isReadOnly = !data.isCurrent || data.status === 'approved';
    const hasComments = annotations.filter(a => !a.is_resolved).length > 0;

    return (
        <div className={`flex flex-col h-screen overflow-hidden font-sans ${isPortalMode ? 'bg-transparent' : 'bg-[#F8F9FA]'}`}>
            {!isPortalMode && (
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

                        <div className={`flex items-center gap-1.5 bg-[#F1F3F5] p-1.5 rounded-2xl border border-gray-200 ${!clientIdentity ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
                            <button
                                disabled={!clientIdentity}
                                onClick={() => setActiveTool('pin')}
                                className={`p-2 rounded-xl transition-all ${activeTool === 'pin' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-white/50'}`}
                                title="Comment Pin"
                            >
                                <MessageSquare size={18} />
                            </button>
                            <button
                                disabled={!clientIdentity}
                                onClick={() => setActiveTool('highlight')}
                                className={`p-2 rounded-xl transition-all ${activeTool === 'highlight' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-white/50'}`}
                                title="Highlight"
                            >
                                <Highlighter size={18} />
                            </button>
                            <button
                                disabled={!clientIdentity}
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
                                    disabled={!clientIdentity}
                                    onClick={() => { setPendingAction('request-changes'); setShowIdentityModal(true); }}
                                    className={`h-11 px-6 rounded-2xl bg-white border-2 border-orange-500 text-orange-500 text-sm font-black hover:bg-orange-50 transition-all active:scale-95 shadow-sm ${!clientIdentity ? 'opacity-30' : ''}`}
                                >
                                    {t('reviews.request_changes').toUpperCase()}
                                </button>
                                <div className="relative group">
                                    <button
                                        disabled={hasComments || !clientIdentity}
                                        onClick={() => { setPendingAction('approve'); setShowIdentityModal(true); }}
                                        className={`h-11 px-8 rounded-2xl bg-emerald-500 text-white text-sm font-black transition-all active:scale-95 shadow-lg shadow-emerald-200 ${hasComments || !clientIdentity ? 'opacity-40 cursor-not-allowed grayscale' : 'hover:brightness-110'}`}
                                    >
                                        {t('reviews.approve')}
                                    </button>
                                    {hasComments && clientIdentity && (
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-gray-900 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center font-bold">
                                            Please resolve all comments before approving.
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-3 px-6 py-2.5 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 text-[12px] font-black uppercase tracking-wider">
                                <CheckCircle2 size={18} />
                                {data?.status === 'approved' ? t('public_review.successfully_approved') : t('public_review.viewing_history')}
                            </div>
                        )}

                        <div className="w-px h-10 bg-gray-100 mx-2" />

                        <a
                            href={`${data?.file_url || ''}?download=1`}
                            download
                            className="p-3 bg-white border border-gray-200 rounded-2xl text-[var(--text-secondary)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-all shadow-sm"
                            title={t('common.download') || 'Download PDF'}
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
            )}

            {isPortalMode && (
                <div className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 shrink-0 shadow-sm z-10 transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 rounded-full text-[var(--text-secondary)] transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            <h2 className="text-sm font-bold text-[var(--text-main)]">{data.title || t('portal.reviews.title')}</h2>
                            <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider">{t('portal.projects.title')}: {data.project_name}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${data.revisions_used >= (data.review_limit || 3) ? 'bg-red-50 border-red-200 text-red-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
                            Revisions: {data.revisions_used || 0}/{data.review_limit || 3}
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-[var(--danger)] gap-2 hover:bg-red-50"
                            onClick={() => navigate(-1)}
                        >
                            <X size={16} />
                            {t('common.back')} to {t('portal.dashboard.welcome')}
                        </Button>
                    </div>
                </div>
            )}

            <div className="flex-1 flex overflow-hidden">
                <main className="flex-1 overflow-auto bg-[#F8F9FA] flex flex-col items-center p-12 custom-scrollbar relative">
                    <div className="relative bg-white shadow-[0_30px_80px_rgba(0,0,0,0.12)] rounded-sm mb-12 border border-gray-100">
                        <canvas ref={canvasRef} className="block" />
                        <canvas
                            ref={overlayRef}
                            className={`absolute top-0 left-0 ${activeTool === 'pin' ? 'cursor-crosshair' : 'cursor-default'}`}
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
                                    placeholder={t('public_review.placeholder')}
                                    value={newCommentText}
                                    onChange={e => setNewCommentText(e.target.value)}
                                    className="w-full h-24 p-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 resize-none font-medium"
                                />
                                <div className="flex gap-2 mt-3">
                                    <button
                                        onClick={() => {
                                            setNewCommentPos(null);
                                            setPendingAnnotation(null);
                                            setEditingAnnotationId(null);
                                        }}
                                        className="flex-1 px-3 py-2 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:bg-gray-100 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCommentSubmit}
                                        className="flex-1 px-3 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-black shadow-lg shadow-[var(--primary)]/20 transition-all active:scale-95"
                                    >
                                        {editingAnnotationId ? t('public_review.update') : t('public_review.add_comment')}
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
                            setEditingAnnotationId(c.id);
                            setHighlightedPinId(c.id);
                            setTimeout(() => setHighlightedPinId(null), 3000);
                        }}
                        onResolveComment={confirmDelete}
                    />
                )}
            </div>

            <ClientOnboardingModal
                isOpen={!clientIdentity && data}
                onSubmit={handleOnboardingSubmit}
                data={data}
            />

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
