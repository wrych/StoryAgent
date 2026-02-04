import React, { useState } from 'react';
import { SlashEditor } from '../SlashEditor';

export function FormField({ label, type = 'text', value, onChange, placeholder }) {
    return (
        <div className="form-group">
            <label>{label}</label>
            {type === 'text' ? (
                <textarea
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    style={{ width: '100%', minHeight: '100px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.5rem' }}
                />
            ) : (
                <input
                    type={type}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                />
            )}
        </div>
    );
}

export function ArrayInput({ value = [], onChange, placeholder }) {
    const [input, setInput] = useState('');

    const add = () => {
        if (input.trim() && !value.includes(input.trim())) {
            onChange([...value, input.trim()]);
            setInput('');
        }
    };

    const remove = (val) => {
        onChange(value.filter(v => v !== val));
    };

    return (
        <div className="array-input">
            {value.map(v => (
                <span key={v} className="array-chip">
                    {v} <button onClick={() => remove(v)}>&times;</button>
                </span>
            ))}
            <input
                className="array-input-field"
                placeholder={placeholder}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
                onBlur={add}
            />
        </div>
    );
}

export function MultiSelect({ options = [], value = [], onChange, placeholder }) {
    // value is array of strings
    const remove = (val) => {
        onChange(value.filter(v => v !== val));
    };

    const add = (e) => {
        const val = e.target.value;
        if (val && !value.includes(val)) {
            onChange([...value, val]);
        }
        // Reset select to default
        e.target.value = "";
    };

    return (
        <div className="array-input">
            {value.map(v => (
                <span key={v} className="array-chip">
                    {v} <button onClick={() => remove(v)}>&times;</button>
                </span>
            ))}
            <select
                className="array-input-field"
                onChange={add}
                value=""
                style={{ color: 'var(--text-secondary)' }}
            >
                <option value="" disabled>{placeholder}</option>
                {options.filter(opt => !value.includes(opt)).map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        </div>
    );
}

export function DynamicForm({ schema, value, onChange, globalLists }) {
    const handleChange = (key, val) => {
        onChange({ ...value, [key]: val });
    };

    const renderField = (field, currentVal, path = '') => {
        const val = currentVal?.[field.key] ?? (field.type === 'array' ? [] : field.type === 'object' ? {} : '');



        switch (field.type) {
            case 'string':
            case 'number':
                return (
                    <div key={path + field.key} className="form-group">
                        <label>{field.label}</label>
                        <input
                            type={field.type === 'number' ? 'number' : 'text'}
                            value={val}
                            onChange={e => handleChange(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                        />
                    </div>
                );
            case 'text':
                return (
                    <div key={path + field.key} className="form-group">
                        <label>{field.label}</label>
                        <SlashEditor
                            value={val}
                            onChange={v => handleChange(field.key, v)}
                            bibleElements={globalLists?.bibleElements || []}
                            placeholder={`Enter ${field.label}...`}
                        />
                    </div>
                );
            case 'array':
                return (
                    <div key={path + field.key} className="form-group">
                        <label>{field.label}</label>
                        <ArrayInput
                            value={val}
                            onChange={v => handleChange(field.key, v)}
                            placeholder={`Add ${field.label}...`}
                        />
                    </div>
                );
            case 'select': {
                // Resolve options: priority to resolved globalList via listRef, fallback to embedded options
                const options = (field.listRef && globalLists?.[field.listRef])
                    ? globalLists[field.listRef]
                    : (field.options || []);

                if (field.multi) {
                    return (
                        <div key={path + field.key} className="form-group">
                            <label>{field.label}</label>
                            <MultiSelect
                                options={options}
                                value={Array.isArray(val) ? val : []}
                                onChange={v => handleChange(field.key, v)}
                                placeholder={`Select ${field.label}...`}
                            />
                        </div>
                    );
                }
                return (
                    <div key={path + field.key} className="form-group">
                        <label>{field.label}</label>
                        <select
                            value={val}
                            onChange={e => handleChange(field.key, e.target.value)}
                        >
                            <option value="">Select {field.label}...</option>
                            {options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                );
            }
            case 'object':
                return (
                    <div key={path + field.key} className="form-group">
                        <label>{field.label}</label>
                        <div className="nested-group">
                            {field.fields.map(f => renderField(f, val, `${path}${field.key}.`))}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="dynamic-form">
            {schema.fields.map(f => renderField(f, value))}
        </div>
    );
}
