import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useCampaigns } from '../../hooks/useCampaign';

export default function SessionLobby() {
    const { campaignId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [campaign, setCampaign] = useState(null);
    const [maps, setMaps] = useState([]);
    const [selectedMapId, setSelectedMapId] = useState(null);
    const [players, setPlayers] = useState([]);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!campaignId) return;
        // Fetch campaign
        supabase.from('campaigns').select('*').eq('id', campaignId).single()
            .then(({ data }) => setCampaign(data));
        // Fetch maps
        supabase.from('maps').select('*').eq('campaign_id', campaignId)
            .then(({ data }) => setMaps(data || []));
        // Fetch players
        supabase.from('campaign_players').select('*, profiles(display_name, avatar_url), characters(name, race, class)')
            .eq('campaign_id', campaignId)
            .then(({ data }) => setPlayers(data || []));
    }, [campaignId]);

    const handleStartSession = async () => {
        setCreating(true);
        setError('');
        try {
            const { data, error: err } = await supabase
                .from('sessions')
                .insert({
                    campaign_id: campaignId,
                    gm_id: user.id,
                    map_id: selectedMapId,
                    status: 'active',
                })
                .select()
                .single();

            if (err) throw err;

            // Spawn player tokens at default positions
            const tokenInserts = players
                .filter((p) => p.character_id)
                .map((p, i) => ({
                    session_id: data.id,
                    character_id: p.character_id,
                    label: p.characters?.name || 'Player',
                    x: 2 + i,
                    y: 2,
                    is_npc: false,
                    token_color: ['#7c3aed', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#ec4899'][i % 6],
                }));

            if (tokenInserts.length > 0) {
                await supabase.from('session_tokens').insert(tokenInserts);
            }

            navigate(`/session/${data.id}`);
        } catch (err) {
            if (err?.name === 'AbortError') return;
            setError(err.message);
        }
        setCreating(false);
    };

    if (!campaign) return <div className="page-container"><div className="loading-spinner">Loading campaign...</div></div>;

    return (
        <div className="page-container">
            <div className="lobby-container">
                <div className="lobby-header">
                    <h1>⚔️ Start Session</h1>
                    <p className="lobby-campaign-name">{campaign.title}</p>
                </div>

                <div className="lobby-sections">
                    {/* Map Selection */}
                    <div className="lobby-section">
                        <h3>🗺️ Select Map</h3>
                        {maps.length === 0 ? (
                            <p className="lobby-empty">No maps available. Create one in Map Forge first.</p>
                        ) : (
                            <div className="lobby-map-grid">
                                {maps.map((map) => (
                                    <button
                                        key={map.id}
                                        className={`lobby-map-card ${selectedMapId === map.id ? 'selected' : ''}`}
                                        onClick={() => setSelectedMapId(map.id)}
                                    >
                                        <span className="map-icon">🗺️</span>
                                        <span className="map-name">{map.name}</span>
                                        <span className="map-theme">{map.theme}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Players */}
                    <div className="lobby-section">
                        <h3>👥 Players ({players.length})</h3>
                        {players.length === 0 ? (
                            <p className="lobby-empty">No players have joined this campaign yet.</p>
                        ) : (
                            <div className="lobby-player-list">
                                {players.map((p) => (
                                    <div key={p.id} className="lobby-player-card">
                                        <div className="player-avatar">
                                            {p.profiles?.avatar_url
                                                ? <img src={p.profiles.avatar_url} alt="" />
                                                : <span>👤</span>
                                            }
                                        </div>
                                        <div className="player-info">
                                            <span className="player-name">{p.profiles?.display_name || 'Anonymous'}</span>
                                            {p.characters && (
                                                <span className="player-character">{p.characters.name} — {p.characters.race} {p.characters.class}</span>
                                            )}
                                        </div>
                                        <span className={`player-status ${p.character_id ? 'ready' : 'waiting'}`}>
                                            {p.character_id ? '✅ Ready' : '⏳ No character'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Invite Code */}
                    <div className="lobby-section">
                        <h3>🔗 Invite Code</h3>
                        <div className="invite-code-box">
                            <code>{campaign.invite_code}</code>
                            <button onClick={() => navigator.clipboard.writeText(campaign.invite_code)}>📋 Copy</button>
                        </div>
                    </div>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <div className="lobby-footer">
                    <button className="wizard-btn secondary" onClick={() => navigate('/loreweaver')}>
                        ← Back to Campaigns
                    </button>
                    <button
                        className="wizard-btn primary create-btn"
                        onClick={handleStartSession}
                        disabled={creating}
                    >
                        {creating ? 'Starting...' : '🎮 Start Session'}
                    </button>
                </div>
            </div>
        </div>
    );
}
