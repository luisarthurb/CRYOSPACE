import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import AuthGuard from './components/AuthGuard';
import MapCanvas from './components/MapCanvas';
import EditorPanel from './components/EditorPanel';
import PromptBar from './components/PromptBar';
import CharacterList from './components/characters/CharacterList';
import CampaignList from './components/loreweaver/CampaignList';
import CampaignEditor from './components/loreweaver/CampaignEditor';
import SessionLobby from './components/session/SessionLobby';
import SessionView from './components/session/SessionView';

function MapForge() {
    return (
        <div className="app-body">
            <EditorPanel />
            <div className="app-main">
                <MapCanvas />
                <PromptBar />
            </div>
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthGuard>
                <div className="app">
                    <Header />
                    <Routes>
                        <Route path="/" element={<MapForge />} />
                        <Route path="/characters" element={<CharacterList />} />
                        <Route path="/loreweaver" element={<CampaignList />} />
                        <Route path="/loreweaver/:id" element={<CampaignEditor />} />
                        <Route path="/session/new/:campaignId" element={<SessionLobby />} />
                        <Route path="/session/:sessionId" element={<SessionView />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </div>
            </AuthGuard>
        </BrowserRouter>
    );
}
