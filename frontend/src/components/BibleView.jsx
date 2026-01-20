import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SlashEditor } from '../SlashEditor';
import { DynamicForm } from './Forms';

const API_BASE = 'http://localhost:8000';

function BibleView({ storyId, elements, schema, globalLists, onRefresh, onAdd, onDelete }) {
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



    return (
        <div className="bible-view">
            <div className="bible-toolbar">
                {/* Add buttons based on schema */}
                {Object.entries(schema)
                    .filter(([key]) => key !== 'story_settings')
                    .map(([key, config]) => (
                        <button key={key} onClick={() => onAdd(key)}>
                            + Add {config.name}
                        </button>
                    ))}
            </div>

            <div className="bible-grid">
                {/* Special handling for unique/single items like Story Settings if we want them always top 
                    But the grid layout is fine for now. Story Settings is just another type. 
                */}
                {elements.map(el => {
                    const typeSchema = schema[el.type];
                    let elementContent = {};
                    try { elementContent = JSON.parse(el.content || '{}'); } catch (e) { }

                    const isEditing = editing?.id === el.id;

                    // Parse editing content if currently editing, otherwise use element content
                    let formValue = elementContent;
                    if (isEditing) {
                        try { formValue = JSON.parse(editing.content || '{}'); } catch (e) { }
                    }

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
                                            value={formValue}
                                            globalLists={{
                                                ...globalLists,
                                                bibleElements: elements.filter(e => ['character', 'location', 'timeline'].includes(e.type))
                                            }}
                                            onChange={val => setEditing({ ...editing, content: JSON.stringify(val) })}
                                        />
                                    ) : (
                                        <SlashEditor
                                            value={editing.content || ''}
                                            onChange={val => setEditing({ ...editing, content: val })}
                                            bibleElements={elements.filter(e => ['character', 'location', 'timeline'].includes(e.type))}
                                            placeholder="Description..."
                                        />
                                    )}
                                    <div className="editor-actions">
                                        <button onClick={() => saveElement(editing)}>Save</button>
                                        <button onClick={() => setEditing(null)}>Cancel</button>
                                        <span style={{ flex: 1 }}></span>
                                        {el.type !== 'story_settings' && (
                                            <button className="btn-delete" onClick={() => onDelete(el)}>Delete</button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="card-header">
                                        {el.type !== 'story_settings' ? (
                                            <h3>{el.name}</h3>
                                        ) : (
                                            <h3>Story Settings</h3>
                                        )}
                                        <button
                                            className="btn-edit-icon"
                                            onClick={() => setEditing({ ...el })}
                                            style={{ background: 'transparent', padding: '0.25rem' }}
                                        >
                                            ✎
                                        </button>
                                    </div>
                                    <span className={`badge ${el.type}`}>{typeSchema?.name || el.type}</span>
                                    {typeSchema ? (
                                        <div className="content-preview">
                                            {typeSchema.fields.slice(0, 3).map(f => {
                                                const val = elementContent[f.key];
                                                return (
                                                    <div key={f.key} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                                        <strong>{f.label}:</strong>
                                                        {Array.isArray(val) ? (
                                                            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                                                {val.map(v => (
                                                                    <span key={v} className="badge" style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem', background: 'rgba(255,255,255,0.1)' }}>{v}</span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span>{String(val || '')}</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="content-preview">{el.content || 'No content yet...'}</p>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default BibleView;
