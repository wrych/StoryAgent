import React, { useState, useEffect } from 'react';
import { SlashEditor } from '../SlashEditor';
import { AssistModal } from './AssistModal';

const STEPS = [
    { id: 'brief', label: 'Brief' },
    { id: 'context', label: 'Smart Context' },
    { id: 'outline', label: 'Outline' },
    { id: 'write', label: 'Write' }
];

export function ChapterAssist({ storyId, bibleElements, onFinish, onCancel }) {
    const [activeStep, setActiveStep] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Data State
    const [brief, setBrief] = useState("");
    const [smartContext, setSmartContext] = useState(null);
    const [outline, setOutline] = useState("");
    const [chapterContent, setChapterContent] = useState("");

    // Iteration State
    const [comments, setComments] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    const API_BASE = 'http://localhost:8000';

    const markdownToHtml = (text) => {
        if (!text) return "";
        const lines = text.split('\n');
        let html = "";
        let inList = false;

        const parseLine = (line) => {
            return line
                .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/__(.*?)__/g, '<strong>$1</strong>')
                .replace(/_(.*?)_/g, '<em>$1</em>');
        };

        lines.forEach((line) => {
            const trimmed = line.trim();

            if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
                if (inList) { html += "</ul>"; inList = false; }
                html += "<hr>";
                return;
            }

            const hMatch = line.match(/^(#{1,4})\s+(.*)/);
            if (hMatch) {
                if (inList) { html += "</ul>"; inList = false; }
                const level = hMatch[1].length;
                html += `<h${level}>${parseLine(hMatch[2])}</h${level}>`;
                return;
            }

            const lMatch = line.match(/^(\s*)([-*+])\s+(.*)/);
            if (lMatch) {
                if (!inList) { html += "<ul>"; inList = true; }
                html += `<li>${parseLine(lMatch[3])}</li>`;
                return;
            }

            if (!trimmed) {
                if (inList) { html += "</ul>"; inList = false; }
                html += "<br>";
                return;
            }

            if (inList) { html += "</ul>"; inList = false; }
            html += `<p>${parseLine(line)}</p>`;
        });

        if (inList) html += "</ul>";
        return html;
    };

    // -- Step Actions --

    const handleGenerateContext = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/ai/smart-context`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ story_id: parseInt(storyId), chapter_brief: brief })
            });
            const data = await res.json();
            setSmartContext(data);
            setActiveStep(1);
        } catch (e) {
            alert("Error generating context: " + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateOutline = async (isIterate = false) => {
        setIsLoading(true);
        try {
            const body = {
                story_id: parseInt(storyId),
                smart_context: smartContext,
                chapter_brief: brief,
                current_outline: isIterate ? outline : null,
                comments: isIterate ? comments : null
            };

            const res = await fetch(`${API_BASE}/ai/generate-outline`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            setOutline(markdownToHtml(data.outline));

            if (isIterate) {
                setComments(""); // Clear comments after iteration
            } else {
                setActiveStep(2);
            }
        } catch (e) {
            alert("Error generating outline: " + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleWriteChapter = async (isIterate = false) => {
        setIsLoading(true);
        // If not iterating, clear content to start fresh
        if (!isIterate) setChapterContent("");

        try {
            const body = {
                story_id: parseInt(storyId),
                smart_context: smartContext,
                outline: outline,
                current_content: isIterate ? chapterContent : null,
                comments: isIterate ? comments : null
            };

            const response = await fetch(`${API_BASE}/ai/write-chapter-v2`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) throw new Error("Generation failed");

            setActiveStep(3);
            if (isIterate) setComments("");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            // If iterating, we might want to REPLACE the content or stream append?
            // Usually iteration effectively rewrites the whole thing or sections.
            // For simplicity, let's treat it as a full rewrite stream for now, 
            // but if we supported partial updates it would be cooler. 
            // Given the prompt "Rewrite the chapter...", it returns the full text usually.
            // So we clear it before streaming if it's a rewrite.
            if (isIterate) setChapterContent("");

            let fullMarkdown = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.error) {
                                alert(`AI Error: ${data.error}`);
                                break;
                            }
                            if (data.content) {
                                fullMarkdown += data.content;
                                // Convert full buffer to HTML to handle partial markers correctly
                                setChapterContent(markdownToHtml(fullMarkdown));
                            }
                        } catch (e) { }
                    }
                }
            }
        } catch (e) {
            alert("Error writing chapter: " + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateBibleElement = async (suggestion) => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/bible`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    story_id: parseInt(storyId),
                    name: suggestion.name,
                    type: suggestion.type,
                    content: `Placeholder for ${suggestion.name}. Reason for creation: ${suggestion.reason}`
                })
            });
            if (res.ok) {
                // Update local state to remove the suggestion or mark it
                setSmartContext({
                    ...smartContext,
                    suggested_new_elements: smartContext.suggested_new_elements.filter(s => s.name !== suggestion.name),
                    relevant_elements: [...(smartContext.relevant_elements || []), suggestion.name]
                });
            }
        } catch (e) {
            alert("Error creating element: " + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    // -- Renders --

    const renderStepContent = () => {
        switch (activeStep) {
            case 0:
                return (
                    <div className="step-container fade-in">
                        <h3>Chapter Brief</h3>
                        <p className="helper-text">Describe what happens in this chapter. Mention key events, characters, and settings.</p>
                        <div className="editor-wrapper">
                            <SlashEditor
                                value={brief}
                                onChange={setBrief}
                                bibleElements={bibleElements}
                                placeholder="e.g. [[Character:Elara]] enters the [[Location:Crystal Cave]] and confronts the Guardian..."
                            />
                        </div>
                        <div className="step-actions">
                            <button className="btn-secondary" onClick={onCancel}>Cancel</button>
                            <button className="btn-primary" onClick={handleGenerateContext} disabled={!brief.trim() || isLoading}>
                                {isLoading ? "Analyzing..." : "Next: Smart Context"}
                            </button>
                        </div>
                    </div>
                );
            case 1:
                return (
                    <div className="step-container fade-in">
                        <h3>Smart Context</h3>

                        <div className="context-section">
                            <h4>Story So Far</h4>
                            <textarea
                                className="assist-textarea small"
                                value={smartContext?.story_so_far || ""}
                                onChange={(e) => setSmartContext({ ...smartContext, story_so_far: e.target.value })}
                            />
                        </div>

                        <div className="context-grid">
                            <div className="context-col">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h4>Relevant Elements</h4>
                                    <div className="add-element-search">
                                        <input
                                            type="text"
                                            placeholder="Add element..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                                        />
                                        {searchTerm && (
                                            <div className="search-results-popover glass">
                                                {bibleElements
                                                    .filter(be =>
                                                        be.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                                                        !smartContext?.relevant_elements?.includes(be.name)
                                                    )
                                                    .slice(0, 5)
                                                    .map(be => (
                                                        <div
                                                            key={be.id}
                                                            className="search-result-item"
                                                            onClick={() => {
                                                                setSmartContext({
                                                                    ...smartContext,
                                                                    relevant_elements: [...(smartContext.relevant_elements || []), be.name]
                                                                });
                                                                setSearchTerm("");
                                                            }}
                                                        >
                                                            <span className={`type-tag color-${be.type}`}>{be.type[0].toUpperCase()}</span>
                                                            {be.name}
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="element-cards-grid">
                                    {smartContext?.relevant_elements?.map((elName, i) => {
                                        const fullEl = bibleElements.find(be => be.name === elName);
                                        return (
                                            <div key={i} className={`element-card ${fullEl?.type || 'generic'}`}>
                                                <div className="card-top">
                                                    <span className="badge">{fullEl?.type || 'Element'}</span>
                                                    <button
                                                        className="btn-remove-card"
                                                        onClick={() => {
                                                            setSmartContext({
                                                                ...smartContext,
                                                                relevant_elements: smartContext.relevant_elements.filter(name => name !== elName)
                                                            });
                                                        }}
                                                    >
                                                        &times;
                                                    </button>
                                                </div>
                                                <div className="card-name">{elName}</div>
                                            </div>
                                        );
                                    })}
                                    {(!smartContext?.relevant_elements?.length) && <p className="subtext">No specific elements selected.</p>}
                                </div>
                            </div>
                            <div className="context-col">
                                <h4>Suggested New Elements</h4>
                                <div className="element-cards-grid">
                                    {smartContext?.suggested_new_elements?.length > 0 ? (
                                        smartContext.suggested_new_elements.map((el, i) => (
                                            <div key={i} className={`element-card suggested ${el.type}`}>
                                                <div className="card-top">
                                                    <span className="badge">{el.type}</span>
                                                    <span className="badge-suggested">NEW</span>
                                                </div>
                                                <div className="card-name">{el.name}</div>
                                                <div className="card-reason">{el.reason}</div>
                                                <button
                                                    className="btn-create-el"
                                                    onClick={() => handleCreateBibleElement(el)}
                                                    disabled={isLoading}
                                                >
                                                    {isLoading ? "..." : "+ Create"}
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="subtext">No new elements suggested.</p>
                                    )}
                                </div>
                                <div className="info-box">
                                    Note: Suggested elements above are AI recommendations based on your brief.
                                </div>
                            </div>
                        </div>

                        <div className="step-actions">
                            <button className="btn-secondary" onClick={() => setActiveStep(0)}>Back</button>
                            <button className="btn-primary" onClick={() => handleGenerateOutline(false)} disabled={isLoading}>
                                {isLoading ? "Generating Outline..." : "Next: Create Outline"}
                            </button>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="step-container fade-in">
                        <h3>Chapter Outline</h3>
                        <div className="editor-wrapper">
                            <SlashEditor
                                value={outline}
                                onChange={setOutline}
                                bibleElements={bibleElements}
                                placeholder="Outline will appear here..."
                            />
                        </div>

                        <div className="iteration-box">
                            <input
                                type="text"
                                placeholder="Feedback / Comments for iteration..."
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                className="comment-input"
                            />
                            <button className="btn-iterate" onClick={() => handleGenerateOutline(true)} disabled={!comments.trim() || isLoading}>
                                {isLoading ? "Updating..." : "Iterate"}
                            </button>
                        </div>

                        <div className="step-actions">
                            <button className="btn-secondary" onClick={() => setActiveStep(1)}>Back</button>
                            <button className="btn-primary" onClick={() => handleWriteChapter(false)} disabled={isLoading}>
                                {isLoading ? "Writing Chapter..." : "Next: Write Chapter"}
                            </button>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="step-container fade-in">
                        <h3>Chapter Content</h3>
                        <div className="editor-wrapper">
                            <SlashEditor
                                value={chapterContent}
                                onChange={setChapterContent}
                                bibleElements={bibleElements}
                                placeholder="Chapter content..."
                            />
                        </div>

                        <div className="iteration-box">
                            <input
                                type="text"
                                placeholder="Feedback / Comments to rewrite..."
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                className="comment-input"
                            />
                            <button className="btn-iterate" onClick={() => handleWriteChapter(true)} disabled={!comments.trim() || isLoading}>
                                {isLoading ? "Rewriting..." : "Iterate"}
                            </button>
                        </div>

                        <div className="step-actions">
                            <button className="btn-secondary" onClick={() => setActiveStep(2)}>Back</button>
                            <button className="btn-success" onClick={() => onFinish(chapterContent)}>
                                Finish & Save
                            </button>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <AssistModal steps={STEPS} activeStep={activeStep}>
            {renderStepContent()}
        </AssistModal>
    );
}
