import React, { useState, useEffect } from 'react';
import { dataService } from '../data/dataService';
import Select from './ui/Select';
import { FolderPlus, Calendar, User, FileText, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

const CreateProjectModal = ({ isOpen, onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [offerId, setOfferId] = useState('');
    const [status, setStatus] = useState('todo');
    const [deadline, setDeadline] = useState('');
    const [customers, setCustomers] = useState([]);
    const [offers, setOffers] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            dataService.getCustomers().then(setCustomers);
            dataService.getOffers().then(data => {
                setOffers(data.filter(o => o.status === 'signed' || o.status === 'sent'));
            });
        }
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await dataService.createProject({
                name,
                customer_id: customerId || null,
                offer_id: offerId || null,
                status,
                deadline: deadline || null,
                review_limit: 3 // Default back-end value preserved
            });
            onSuccess();
            onClose();
            setName('');
            setCustomerId('');
            setOfferId('');
            setStatus('todo');
            setDeadline('');
        } catch (error) {
            console.error('Failed to create project', error);
        }
        setIsSubmitting(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
            <div
                className="bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] max-w-lg w-full p-10 animate-in zoom-in-95 duration-300"
                onClick={e => e.stopPropagation()}
            >
                <div className="w-16 h-16 bg-[var(--primary-light)] text-[var(--primary)] rounded-2xl flex items-center justify-center mb-8 mx-auto shadow-sm">
                    <FolderPlus size={32} />
                </div>

                <div className="text-center mb-10">
                    <h2 className="text-2xl font-black text-[var(--text-main)] mb-3">Create New Project</h2>
                    <p className="text-[var(--text-secondary)] text-sm leading-relaxed px-4">
                        Set up your project details to begin collaborating with your clients.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.15em] ml-1">Project Name</label>
                        <input
                            type="text"
                            required
                            autoFocus
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all text-[15px] font-medium"
                            placeholder="e.g. Website Redesign"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.15em] ml-1">Status</label>
                            <Select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                triggerStyle={{ height: '56px', borderRadius: '1rem', backgroundColor: '#F9FAFB', border: '1px solid #F3F4F6' }}
                                options={[
                                    { value: 'todo', label: 'To Do', color: '#64748b' },
                                    { value: 'in_progress', label: 'In Progress', color: '#3b82f6' },
                                    { value: 'on_hold', label: 'On Hold', color: '#f59e0b' },
                                    { value: 'done', label: 'Done', color: '#10b981' },
                                    { value: 'cancelled', label: 'Cancelled', color: '#ef4444' }
                                ]}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.15em] ml-1">Deadline (Optional)</label>
                            <input
                                type="date"
                                value={deadline}
                                onChange={e => setDeadline(e.target.value)}
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all text-[15px] font-medium h-[56px]"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.15em] ml-1">Customer (Optional)</label>
                        <Select
                            value={customerId}
                            onChange={(e) => setCustomerId(e.target.value)}
                            triggerStyle={{ height: '56px', borderRadius: '1rem', backgroundColor: '#F9FAFB', border: '1px solid #F3F4F6' }}
                            placeholder="Select customer..."
                            options={[
                                { value: '', label: 'No customer' },
                                ...customers.map(c => ({ value: c.id, label: c.company_name }))
                            ]}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.15em] ml-1">Link to Offer (Optional)</label>
                        <Select
                            value={offerId}
                            onChange={(e) => setOfferId(e.target.value)}
                            triggerStyle={{ height: '56px', borderRadius: '1rem', backgroundColor: '#F9FAFB', border: '1px solid #F3F4F6' }}
                            placeholder="Select offer..."
                            options={[
                                { value: '', label: 'No offer' },
                                ...offers.map(o => ({ value: o.id, label: `${o.offer_name || `#${o.id}`} (${o.status})` }))
                            ]}
                        />
                    </div>

                    <div className="flex gap-4 mt-12 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-5 rounded-[1.5rem] text-[15px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:bg-gray-100 transition-all active:scale-[0.98]"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !name}
                            className="flex-[1.5] btn-primary py-5 rounded-[1.5rem] text-[15px] font-black uppercase tracking-widest shadow-xl shadow-[var(--primary)]/20 disabled:opacity-30 disabled:grayscale transition-all hover:translate-y-[-2px] active:translate-y-[0px]"
                        >
                            {isSubmitting ? 'Creating...' : 'Create Project'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateProjectModal;
