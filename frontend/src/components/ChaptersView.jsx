import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SlashEditor } from '../SlashEditor';
import { Modal } from './Modal';
import { FormField } from './Forms';
import { ChapterAssist } from './ChapterAssist';

const API_BASE = 'http://localhost:8000';

function ChaptersView({ storyId, chapters, onRefresh, bibleElements, onAdd, onDelete }) {
    const { chapterId } = useParams();
    const navigate = useNavigate();
    const [editing, setEditing] = useState(null);
    const [isAssistOpen, setIsAssistOpen] = useState(false);

    // We remove the old simple AI modal state
    const editorRef = useRef(null);

    useEffect(() => {
        if (chapterId && chapters.length > 0) {
            const ch = chapters.find(c => String(c.id) === chapterId);
            if (ch) {
                setEditing(ch);
            }
        } else {
            setEditing(null);
        }
    }, [chapterId, chapters]);

    const saveChapter = async (ch) => {
        await fetch(`${API_BASE}/chapters/${ch.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ch)
        });
        // setEditing(null); // Don't close on save, keep working
        onRefresh();
    };

    const handleAssistFinish = (content) => {
        if (editing) {
            const updated = { ...editing, content: content };
            setEditing(updated);
            saveChapter(updated);
            setIsAssistOpen(false);
        }
    };

    return (
        <div className="chapters-view">
            <div className="chapters-sidebar">
                <button className="btn-add-ch" onClick={onAdd}>+ Add Chapter</button>
                <div className="chapter-list">
                    {chapters.map(ch => (
                        <div
                            key={ch.id}
                            className={`chapter-item ${editing?.id === ch.id ? 'active' : ''}`}
                            onClick={() => navigate(`/stories/${storyId}/chapters/${ch.id}`)}
                        >
                            <div className="chapter-item-header">
                                <span>{ch.order}. {ch.title}</span>
                                <button
                                    className="btn-delete-icon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(ch);
                                    }}
                                >
                                    &times;
                                </button>
                            </div>
                            <small>v{ch.version}</small>
                        </div>
                    ))}
                </div>
            </div>
            <div className="chapter-content">
                {editing ? (
                    <div className="chapter-editor">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <input
                                className="chapter-title-input"
                                value={editing.title}
                                onChange={e => setEditing({ ...editing, title: e.target.value })}
                                style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', borderRadius: '0', fontSize: '1.5rem', color: 'white', flex: 1, marginRight: '1rem' }}
                            />
                            <button
                                className="btn-ai-write"
                                onClick={() => setIsAssistOpen(true)}
                                style={{ background: 'var(--accent-secondary)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                🪄 Write with AI
                            </button>
                        </div>
                        <SlashEditor
                            ref={editorRef}
                            bibleElements={bibleElements}
                            value={editing.content}
                            onChange={val => setEditing({ ...editing, content: val })}
                            placeholder="Start writing your masterpiece..."
                        />
                        <button className="btn-save" onClick={() => saveChapter(editing)}>Save Version</button>
                    </div>
                ) : (
                    <div className="empty-chapter">Select a chapter to write</div>
                )}
            </div>

            {isAssistOpen && (
                <ChapterAssist
                    storyId={storyId}
                    bibleElements={bibleElements}
                    onFinish={handleAssistFinish}
                    onCancel={() => setIsAssistOpen(false)}
                />
            )}
        </div>
    );
}

export default ChaptersView;
