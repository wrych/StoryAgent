import React, { useState, useEffect, useRef } from 'react';

/**
 * A specialized editor that handles slash commands (/) for cross-referencing.
 */
export function SlashEditor({ value, onChange, bibleElements, placeholder }) {
    const [showMenu, setShowMenu] = useState(false);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const textareaRef = useRef(null);
    const mirrorRef = useRef(null);

    const filteredElements = bibleElements.filter(el =>
        el.name.toLowerCase().includes(query.toLowerCase()) ||
        el.type.toLowerCase().includes(query.toLowerCase())
    );

    const handleKeyDown = (e) => {
        if (showMenu) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredElements.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredElements.length) % filteredElements.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredElements[selectedIndex]) {
                    insertReference(filteredElements[selectedIndex]);
                }
            } else if (e.key === 'Escape') {
                setShowMenu(false);
            }
        }
    };

    const handleInput = (e) => {
        const text = e.target.value;
        const cursorPos = e.target.selectionStart;
        const textBeforeCursor = text.substring(0, cursorPos);
        const lastSlashIndex = textBeforeCursor.lastIndexOf('/');

        if (lastSlashIndex !== -1 && (lastSlashIndex === 0 || textBeforeCursor[lastSlashIndex - 1] === ' ' || textBeforeCursor[lastSlashIndex - 1] === '\n')) {
            const currentQuery = textBeforeCursor.substring(lastSlashIndex + 1);
            if (!currentQuery.includes(' ')) {
                setQuery(currentQuery);
                setShowMenu(true);
                updateMenuPosition(cursorPos);
            } else {
                setShowMenu(false);
            }
        } else {
            setShowMenu(false);
        }
        onChange(text);
    };

    const updateMenuPosition = (cursorPos) => {
        if (!textareaRef.current) return;

        // Simple position estimate based on line breaks and characters
        // For a more accurate position, we'd use a mirror div, but this is a good start
        const rect = textareaRef.current.getBoundingClientRect();
        const textBefore = textareaRef.current.value.substring(0, cursorPos);
        const lines = textBefore.split('\n');
        const lastLineHeight = 24; // estimate
        const charWidth = 9; // estimate for monospace-ish

        const top = (lines.length * lastLineHeight) + 10;
        const left = (lines[lines.length - 1].length * charWidth) + 20;

        setMenuPos({
            top: Math.min(top, textareaRef.current.clientHeight - 100),
            left: Math.min(left, textareaRef.current.clientWidth - 200)
        });
    };

    const insertReference = (element) => {
        const text = textareaRef.current.value;
        const cursorPos = textareaRef.current.selectionStart;
        const textBeforeCursor = text.substring(0, cursorPos);
        const lastSlashIndex = textBeforeCursor.lastIndexOf('/');

        const reference = `[[${element.type}:${element.name}]]`;
        const newText = text.substring(0, lastSlashIndex) + reference + ' ' + text.substring(cursorPos);

        onChange(newText);
        setShowMenu(false);

        // Set focus back and move cursor
        setTimeout(() => {
            textareaRef.current.focus();
            const newPos = lastSlashIndex + reference.length + 1;
            textareaRef.current.setSelectionRange(newPos, newPos);
        }, 0);
    };

    return (
        <div className="slash-editor-container">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="slash-textarea"
            />
            {showMenu && filteredElements.length > 0 && (
                <div
                    className="slash-menu glass shadow-lg"
                    style={{ top: menuPos.top, left: menuPos.left }}
                >
                    <div className="menu-header">Insert Reference...</div>
                    {filteredElements.map((el, idx) => (
                        <div
                            key={el.id}
                            className={`menu-item ${idx === selectedIndex ? 'active' : ''}`}
                            onClick={() => insertReference(el)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                        >
                            <span className={`type-tag ${el.type}`}>{el.type[0].toUpperCase()}</span>
                            <span className="name">{el.name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
