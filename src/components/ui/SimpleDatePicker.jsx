import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

const SimpleDatePicker = ({ value, onChange, className = "" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
    const triggerRef = useRef(null);
    const menuRef = useRef(null);

    const selectedDate = value ? new Date(value) : null;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                triggerRef.current && !triggerRef.current.contains(event.target) &&
                menuRef.current && !menuRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const handlePrevMonth = (e) => {
        e.stopPropagation();
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = (e) => {
        e.stopPropagation();
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const handleSelectDate = (day) => {
        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        onChange(newDate.toISOString().split('T')[0]);
        setIsOpen(false);
    };

    const years = [];
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 5; i <= currentYear + 10; i++) years.push(i);

    const renderCalendar = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const days = [];
        const firstDay = firstDayOfMonth(year, month);
        const totalDays = daysInMonth(year, month);

        // Fill empty slots for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-9 w-9" />);
        }

        // Fill days of current month
        for (let d = 1; d <= totalDays; d++) {
            const dateStr = new Date(year, month, d).toISOString().split('T')[0];
            const isSelected = value === dateStr;
            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            days.push(
                <button
                    key={d}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleSelectDate(d);
                    }}
                    className={`h-9 w-9 rounded-lg text-[13px] font-bold transition-all flex items-center justify-center
                        ${isSelected ? 'bg-[var(--primary)] text-white shadow-md scale-105' :
                            isToday ? 'bg-[var(--primary-light)]/20 text-[var(--primary)]' :
                                'hover:bg-[var(--bg-app)] text-[var(--text-main)]'}
                    `}
                >
                    {d}
                </button>
            );
        }
        return days;
    };

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    return (
        <div className={`relative ${className}`} ref={triggerRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full h-[42px] px-3 flex items-center justify-between text-[14px] font-medium bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] outline-none transition-all cursor-pointer select-none hover:border-[var(--border-medium)]
                    ${isOpen ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/10' : ''}
                `}
            >
                <div className="flex items-center gap-2">
                    <CalendarIcon size={16} className="text-[var(--text-muted)]" />
                    <span className={value ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}>
                        {value ? new Date(value).toLocaleDateString() : 'Pick a date'}
                    </span>
                </div>
            </div>

            {isOpen && createPortal(
                <div
                    ref={menuRef}
                    className="fixed z-[var(--z-popover)] bg-white border border-[var(--border-medium)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] p-4 animate-in fade-in zoom-in-95 duration-200"
                    style={{
                        top: triggerRef.current ? triggerRef.current.getBoundingClientRect().bottom + 4 : 0,
                        left: triggerRef.current ? Math.min(triggerRef.current.getBoundingClientRect().left, window.innerWidth - 320) : 0,
                        width: '300px'
                    }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={handlePrevMonth} className="p-1.5 hover:bg-[var(--bg-app)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                            <ChevronLeft size={18} />
                        </button>
                        <div className="text-[14px] font-extrabold text-[var(--text-main)]">
                            {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
                        </div>
                        <button onClick={handleNextMonth} className="p-1.5 hover:bg-[var(--bg-app)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                            <div key={day} className="h-9 w-9 flex items-center justify-center text-[11px] font-black text-[var(--text-muted)] uppercase tracking-tighter">
                                {day}
                            </div>
                        ))}
                        {renderCalendar()}
                    </div>

                    <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                            }}
                            className="text-[12px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)]"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange(new Date().toISOString().split('T')[0]);
                                setIsOpen(false);
                            }}
                            className="text-[12px] font-bold text-[var(--primary)] hover:underline"
                        >
                            Today
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default SimpleDatePicker;
