import React, { useState, useRef } from 'react';
import { dataService } from '../../data/dataService';
import { X, Upload, File, AlertCircle, CheckCircle } from 'lucide-react';
import Button from '../ui/Button';

const ReviewUploadModal = ({ isOpen, onClose, projectId, onUploadSuccess, initialTitle = '' }) => {
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState(initialTitle || 'Project Review');
    const [limit, setLimit] = useState(3);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            if (selectedFile.type !== 'application/pdf') {
                setError('Please select a PDF file.');
                setFile(null);
                return;
            }
            if (selectedFile.size > 50 * 1024 * 1024) {
                setError('File size exceeds 50MB limit.');
                setFile(null);
                return;
            }
            setFile(selectedFile);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file || !projectId) return;

        setIsUploading(true);
        setError(null);
        try {
            await dataService.uploadReview(projectId, file, title, limit);
            setSuccess(true);
            setTimeout(() => {
                onUploadSuccess();
                handleClose();
            }, 1500);
        } catch (err) {
            console.error('Upload failed:', err);
            setError('Failed to upload file. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setError(null);
        setSuccess(false);
        setIsUploading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[var(--bg-surface)] w-full max-w-md rounded-[var(--radius-lg)] shadow-2xl border border-[var(--border-subtle)] overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
                    <h3 className="text-[16px] font-bold text-[var(--text-main)]">Upload Review Version</h3>
                    <button onClick={handleClose} className="p-1 hover:bg-[var(--bg-app)] rounded-full transition-colors">
                        <X size={20} className="text-[var(--text-secondary)]" />
                    </button>
                </div>

                <div className="p-6">
                    {success ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="w-16 h-16 bg-[var(--success-bg)] rounded-full flex items-center justify-center mb-4">
                                <CheckCircle size={32} className="text-[var(--success)]" />
                            </div>
                            <h4 className="text-[18px] font-bold text-[var(--text-main)]">Upload Successful!</h4>
                            <p className="text-[14px] text-[var(--text-secondary)] mt-2">The new review version has been saved.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[11px] font-black uppercase text-[var(--text-muted)] tracking-wider mb-2 block">Review Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        disabled={!!initialTitle}
                                        placeholder="e.g. Logo Design, Website Mockup"
                                        className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-xl text-[14px] font-bold focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition-all outline-none disabled:opacity-50"
                                    />
                                </div>
                                {!initialTitle && (
                                    <div>
                                        <label className="text-[11px] font-black uppercase text-[var(--text-muted)] tracking-wider mb-2 block">Revision Limit (Credits)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={limit}
                                            onChange={(e) => setLimit(parseInt(e.target.value))}
                                            className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-xl text-[14px] font-bold focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition-all outline-none"
                                        />
                                    </div>
                                )}
                            </div>

                            <div
                                className={`border-2 border-dashed rounded-[var(--radius-lg)] p-8 text-center transition-all cursor-pointer
                                    ${file ? 'border-[var(--primary)] bg-[var(--primary-light)]/5' : 'border-[var(--border-strong)] hover:border-[var(--primary)] hover:bg-[var(--bg-app)]'}
                                `}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="application/pdf"
                                    onChange={handleFileChange}
                                />
                                <div className="flex flex-col items-center gap-3">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center
                                        ${file ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-app)] text-[var(--text-muted)]'}
                                    `}>
                                        {file ? <File size={24} /> : <Upload size={24} />}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <p className="text-[14px] font-bold text-[var(--text-main)]">
                                            {file ? file.name : 'Click or drop PDF here'}
                                        </p>
                                        <p className="text-[12px] text-[var(--text-secondary)]">
                                            {file ? `(${(file.size / 1024 / 1024).toFixed(2)} MB)` : 'Maximum file size: 50MB'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-3 p-3 bg-red-50 text-[var(--danger)] rounded-[var(--radius-md)] text-[13px] font-medium border border-red-100">
                                    <AlertCircle size={16} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={handleClose}
                                    disabled={isUploading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={handleUpload}
                                    disabled={!file || isUploading}
                                    loading={isUploading}
                                >
                                    {isUploading ? 'Uploading...' : 'Start Upload'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReviewUploadModal;
