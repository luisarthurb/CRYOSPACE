import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useCampaigns } from '../../hooks/useCampaign';
import { useNavigate } from 'react-router-dom';

const STATUS_COLORS = {
    draft: '#8888aa',
    active: '#4caf50',
    paused: '#ff9800',
    completed: '#2196f3',
    archived: '#666',
};

export default function CampaignList() {
    const { user } = useAuth();
    const { campaigns, loading, createCampaign, deleteCampaign } = useCampaigns(user?.id);
    const navigate = useNavigate();
    const [showCreate, setShowCreate] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [creating, setCreating] = useState(false);

    const handleCreate = async () => {
        if (!title.trim()) return;
        setCreating(true);
        try {
            const campaign = await createCampaign({
                title: title.trim(),
                description: description.trim(),
            });
            setShowCreate(false);
            setTitle('');
            setDescription('');
            navigate(`/loreweaver/${campaign.id}`);
        } catch (err) {
            alert(err.message);
        }
        setCreating(false);
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!confirm('Delete this campaign? This will remove all its content.')) return;
        try {
            await deleteCampaign(id);
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">📖 Lore Weaver</h1>
                    <p className="page-subtitle">Create and manage your campaigns</p>
                </div>
                <button className="action-btn primary-btn" onClick={() => setShowCreate(true)}>
                    ✨ New Campaign
                </button>
            </div>

            {loading ? (
                <div className="loading-state">
                    <div className="loading-spinner" />
                    <p>Loading campaigns...</p>
                </div>
            ) : campaigns.length === 0 ? (
                <div className="empty-state">
                    <span className="empty-icon">📜</span>
                    <h3>No campaigns yet</h3>
                    <p>Create your first campaign and start building your world!</p>
                    <button className="action-btn primary-btn" onClick={() => setShowCreate(true)}>
                        ✨ Create Campaign
                    </button>
                </div>
            ) : (
                <div className="card-grid">
                    {campaigns.map((c) => (
                        <div key={c.id} className="entity-card campaign-card" onClick={() => navigate(`/loreweaver/${c.id}`)}>
                            <div className="card-info">
                                <div className="card-top-row">
                                    <h3 className="card-name">{c.title}</h3>
                                    <span className="status-badge" style={{ color: STATUS_COLORS[c.status] }}>
                                        {c.status}
                                    </span>
                                </div>
                                {c.description && <p className="card-description">{c.description}</p>}
                                <div className="card-meta">
                                    <span>🔑 {c.invite_code}</span>
                                    <span>📅 {new Date(c.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                                <button className="icon-btn danger" onClick={(e) => handleDelete(c.id, e)} title="Delete">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showCreate && (
                <div className="wizard-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                        <h2>Create New Campaign</h2>
                        <div className="form-field">
                            <label>Campaign Title</label>
                            <input
                                type="text"
                                placeholder="The Lost Kingdom of Eldra..."
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="form-field">
                            <label>Description <span className="opt">(optional)</span></label>
                            <textarea
                                placeholder="A brief summary of your campaign's premise..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="wizard-btn secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                            <button className="wizard-btn primary" onClick={handleCreate} disabled={creating || !title.trim()}>
                                {creating ? 'Creating...' : '✨ Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
