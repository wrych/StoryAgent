import React, { useState, useEffect } from 'react';

function Settings({ schema, onSave }) {
    const [tempSchema, setTempSchema] = useState(schema);
    const [lists, setLists] = useState({});
    const [aiSettings, setAiSettings] = useState({
        llm_url: '',
        llm_system_prompt: ''
    });

    useEffect(() => {
        setTempSchema(schema);
    }, [schema]);

    // Fetch lists on mount
    useEffect(() => {
        fetchLists();
    }, []);

    const fetchLists = async () => {
        const res = await fetch('http://localhost:8000/settings');
        if (res.ok) {
            const data = await res.json();
            // Filter to only those that are arrays (lists)
            const listSettings = {};
            Object.entries(data).forEach(([key, val]) => {
                if (Array.isArray(val)) {
                    listSettings[key] = val;
                }
            });
            setLists(listSettings);
            setAiSettings({
                llm_url: data.llm_url || '',
                llm_system_prompt: data.llm_system_prompt || ''
            });
        }
    };

    const saveList = async (key, newList) => {
        await fetch(`http://localhost:8000/settings/${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newList)
        });
        setLists(prev => ({ ...prev, [key]: newList }));

        // Also trigger schema save to propagate changes (hacky but consistent with requirement)
        // Actually, we need to update the schema options if they are embedded.
        // But our backend main.py only seeds on startup. 
        // If we want the frontend schema to update immediately without restart, we should also 
        // update the schema object here.
        // Finding the genre field:
        if (key === 'genres' && tempSchema.story_settings) {
            const newSchema = { ...tempSchema };
            const fields = [...newSchema.story_settings.fields];
            const genreFieldIdx = fields.findIndex(f => f.key === 'genre');
            if (genreFieldIdx >= 0) {
                fields[genreFieldIdx] = { ...fields[genreFieldIdx], options: newList };
                newSchema.story_settings.fields = fields;
                setTempSchema(newSchema);
                // The 'onSave' below will save the schema. 
                // But valid to save list independently first.
                onSave(newSchema);
            }
        }
    };

    const saveAiSetting = async (key, val) => {
        const cleanVal = typeof val === 'string' ? val.replace(/^["']|["']$/g, '') : val;
        await fetch(`http://localhost:8000/settings/${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cleanVal)
        });
        setAiSettings(prev => ({ ...prev, [key]: cleanVal }));
    };

    return (
        <div className="settings-view">
            <header className="content-header glass" style={{ marginBottom: '2rem' }}>
                <h1>Global Settings</h1>
                <button className="btn-save" onClick={() => onSave(tempSchema)}>Save Schema Changes</button>
            </header>

            <section className="settings-section">
                <h2>Global Lists</h2>
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {Object.entries(lists).map(([key, items]) => (
                        Array.isArray(items) && (
                            <div key={key} className="schema-type-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3 style={{ textTransform: 'capitalize' }}>{key}</h3>
                                    {/* Optional: Add delete list button if not a core list */}
                                </div>
                                <div className="array-input">
                                    <div className="list-editor">
                                        {items.map(item => (
                                            <div key={item} className="list-item">
                                                {item}
                                                <button onClick={() => saveList(key, items.filter(i => i !== item))}>&times;</button>
                                            </div>
                                        ))}
                                        <div className="add-item">
                                            <input
                                                placeholder={`Add ${key.slice(0, -1)}`} // simplistic singularization
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        const val = e.target.value.trim();
                                                        if (val && !items.includes(val)) {
                                                            saveList(key, [...items, val]);
                                                            e.target.value = '';
                                                        }
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    ))}
                </div>
                {/* Create New List UI */}
                <div className="schema-type-card" style={{ marginTop: '1rem', borderStyle: 'dashed' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Create New Global List</h3>
                    <input
                        placeholder="List Name (e.g. 'themes')"
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                const val = e.target.value.trim().toLowerCase().replace(/\s+/g, '_');
                                if (val && !lists[val]) {
                                    saveList(val, []);
                                    e.target.value = '';
                                }
                            }
                        }}
                        style={{ width: '100%' }}
                    />
                </div>
            </section>

            <section className="settings-section">
                <h2>AI Settings</h2>
                <div className="schema-type-card" style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>LLM Endpoint URL</label>
                        <input
                            style={{ width: '100%' }}
                            value={aiSettings.llm_url}
                            onChange={e => setAiSettings({ ...aiSettings, llm_url: e.target.value })}
                            onBlur={e => saveAiSetting('llm_url', e.target.value)}
                            placeholder="http://localhost:11434/api/generate"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Global System Prompt</label>
                        <textarea
                            style={{ width: '100%', minHeight: '100px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.5rem' }}
                            value={aiSettings.llm_system_prompt}
                            onChange={e => setAiSettings({ ...aiSettings, llm_system_prompt: e.target.value })}
                            onBlur={e => saveAiSetting('llm_system_prompt', e.target.value)}
                            placeholder="You are a creative writing assistant..."
                        />
                    </div>
                </div>
            </section>

            <section className="settings-section">
                <h2>Bible Schemas</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}> Define the fields for different types of story elements.</p>

                {Object.entries(tempSchema).map(([type, config]) => (
                    <div key={type} className="schema-type-card">
                        <h3 style={{ textTransform: 'capitalize', color: 'var(--accent-primary)', marginBottom: '1rem' }}>{config.name} ({type})</h3>
                        <div className="schema-field-list">
                            {config.fields.map((field, idx) => (
                                <div key={idx} className="schema-field-item" style={{ flexWrap: 'wrap' }}>
                                    <input
                                        placeholder="Field Label"
                                        value={field.label}
                                        onChange={e => {
                                            const newFields = [...config.fields];
                                            newFields[idx].label = e.target.value;
                                            setTempSchema({ ...tempSchema, [type]: { ...config, fields: newFields } });
                                        }}
                                        style={{ width: '150px' }}
                                    />
                                    <input
                                        placeholder="Field Key"
                                        value={field.key}
                                        onChange={e => {
                                            const newFields = [...config.fields];
                                            newFields[idx].key = e.target.value;
                                            setTempSchema({ ...tempSchema, [type]: { ...config, fields: newFields } });
                                        }}
                                        style={{ width: '150px' }}
                                    />
                                    <select
                                        value={field.type}
                                        onChange={e => {
                                            const newFields = [...config.fields];
                                            newFields[idx].type = e.target.value;
                                            setTempSchema({ ...tempSchema, [type]: { ...config, fields: newFields } });
                                        }}
                                    >
                                        <option value="string">String</option>
                                        <option value="number">Number</option>
                                        <option value="text">Long Text</option>
                                        <option value="array">List/Tags (Free Text)</option>
                                        <option value="select">Select/Dropdown</option>
                                    </select>

                                    {field.type === 'select' && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <select
                                                value={field.listRef || ''}
                                                onChange={e => {
                                                    const newFields = [...config.fields];
                                                    newFields[idx].listRef = e.target.value;
                                                    // Also update options purely for backward compatibility if needed, 
                                                    // but conceptually listRef should override options.
                                                    setTempSchema({ ...tempSchema, [type]: { ...config, fields: newFields } });
                                                }}
                                                style={{ width: '120px', borderColor: 'var(--accent-secondary)' }}
                                            >
                                                <option value="">Select Source List...</option>
                                                <option value="">(Custom / None)</option>
                                                {Object.keys(lists).filter(k => Array.isArray(lists[k])).map(k => (
                                                    <option key={k} value={k}>{k}</option>
                                                ))}
                                            </select>

                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={field.multi || false}
                                                    onChange={e => {
                                                        const newFields = [...config.fields];
                                                        newFields[idx].multi = e.target.checked;
                                                        setTempSchema({ ...tempSchema, [type]: { ...config, fields: newFields } });
                                                    }}
                                                />
                                                Multi-select
                                            </label>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <button
                                style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', fontSize: '0.8rem' }}
                                onClick={() => {
                                    const newFields = [...config.fields, { label: 'New Field', key: 'new_field', type: 'string' }];
                                    setTempSchema({ ...tempSchema, [type]: { ...config, fields: newFields } });
                                }}
                            >
                                + Add Field
                            </button>
                        </div>
                    </div>
                ))}
            </section>
        </div>
    );
}

export default Settings;
