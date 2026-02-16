import React, { useState, useEffect } from 'react';
import { dataService } from '../data/dataService';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';

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
                deadline: deadline || null
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

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Project">
            <form onSubmit={handleSubmit}>
                <Input
                    label="Project Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Website Redesign"
                    required
                />

                <div className="grid grid-cols-2 gap-4">
                    <Select
                        label="Status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        options={[
                            { value: 'todo', label: 'To Do', color: '#64748b' },
                            { value: 'in_progress', label: 'In Progress', color: '#3b82f6' },
                            { value: 'on_hold', label: 'On Hold', color: '#f59e0b' },
                            { value: 'completed', label: 'Completed', color: '#10b981' },
                            { value: 'cancelled', label: 'Cancelled', color: '#ef4444' }
                        ]}
                    />
                    <Input
                        label="Deadline (Optional)"
                        type="date"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                    />
                </div>

                <Select
                    label="Customer (Optional)"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    options={[
                        { value: '', label: 'No customer' },
                        ...customers.map(c => ({ value: c.id, label: c.company_name }))
                    ]}
                />
                <Select
                    label="Link to Offer (Optional)"
                    value={offerId}
                    onChange={(e) => setOfferId(e.target.value)}
                    options={[
                        { value: '', label: 'No offer' },
                        ...offers.map(o => ({ value: o.id, label: `${o.offer_name || `#${o.id}`} (${o.status})` }))
                    ]}
                />
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                    <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Creating...' : 'Create Project'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateProjectModal;
