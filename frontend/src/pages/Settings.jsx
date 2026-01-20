import React, { useState, useEffect } from 'react';

function Settings({ schema, onSave }) {
    const [tempSchema, setTempSchema] = useState(schema);

    useEffect(() => {
        setTempSchema(schema);
    }, [schema]);

    return (
        <div className="settings-view">
            <header className="content-header glass" style={{ marginBottom: '2rem' }}>
                <h1>Global Settings</h1>
                <button className="btn-save" onClick={() => onSave(tempSchema)}>Save All Changes</button>
            </header>

            <section className="settings-section">
                <h2>Bible Schemas</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}> Define the fields for different types of story elements.</p>

                {Object.entries(tempSchema).map(([type, config]) => (
                    <div key={type} className="schema-type-card">
                        <h3 style={{ textTransform: 'capitalize', color: 'var(--accent-primary)', marginBottom: '1rem' }}>{config.name} ({type})</h3>
                        <div className="schema-field-list">
                            {config.fields.map((field, idx) => (
                                <div key={idx} className="schema-field-item">
                                    <input
                                        placeholder="Field Label"
                                        value={field.label}
                                        onChange={e => {
                                            const newFields = [...config.fields];
                                            newFields[idx].label = e.target.value;
                                            setTempSchema({ ...tempSchema, [type]: { ...config, fields: newFields } });
                                        }}
                                    />
                                    <input
                                        placeholder="Field Key"
                                        value={field.key}
                                        onChange={e => {
                                            const newFields = [...config.fields];
                                            newFields[idx].key = e.target.value;
                                            setTempSchema({ ...tempSchema, [type]: { ...config, fields: newFields } });
                                        }}
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
                                        <option value="array">List/Tags</option>
                                    </select>
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
