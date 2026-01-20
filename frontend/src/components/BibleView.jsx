import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SlashEditor } from '../SlashEditor';
import { DynamicForm } from './Forms';

const API_BASE = 'http://localhost:8000';

function BibleView({ storyId, elements, schema, onRefresh, onAdd, onDelete }) {
    const { elementId } = useParams();
    const navigate = useNavigate();
    const [editing, setEditing] = useState(null);

    // Sync URL param with internal editing state
    useEffect(() => {
        if (elementId && elements.length > 0) {
            const el = elements.find(e => String(e.id) === elementId);
            if (el) {
                setEditing(el);
            }
        } else {
            setEditing(null);
        }
    }, [elementId, elements]);

    const saveElement = async (el) => {
        await fetch(`${API_BASE}/bible/${el.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(el)
        });
        onRefresh();
        // Optional: Navigate back or stay? User usually wants to stay if editing.
        // For now, let's just toast/notify, but we don't have a toast system. 
        // We'll just update local state which onRefresh does.
    };

    const closeEditor = () => {
        setEditing(null);
        navigate(`/stories/${storyId}/bible`);
    };

    const types = Object.keys(schema).filter(t => t !== 'story_settings');

    const sortedElements = [...elements].sort((a, b) => {
        if (a.type === 'story_settings') return -1;
        if (b.type === 'story_settings') return 1;
        return 0;
    });

    // If specific element is selected, show just that editor? 
    // Or show modal? Or show expanded card?
    // The user asked for "edit windows as crumbs". 
    // Current UI is "Detailed Editor takes over simple card slot".
    // Let's keep the grid but expand the one being edited, OR (better for deep linking)
    // if elementId is present, we show the Editor View. 

    // However, the existing UI just expands the card in place. 
    // To keep it simple and familiar, we'll keep the grid and just auto-expand the one matching the ID.
    // Actually, if we deep link, we might want a focused view. 
    // Let's stick to the "expand in place" behavior for now as it's least disruptive, 
    // but ensure `editing` state is driven by URL.

    return (
        <div className="bible-view">
            <div className="bible-toolbar">
                {types.map(t => (
                    <button key={t} onClick={() => onAdd(t)}>+ {schema[t]?.name || t}</button>
                ))}
            </div>
            <div className="bible-grid">
                {sortedElements.map(el => {
                    const typeSchema = schema[el.type];
                    let parsedContent = {};
                    try { parsedContent = JSON.parse(el.content || '{}'); } catch (e) { }

                    const isEditing = editing?.id === el.id;

                    return (
                        <div key={el.id} className={`premium-card ${el.type} ${isEditing ? 'editing' : ''}`} id={`element-${el.id}`}>
                            {isEditing ? (
                                <div className="editor-form">
                                    {el.type !== 'story_settings' && (
                                        <input
                                            placeholder="Name"
                                            value={editing.name}
                                            onChange={e => setEditing({ ...editing, name: e.target.value })}
                                        />
                                    )}
                                    {typeSchema ? (
                                        <DynamicForm
                                            schema={typeSchema}
                                            value={parsedContent}
                                            onChange={val => setEditing({ ...editing, content: JSON.stringify(val) })}
                                        />
                                    ) : (
                                        <div className="bible-slash-editor" style={{ minHeight: '150px', marginTop: '1rem' }}>
                                            <SlashEditor
                                                bibleElements={elements.filter(e => e.id !== el.id)}
                                                value={editing.content}
                                                onChange={val => setEditing({ ...editing, content: val })}
                                            />
                                        </div>
                                    )}
                                    <div className="editor-actions">
                                        <button onClick={() => saveElement(editing)}>Save</button>
                                        <button onClick={closeEditor}>Done</button>
                                    </div>
                                </div>
                            ) : (
                                <div onClick={() => navigate(`/stories/${storyId}/bible/${el.id}`)}>
                                    <div className="card-header">
                                        <h3>{el.name}</h3>
                                        {el.type !== 'story_settings' && (
                                            <button
                                                className="btn-delete-icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDelete(el);
                                                }}
                                            >
                                                &times;
                                            </button>
                                        )}
                                    </div>
                                    <span className={`badge ${el.type}`}>{typeSchema?.name || el.type}</span>
                                    {typeSchema ? (
                                        <div className="content-preview">
                                            {typeSchema.fields.slice(0, 3).map(f => (
                                                <div key={f.key}>
                                                    <strong>{f.label}:</strong> {String(parsedContent[f.key] || '')}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="content-preview">{el.content || 'No content yet...'}</p>
                                    )}
                                    <small>v{el.version}</small>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default BibleView;
