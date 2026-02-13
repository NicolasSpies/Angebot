import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';

const DeclineModal = ({ onConfirm, onCancel, isSubmitting }) => {
    const [reason, setReason] = useState('');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-red-100 flex flex-col">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 bg-red-50/30 flex justify-between items-start">
                    <div className="flex gap-3">
                        <div className="p-2 bg-red-100/50 rounded-lg text-red-600">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Decline Offer?</h3>
                            <p className="text-sm text-gray-500 mt-1">This action cannot be undone.</p>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Reason for declining (Optional)
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium text-gray-900 placeholder-gray-400 min-h-[120px] resize-none"
                        placeholder="e.g. Price is too high, project cancelled, etc."
                        disabled={isSubmitting}
                    />
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <Button
                        variant="ghost"
                        onClick={onCancel}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="danger" // Assuming Button supports this or className override
                        className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20"
                        onClick={() => onConfirm(reason)}
                        disabled={isSubmitting}
                        isLoading={isSubmitting}
                    >
                        Decline Offer
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default DeclineModal;
