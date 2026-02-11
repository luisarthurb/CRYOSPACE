import React, { useRef, useEffect, useMemo, memo } from 'react';

const TYPE_ICONS = {
    chat: '💬',
    action: '⚔️',
    dice: '🎲',
    combat: '⚔️',
    system: '⚙️',
    narrative: '📜',
};

// Memoized chat message to prevent re-rendering entire log on each new entry
const ChatMessage = memo(function ChatMessage({ log }) {
    return (
        <div className={`chat-message type-${log.type}`}>
            <span className="chat-icon">{TYPE_ICONS[log.type] || '💬'}</span>
            <div className="chat-content">
                <span className="chat-text">{formatSafe(log.content)}</span>
                <span className="chat-time">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        </div>
    );
});

export default function SessionChat({ logs, onSendMessage }) {
    const inputRef = useRef(null);
    const scrollRef = useRef(null);

    // Auto-scroll to bottom on new logs
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs.length]); // Only react to length changes, not content

    const handleSubmit = (e) => {
        e.preventDefault();
        const msg = inputRef.current?.value?.trim();
        if (!msg) return;
        onSendMessage(msg);
        inputRef.current.value = '';
    };

    return (
        <div className="session-chat">
            <div className="chat-messages" ref={scrollRef}>
                {logs.map((log) => (
                    <ChatMessage key={log.id} log={log} />
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

/**
 * Safe format: renders **bold** text as React elements instead of innerHTML.
 * This prevents XSS from user-submitted content.
 */
function formatSafe(text) {
    if (!text) return '';
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return part;
    });
}
