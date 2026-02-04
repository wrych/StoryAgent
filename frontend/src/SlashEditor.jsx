import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Mention from '@tiptap/extension-mention';
import { ReactRenderer } from '@tiptap/react';
import Suggestion from '@tiptap/suggestion';
import tippy from 'tippy.js';

/**
 * Custom extension to handle [[Type:Name]] style references
 * We extend Mention to store both names and types for rich rendering.
 */
const StoryBibleReference = Mention.extend({
    name: 'storyBibleReference',
    addAttributes() {
        return {
            ...this.parent?.(),
            type: {
                default: null,
                parseHTML: element => element.getAttribute('data-type'),
                renderHTML: attributes => {
                    if (!attributes.type) return {};
                    return { 'data-type': attributes.type };
                },
            },
            name: {
                default: null,
                parseHTML: element => element.getAttribute('data-name'),
                renderHTML: attributes => {
                    if (!attributes.name) return {};
                    return { 'data-name': attributes.name };
                },
            },
        };
    },
    renderHTML({ node, HTMLAttributes }) {
        return [
            'span',
            {
                ...HTMLAttributes,
                class: `story-reference-pill ${node.attrs.type || ''}`,
                'data-type': node.attrs.type,
                'data-id': node.attrs.id
            },
            `${node.attrs.label || node.attrs.id}`
        ];
    },
});

/**
 * Component for the Suggestion List
 */
const SuggestionList = forwardRef((props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index) => {
        const item = props.items[index];
        if (item) {
            props.command({
                id: item.id,
                label: item.name,
                type: item.type,
                name: item.name
            });
        }
    };

    const upHandler = () => {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
    };

    const downHandler = () => {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
    };

    const enterHandler = () => {
        selectItem(selectedIndex);
    };

    useEffect(() => setSelectedIndex(0), [props.items]);

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }) => {
            if (event.key === 'ArrowUp') {
                upHandler();
                return true;
            }
            if (event.key === 'ArrowDown') {
                downHandler();
                return true;
            }
            if (event.key === 'Enter') {
                enterHandler();
                return true;
            }
            return false;
        },
    }));

    return (
        <div className="slash-menu glass shadow-lg">
            {props.items.length ? (
                props.items.map((item, index) => (
                    <button
                        className={`menu-item ${index === selectedIndex ? 'active' : ''}`}
                        key={index}
                        onClick={() => selectItem(index)}
                    >
                        {item.type && <span className={`type-tag color-${item.type}`}>{item.type[0].toUpperCase()}</span>}
                        <span className="name">{item.name}</span>
                    </button>
                ))
            ) : (
                <div className="menu-item disabled">No results</div>
            )}
        </div>
    );
});

/**
 * Custom extension for Slash Commands
 */
const SlashCommands = Extension.create({
    name: 'slashCommands',
    addOptions() {
        return {
            suggestion: {
                char: '/',
                command: ({ editor, range, props }) => {
                    props.command({ editor, range });
                },
            },
        };
    },
    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...this.options.suggestion,
            }),
        ];
    },
});

export const SlashEditor = forwardRef(({ value, onChange, bibleElements, placeholder }, ref) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: placeholder || 'Start writing...',
            }),
            StoryBibleReference.configure({
                HTMLAttributes: { class: 'story-reference-pill' },
                suggestion: {
                    char: '[',
                    items: ({ query }) => bibleElements.filter(item =>
                        item.name.toLowerCase().includes(query.toLowerCase()) ||
                        item.type.toLowerCase().includes(query.toLowerCase())
                    ).slice(0, 5),
                    render: () => createSuggestionRender(SuggestionList)
                },
            }),
            SlashCommands.configure({
                suggestion: {
                    items: ({ query }) => {
                        return [
                            { title: 'Bold', command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setMark('bold').run() },
                            { title: 'Italic', command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setMark('italic').run() },
                            { title: 'Heading 1', command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run() },
                            { title: 'Heading 2', command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run() },
                            { title: 'Bullet List', command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run() },
                        ].filter(item => item.title.toLowerCase().includes(query.toLowerCase()));
                    },
                    render: () => createSuggestionRender(SuggestionList)
                }
            })
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    useImperativeHandle(ref, () => ({
        appendContent: (content) => {
            if (editor) {
                editor.commands.insertContent(content);
            }
        },
        setContent: (content) => {
            if (editor) {
                editor.commands.setContent(content);
            }
        }
    }));

    function createSuggestionRender(componentClass) {
        let component;
        let popup;

        return {
            onStart: (props) => {
                component = new ReactRenderer(componentClass, {
                    props,
                    editor: props.editor,
                });

                popup = tippy('body', {
                    getReferenceClientRect: props.clientRect,
                    appendTo: () => document.body,
                    content: component.element,
                    showOnCreate: true,
                    interactive: true,
                    trigger: 'manual',
                    placement: 'bottom-start',
                })[0];
            },
            onUpdate(props) {
                component.updateProps(props);
                popup.setProps({ getReferenceClientRect: props.clientRect });
            },
            onKeyDown(props) {
                if (props.event.key === 'Escape') {
                    popup.hide();
                    return true;
                }
                return component.ref?.onKeyDown(props);
            },
            onExit() {
                popup.destroy();
                component.destroy();
            },
        };
    }

    useEffect(() => {
        if (editor && value !== editor.getHTML() && !editor.isFocused) {
            editor.commands.setContent(value, false);
        }
    }, [value, editor]);

    return (
        <div className="slash-editor-container tiptap-editor">
            <EditorContent editor={editor} />
        </div>
    );
});
