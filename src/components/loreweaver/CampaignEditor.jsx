import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useCampaignEntities } from '../../hooks/useCampaign';
import EntityEditor from './EntityEditor';

const TABS = [
    { key: 'arcs', label: '📖 Arcs', icon: '📖' },
    { key: 'npcs', label: '👤 NPCs', icon: '👤' },
    { key: 'bestiary', label: '🐉 Bestiary', icon: '🐉' },
    { key: 'items', label: '⚔️ Items', icon: '⚔️' },
    { key: 'quests', label: '📜 Quests', icon: '📜' },
    { key: 'maps', label: '🗺️ Maps', icon: '🗺️' },
];

const RARITY_COLORS = {
    common: '#aaa',
    uncommon: '#4caf50',
    rare: '#2196f3',
    epic: '#9c27b0',
    legendary: '#ff9800',
};

const ROLE_COLORS = {
    ally: '#4caf50',
    enemy: '#f44336',
    neutral: '#8888aa',
    merchant: '#ff9800',
    'quest-giver': '#2196f3',
    boss: '#9c27b0',
};

function EntityList({ campaignId, entityType }) {
    const { entities, loading, createEntity, updateEntity, deleteEntity } = useCampaignEntities(campaignId, entityType);
    const [editing, setEditing] = useState(null); // null = closed, {} = new, {id, ...} = editing
    const [deleting, setDeleting] = useState(null);

    const handleSave = async (data) => {
        if (data.id) {
            await updateEntity(data.id, data);
        } else {
            await createEntity(data);
        }
        setEditing(null);
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this entry?')) return;
        setDeleting(id);
        await deleteEntity(id);
        setDeleting(null);
    };

    const getDisplayName = (e) => e.name || e.title || 'Untitled';

    if (loading) {
        return <div className="loading-state"><div className="loading-spinner" /><p>Loading...</p></div>;
    }

    return (
        <div className="entity-list-section">
            <button className="action-btn primary-btn compact" onClick={() => setEditing({})}>
                + Add New
            </button>

            {entities.length === 0 ? (
                <div className="empty-inline">
                    <p>No entries yet. Click "Add New" to create one.</p>
                </div>
            ) : (
                <div className="entity-table">
                    {entities.map((entity) => (
                        <div key={entity.id} className="entity-row" onClick={() => setEditing(entity)}>
                            <div className="entity-row-info">
                                <span className="entity-row-name">{getDisplayName(entity)}</span>
                                {entity.rarity && (
                                    <span className="rarity-badge" style={{ color: RARITY_COLORS[entity.rarity] }}>
                                        {entity.rarity}
                                    </span>
                                )}
                                {entity.role && (
                                    <span className="role-badge" style={{ color: ROLE_COLORS[entity.role] }}>
                                        {entity.role}
                                    </span>
                                )}
                                {entity.type && <span className="type-badge">{entity.type}</span>}
                                {entity.status && <span className="status-tag">{entity.status}</span>}
                                {entity.hp !== undefined && <span className="hp-tag">❤️ {entity.hp}</span>}
                                {entity.xp_reward && <span className="xp-tag">⭐ {entity.xp_reward} XP</span>}
                            </div>
                            <div className="entity-row-actions" onClick={(e) => e.stopPropagation()}>
                                <button
                                    className="icon-btn danger"
                                    onClick={() => handleDelete(entity.id)}
                                    disabled={deleting === entity.id}
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {editing !== null && (
                <EntityEditor
                    entityType={entityType}
                    entity={editing.id ? editing : null}
                    onSave={handleSave}
                    onCancel={() => setEditing(null)}
                />
            )}
        </div>
    );
}

export default function CampaignEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [campaign, setCampaign] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('arcs');
    const [editingInfo, setEditingInfo] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [worldLore, setWorldLore] = useState('');

    useEffect(() => {
        const fetchCampaign = async () => {
            const { data, error } = await supabase
                .from('campaigns')
                .select('*')
                .eq('id', id)
                .single();
            if (error || !data) {
                navigate('/loreweaver');
                return;
            }
            setCampaign(data);
            setTitle(data.title);
            setDescription(data.description || '');
            setWorldLore(data.world_lore || '');
            setLoading(false);
        };
        fetchCampaign();
    }, [id, navigate]);

    const saveInfo = async () => {
        const { data } = await supabase
            .from('campaigns')
            .update({ title, description, world_lore: worldLore })
            .eq('id', id)
            .select()
            .single();
        if (data) setCampaign(data);
        setEditingInfo(false);
    };

    if (loading) {
        return (
            <div className="page-container">
                <div className="loading-state"><div className="loading-spinner" /><p>Loading campaign...</p></div>
            </div>
        );
    }

    return (
        <div className="page-container campaign-editor">
            <div className="page-header">
                <div>
                    <button className="back-btn" onClick={() => navigate('/loreweaver')}>← Back</button>
                    {editingInfo ? (
                        <div className="inline-edit">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="inline-title-input"
                            />
                            <div className="inline-edit-actions">
                                <button className="wizard-btn primary compact" onClick={saveInfo}>Save</button>
                                <button className="wizard-btn secondary compact" onClick={() => setEditingInfo(false)}>Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h1 className="page-title" onClick={() => setEditingInfo(true)} style={{ cursor: 'pointer' }}>
                                {campaign.title} ✏️
                            </h1>
                            {campaign.description && <p className="page-subtitle">{campaign.description}</p>}
                        </>
                    )}
                    <div className="campaign-meta">
                        <span className="meta-item">🔑 Invite: <code>{campaign.invite_code}</code></span>
                        <span className="meta-item">📊 {campaign.status}</span>
                    </div>
                </div>
            </div>

            <div className="tabs-container">
                <div className="tabs-header">
                    {TABS.map((tab) => (
                        <button
                            key={tab.key}
                            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="tab-content">
                    {activeTab === 'maps' ? (
                        <div className="empty-inline">
                            <p>🗺️ Map management coming soon! For now, use the Map Forge to create maps.</p>
                        </div>
                    ) : (
                        <EntityList campaignId={id} entityType={activeTab} />
                    )}
                </div>
            </div>
        </div>
    );
}
