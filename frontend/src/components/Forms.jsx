import React, { useState } from 'react';

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

export function DynamicForm({ schema, value, onChange }) {
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
                        <textarea
                            value={val}
                            onChange={e => handleChange(field.key, e.target.value)}
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
