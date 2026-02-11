import React, { useRef, useEffect } from 'react';

export default function SessionChat({ logs, onSendMessage }) {
    const inputRef = useRef(null);
    const scrollRef = useRef(null);

    // Auto-scroll to bottom on new logs
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const msg = inputRef.current?.value?.trim();
        if (!msg) return;
        onSendMessage(msg);
        inputRef.current.value = '';
    };

    const TYPE_ICONS = {
        chat: '💬',
        action: '⚔️',
        dice: '🎲',
        combat: '⚔️',
        system: '⚙️',
        narrative: '📜',
    };

    return (
        <div className="session-chat">
            <div className="chat-messages" ref={scrollRef}>
                {logs.map((log) => (
                    <div key={log.id} className={`chat-message type-${log.type}`}>
                        <span className="chat-icon">{TYPE_ICONS[log.type] || '💬'}</span>
                        <div className="chat-content">
                            <span className="chat-text" dangerouslySetInnerHTML={{ __html: formatContent(log.content) }} />
                            <span className="chat-time">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                ))}
                {logs.length === 0 && (
                    <div className="chat-empty">Session log is empty. Start playing!</div>
                )}
            </div>
            <form className="chat-input-form" onSubmit={handleSubmit}>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Type a message..."
                    className="chat-input"
                />
                <button type="submit" className="chat-send-btn">Send</button>
            </form>
        </div>
    );
}

function formatContent(text) {
    // Bold: **text**
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}
