import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SlashEditor } from '../SlashEditor';
import { DynamicForm } from './Forms';
import { BibleAssist } from './BibleAssist';

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



    // --- New State for AI Assist Modal ---
    const [assistMode, setAssistMode] = useState(false); // true if modal open
    const [assistInitialType, setAssistInitialType] = useState('character');

    const handleOpenAdd = (type) => {
        setAssistInitialType(type);
        setEditing(null); // It's new
        setAssistMode(true);
    };

    const handleOpenEdit = (el) => {
        setEditing(el);
        setAssistMode(true);
    };

    const handleSaveAssist = async (finalEl) => {
        try {
            if (finalEl.id) {
                // Update existing
                await saveElement(finalEl);
            } else {
                // Create new
                await fetch(`${API_BASE}/bible`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        story_id: parseInt(storyId),
                        name: finalEl.name,
                        type: finalEl.type,
                        content: finalEl.content // assumes stringified json from BibleAssist
                    })
                });
            }
            setAssistMode(false);
            setEditing(null);
            onRefresh();
        } catch (e) {
            alert("Error saving: " + e.message);
        }
    };

    return (
        <div className="bible-view">
            <div className="bible-toolbar">
                {Object.entries(schema)
                    .filter(([key]) => key !== 'story_settings')
                    .map(([key, config]) => (
                        <button key={key} onClick={() => handleOpenAdd(key)}>
                            + Add {config.name}
                        </button>
                    ))}
            </div>

            <div className="bible-grid">
                {/* Story Settings - Keep as premium card or special? Let's keep it visible but maybe editable via modal too? 
                    User asked for "minimal view of story bible elements". 
                    Story Settings is unique. Let's keep it as is or slightly minimal.
                */}
                {elements.map(el => {
                    const isSettings = el.type === 'story_settings';

                    return (
                        <div
                            key={el.id}
                            className={`premium-card ${isSettings ? 'story_settings' : 'bible-card-minimal'} ${el.type}`}
                            onClick={() => handleOpenEdit(el)}
                        >
                            <div className="card-header">
                                <h3>{el.name}</h3>
                            </div>
                            <span className={`badge ${el.type}`}>{schema[el.type]?.name || el.type}</span>

                            {/* For minimal cards, we might hide the content preview or show very little */}
                            {!isSettings && (
                                <div className="content-preview" style={{ display: 'none' }}></div>
                            )}

                            {/* Keep full preview for Story Settings for now as it's global context */}
                            {isSettings && (
                                <div className="content-preview" style={{ marginTop: '1rem', textAlign: 'left' }}>
                                    {/* Simplified preview for settings */}
                                    <small>Click to edit story settings</small>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {assistMode && (
                <BibleAssist
                    storyId={storyId}
                    initialType={editing ? editing.type : assistInitialType}
                    existingElement={editing}
                    schema={schema}
                    onSave={handleSaveAssist}
                    onCancel={() => setAssistMode(false)}
                    globalLists={{
                        ...globalLists,
                        bibleElements: elements.filter(e => ['character', 'location', 'timeline'].includes(e.type))
                    }}
                />
            )}
        </div>
    );
}

export default BibleView;
