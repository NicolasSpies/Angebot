import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Briefcase, Users, ArrowRight, Command } from 'lucide-react';
import { dataService } from '../data/dataService';

const CommandPalette = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState({ pages: [], projects: [], offers: [], customers: [] });
    const [selectedIndex, setSelectedIndex] = useState(0);
    const navigate = useNavigate();
    const inputRef = useRef(null);
    const listRef = useRef(null);

    // Toggle with Cmd+K / Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
            // Load initial data or suggestions? 
            // For now, let's just search on type, or pre-fill with some recent items if we had that data.
            search('');
        } else {
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    const search = async (q) => {
        if (!q.trim()) {
            setResults({
                pages: [
                    { type: 'page', title: 'Dashboard', path: '/dashboard', icon: Command },
                    { type: 'page', title: 'Projects', path: '/projects', icon: Briefcase },
                    { type: 'page', title: 'Offers', path: '/offers', icon: FileText },
                    { type: 'page', title: 'Customers', path: '/customers', icon: Users },
                ],
                projects: [],
                offers: [],
                customers: []
            });
            return;
        }

        try {
            // In a real app, this would be a single optimized search endpoint
            // For now, we'll fetch and filter client-side or use the existing search endpoint if available
            // Let's use dataService.search if it exists, or simulated specific fetches

            // Checking dataService, it has a search(query) method!
            const searchResults = await dataService.search(q);

            setResults({
                pages: [], // Hide pages when searching specific items?? Or keep matching pages?
                projects: searchResults.projects || [],
                offers: searchResults.offers || [],
                customers: searchResults.customers || []
            });
        } catch (err) {
            console.error(err);
        }
    };

    // Debounced Search
    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(() => search(query), 300);
        return () => clearTimeout(timer);
    }, [query, isOpen]);

    // Flatten results for navigation
    const flatResults = [
        ...(results.pages || []),
        ...(results.projects || []),
        ...(results.offers || []),
        ...(results.customers || [])
    ];

    const handleSelect = (item) => {
        setIsOpen(false);
        if (item.type === 'page') navigate(item.path);
        else if (item.type === 'project' || item.id) navigate(`/${item.type || 'projects'}/${item.id}`); // Backend search response format depends on dataService.search implementation
        // Adjusting navigation based on typical dataService response:
        // Projects: /projects/:id
        // Offers: /offer/preview/:id ? Or edit? Let's go to preview.
        // Customers: /customers/:id

        if (item.entityType === 'project') navigate(`/projects/${item.id}`);
        if (item.entityType === 'offer') navigate(`/offer/preview/${item.id}`);
        if (item.entityType === 'customer') navigate(`/customers/${item.id}`);
    };

    // Keyboard Navigation
    useEffect(() => {
        if (!isOpen) return;
        const handleNav = (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % flatResults.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + flatResults.length) % flatResults.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (flatResults[selectedIndex]) handleSelect(flatResults[selectedIndex]);
            }
        };
        window.addEventListener('keydown', handleNav);
        return () => window.removeEventListener('keydown', handleNav);
    }, [isOpen, flatResults, selectedIndex]);

    // Ensure selected item is visible
    useEffect(() => {
        if (listRef.current) {
            const selectedElement = listRef.current.children[selectedIndex];
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-[var(--border)] overflow-hidden flex flex-col max-h-[60vh] animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--border-subtle)]">
                    <Search size={20} className="text-[var(--text-muted)]" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Type a command or search..."
                        className="flex-1 text-lg font-medium placeholder-[var(--text-muted)] bg-transparent border-none outline-none text-[var(--text-main)]"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                    />
                    <div className="flex items-center gap-1">
                        <kbd className="px-2 py-1 text-[10px] font-bold text-[var(--text-muted)] bg-[var(--bg-subtle)] rounded border border-[var(--border-subtle)]">ESC</kbd>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2" ref={listRef}>
                    {flatResults.length === 0 ? (
                        <div className="py-12 text-center text-[var(--text-muted)]">
                            <p className="text-sm font-medium">No results found.</p>
                        </div>
                    ) : (
                        flatResults.map((item, index) => (
                            <div
                                key={`${item.type}-${item.id || item.title}-${index}`}
                                onClick={() => handleSelect(item)}
                                className={`flex items-center justify-between px-3 py-3 rounded-lg cursor-pointer transition-colors ${index === selectedIndex ? 'bg-[var(--primary)] text-white' : 'hover:bg-[var(--bg-subtle)] text-[var(--text-main)]'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-md flex items-center justify-center ${index === selectedIndex ? 'bg-white/20 text-white' : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                                        }`}>
                                        {item.icon ? <item.icon size={16} /> :
                                            item.entityType === 'project' ? <Briefcase size={16} /> :
                                                item.entityType === 'offer' ? <FileText size={16} /> :
                                                    <Users size={16} />
                                        }
                                    </div>
                                    <div>
                                        <p className="text-[14px] font-bold">{item.title || item.name || item.company_name || item.offer_name}</p>
                                        <div className="flex items-center gap-2 text-[11px] opacity-80">
                                            <span className="uppercase tracking-wider font-bold">
                                                {item.type === 'page' ? 'Go to Page' : item.entityType || 'Result'}
                                            </span>
                                            {item.status && (
                                                <>
                                                    <span>•</span>
                                                    <span className="capitalize">{item.status.replace('_', ' ')}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {index === selectedIndex && <ArrowRight size={16} className="opacity-80" />}
                            </div>
                        ))
                    )}
                </div>

                <div className="bg-[var(--bg-subtle)] px-4 py-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)] font-medium">
                    <div className="flex gap-4">
                        <span><span className="font-bold">↑↓</span> to navigate</span>
                        <span><span className="font-bold">↵</span> to select</span>
                    </div>
                    <span>Global Search</span>
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
