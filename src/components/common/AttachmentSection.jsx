import React, { useState, useEffect } from 'react';
import { dataService } from '../../data/dataService';
import { Paperclip, Download, File, Trash2, Loader2, Plus, UploadCloud, FileText, Image } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';

const AttachmentSection = ({ entityType, entityId }) => {
    const [attachments, setAttachments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (entityId) {
            loadAttachments();
        }
    }, [entityId, entityType]);

    const loadAttachments = async () => {
        setIsLoading(true);
        try {
            const data = await dataService.getAttachments(entityType, entityId);
            setAttachments(data || []);
        } catch (err) {
            console.error('Failed to load attachments', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            // 1. Upload file to get path
            const uploadRes = await dataService.uploadFile(file);

            if (uploadRes.filePath) {
                // 2. Add as attachment record
                await dataService.addAttachment(entityType, entityId, {
                    file_name: uploadRes.fileName || file.name,
                    file_path: uploadRes.filePath,
                    file_size: uploadRes.fileSize || file.size,
                    file_type: uploadRes.fileType || file.type
                });

                // 3. Refresh list
                await loadAttachments();
            }
        } catch (err) {
            console.error('Upload failed', err);
            alert('Failed to upload file');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this attachment?')) return;

        try {
            await dataService.deleteAttachment(id);
            setAttachments(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            console.error('Delete failed', err);
        }
    };

    const formatSize = (bytes) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileIcon = (type) => {
        if (type?.includes('image')) return <Image size={18} />;
        if (type?.includes('pdf')) return <FileText size={18} />;
        return <File size={18} />;
    };

    if (!entityId) return null;

    return (
        <Card padding="1.5rem" className="border border-[var(--border-subtle)] shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h4 className="text-[13px] font-extrabold text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2">
                    <Paperclip size={16} className="text-[var(--primary)]" />
                    Artifacts & Assets
                </h4>
                <div className="relative">
                    <input
                        type="file"
                        id={`file-upload-${entityId}`}
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                    />
                    <label
                        htmlFor={`file-upload-${entityId}`}
                        className={`
                            flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer
                            ${isUploading
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-[var(--primary-light)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white shadow-sm'}
                        `}
                    >
                        {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                        {isUploading ? 'Uploading...' : 'Upload'}
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
                {isLoading ? (
                    <div className="py-8 text-center text-[var(--text-muted)] flex flex-col items-center gap-2">
                        <Loader2 size={24} className="animate-spin opacity-20" />
                        <span className="text-[12px] font-medium">Loading files...</span>
                    </div>
                ) : attachments.length === 0 ? (
                    <div className="py-10 border-2 border-dashed border-[var(--border-subtle)] rounded-xl flex flex-col items-center justify-center bg-[var(--bg-active)]/30 group hover:bg-[var(--bg-active)]/50 transition-colors">
                        <UploadCloud size={32} className="text-[var(--text-muted)] opacity-20 mb-3 group-hover:scale-110 transition-transform" />
                        <p className="text-[12px] text-[var(--text-muted)] font-medium">No documents attached yet.</p>
                        <label htmlFor={`file-upload-${entityId}`} className="text-[11px] text-[var(--primary)] font-bold mt-1 cursor-pointer hover:underline">Click to upload first document</label>
                    </div>
                ) : (
                    attachments.map(file => (
                        <div key={file.id} className="group flex items-center justify-between p-3 bg-[var(--bg-active)]/50 border border-transparent hover:border-[var(--border-subtle)] hover:bg-white rounded-lg transition-all">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2 rounded-lg bg-white border border-[var(--border-subtle)] text-[var(--text-muted)]">
                                    {getFileIcon(file.file_type)}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[13px] font-bold text-[var(--text-main)] truncate block">
                                        {file.file_name}
                                    </span>
                                    <span className="text-[10px] text-[var(--text-muted)] font-medium uppercase">
                                        {formatSize(file.file_size)} • {new Date(file.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a
                                    href={file.file_path}
                                    download={file.file_name}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--primary-light)] rounded-lg transition-colors"
                                >
                                    <Download size={14} />
                                </a>
                                <button
                                    onClick={() => handleDelete(file.id)}
                                    className="p-2 text-[var(--text-secondary)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Card>
    );
};

export default AttachmentSection;
