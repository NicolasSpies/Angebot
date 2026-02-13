import React, { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { X, Eraser, Check, Loader2 } from 'lucide-react';

const SigningForm = ({ onConfirm, onCancel, isSubmitting }) => {
    const sigCanvas = useRef({});
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [company, setCompany] = useState('');
    const [error, setError] = useState(null);
    const [isSignatureEmpty, setIsSignatureEmpty] = useState(true);

    const handleCanvasEnd = () => {
        setIsSignatureEmpty(sigCanvas.current.isEmpty());
        setError(null);
    };

    const clear = () => {
        sigCanvas.current.clear();
        setIsSignatureEmpty(true);
        setError(null);
    };

    const isValid = name.trim().length > 0 && email.trim().length > 0 && !isSignatureEmpty;

    const handleSubmit = async () => {
        if (isSubmitting) return;

        if (!isValid) {
            setError('Please fill in all required fields and sign the document.');
            return;
        }

        // Double check signature content
        if (sigCanvas.current.isEmpty()) {
            setError('Signature is empty. Please sign again.');
            return;
        }

        try {
            // using getCanvas() for better stability than getTrimmedCanvas()
            const signatureData = sigCanvas.current.getCanvas().toDataURL('image/png');
            await onConfirm({ name, email, company, signatureData });
        } catch (err) {
            console.error('Signature capture error:', err);
            setError(err.message || 'Failed to capture signature. Please try again.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Sign Offer</h3>
                        <p className="text-sm text-gray-500 mt-1">Please confirm your details to finalize acceptance.</p>
                    </div>
                    <button
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={isSubmitting}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-900 placeholder-gray-400 disabled:opacity-50"
                                placeholder="e.g. John Doe"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                Email Address <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isSubmitting}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-900 placeholder-gray-400 disabled:opacity-50"
                                placeholder="e.g. john@company.com"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                Company (Optional)
                            </label>
                            <input
                                type="text"
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                                disabled={isSubmitting}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-900 placeholder-gray-400 disabled:opacity-50"
                                placeholder="e.g. Acme Corp"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Signature <span className="text-red-500">*</span>
                                </label>
                                <button
                                    onClick={clear}
                                    type="button"
                                    disabled={isSubmitting}
                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded transition-colors disabled:opacity-50"
                                >
                                    <Eraser size={12} /> Clear
                                </button>
                            </div>
                            <div className={`border rounded-xl overflow-hidden bg-white shadow-sm ring-1 transition-shadow ${isSignatureEmpty ? 'border-gray-200 ring-gray-900/5' : 'border-blue-200 ring-blue-500/20'}`}>
                                <SignatureCanvas
                                    ref={sigCanvas}
                                    penColor="black"
                                    onEnd={handleCanvasEnd}
                                    canvasProps={{
                                        className: `w-full h-40 bg-white cursor-crosshair ${isSubmitting ? 'pointer-events-none opacity-50' : ''}`,
                                    }}
                                />
                            </div>
                            <div className="flex justify-between mt-2">
                                <p className="text-[11px] text-gray-400 leading-relaxed">
                                    I agree to be legally bound by this electronic signature.
                                </p>
                                {isSignatureEmpty && <span className="text-[11px] text-red-400 font-medium animate-pulse">Signature required</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-200/50 rounded-lg transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!isValid || isSubmitting}
                        className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[140px] justify-center"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Check size={16} />
                                Confirm & Sign
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SigningForm;
