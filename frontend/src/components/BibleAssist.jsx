import React, { useState } from 'react';
import { DynamicForm } from './Forms';
import { AssistModal } from './AssistModal';

const STEPS = [
    { id: 'brief', label: 'Brief' },
    { id: 'context', label: 'Smart Context' },
    { id: 'proposal', label: 'Proposal' },
    { id: 'review', label: 'Review' }
];

const API_BASE = 'http://localhost:8000';

export function BibleAssist({ storyId, initialType, schema, globalLists, onSave, onCancel, existingElement = null }) {
    const [activeStep, setActiveStep] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Data State
    const [brief, setBrief] = useState("");
    const [elementType, setElementType] = useState(initialType || 'character');

    // Smart Context State
    const [smartContext, setSmartContext] = useState({ relevant_elements: [] });
    const [searchTerm, setSearchTerm] = useState("");
    const [bibleElements, setBibleElements] = useState(globalLists?.bibleElements || []);

    // Proposal State
    const [proposal, setProposal] = useState(existingElement ? {
        name: existingElement.name,
        type: existingElement.type,
        content: typeof existingElement.content === 'string' ? JSON.parse(existingElement.content || '{}') : existingElement.content
    } : null);

    // If editing, skip to Proposal step
    React.useEffect(() => {
        if (existingElement) {
            // For editing, we might want to skip smart context or at least pre-fill it?
            // Let's go to Proposal step directly as before
            setActiveStep(2);
        }
        if (globalLists?.bibleElements) {
            setBibleElements(globalLists.bibleElements);
        }
    }, [existingElement, globalLists]);

    // Step 1 -> 2: Analyze Brief (Generate Smart Context)
    const handleAnalyzeBrief = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/ai/analyze-bible-brief`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    story_id: parseInt(storyId),
                    user_brief: brief,
                    element_type: elementType
                })
            });
            const data = await res.json();
            setSmartContext(data); // { relevant_elements: [], reasoning: ... }
            setActiveStep(1);
        } catch (e) {
            alert("Error analyzing brief: " + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Step 2 -> 3: PROPOSE (using Context)
    const handleGenerateProposal = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/ai/propose-bible-element`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    story_id: parseInt(storyId),
                    user_brief: brief,
                    element_type: elementType,
                    relevant_elements: smartContext.relevant_elements
                })
            });
            const data = await res.json();

            setProposal({
                name: data.name,
                type: data.type,
                content: data.content
            });
            setActiveStep(2);
        } catch (e) {
            alert("Error generating proposal: " + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFinish = () => {
        // Prepare final object
        const finalEl = {
            ...proposal,
            content: JSON.stringify(proposal.content)
        };
        if (existingElement) {
            finalEl.id = existingElement.id;
        }
        onSave(finalEl);
    };

    const markdownToHtml = (text) => {
        if (!text) return "";
        let html = text
            .replace(/\n/g, '<br />')
            .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/__(.*?)__/g, '<strong>$1</strong>')
            .replace(/_(.*?)_/g, '<em>$1</em>');
        return html;
    };

    const renderStepContent = () => {
        switch (activeStep) {
            case 0: // Brief
                return (
                    <div className="step-container fade-in">
                        <h3>New {elementType.charAt(0).toUpperCase() + elementType.slice(1)}</h3>
                        <p className="helper-text">Describe the element you want to create (e.g., "A grumpy old wizard who loves cats").</p>

                        <div className="form-group">
                            <label>Type</label>
                            <select value={elementType} onChange={e => setElementType(e.target.value)}>
                                {Object.keys(schema).filter(k => k !== 'story_settings').map(key => (
                                    <option key={key} value={key}>{schema[key].name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Description / Brief</label>
                            <textarea
                                className="assist-textarea"
                                value={brief}
                                onChange={e => setBrief(e.target.value)}
                                placeholder="Enter your description here..."
                            />
                        </div>

                        <div className="step-actions">
                            <button className="btn-secondary" onClick={onCancel}>Cancel</button>
                            <button
                                className="btn-primary"
                                onClick={handleAnalyzeBrief}
                                disabled={!brief.trim() || isLoading}
                            >
                                {isLoading ? "Analyzing..." : "Next: Smart Context"}
                            </button>
                        </div>
                    </div>
                );
            case 1: // Smart Context
                return (
                    <div className="step-container fade-in">
                        <h3>Smart Context</h3>
                        <p className="helper-text">The AI has identified existing elements that seem related. Add or remove context to help the AI generate a better proposal.</p>

                        <div className="context-grid">
                            <div className="context-col" style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h4>Relevant Elements</h4>
                                    <div className="add-element-search">
                                        <input
                                            type="text"
                                            placeholder="Add element..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'white', width: '200px' }}
                                        />
                                        {searchTerm && (
                                            <div className="search-results-popover glass">
                                                {bibleElements
                                                    .filter(be =>
                                                        be.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                                                        !smartContext.relevant_elements.includes(be.name)
                                                    )
                                                    .slice(0, 5)
                                                    .map(be => (
                                                        <div
                                                            key={be.id}
                                                            className="search-result-item"
                                                            onClick={() => {
                                                                setSmartContext({
                                                                    ...smartContext,
                                                                    relevant_elements: [...smartContext.relevant_elements, be.name]
                                                                });
                                                                setSearchTerm("");
                                                            }}
                                                        >
                                                            {be.name} <small>({be.type})</small>
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="element-cards-grid">
                                    {smartContext.relevant_elements.map((elName, i) => {
                                        const fullEl = bibleElements.find(be => be.name === elName);
                                        return (
                                            <div key={i} className={`element-card ${fullEl?.type || 'generic'}`}>
                                                <div className="card-top">
                                                    <span className="badge">{fullEl?.type || 'Context'}</span>
                                                    <button
                                                        className="btn-remove-card"
                                                        onClick={() => {
                                                            setSmartContext({
                                                                ...smartContext,
                                                                relevant_elements: smartContext.relevant_elements.filter(n => n !== elName)
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
                                    {smartContext.relevant_elements.length === 0 && (
                                        <p className="subtext">No specific context selected (will use general context).</p>
                                    )}
                                </div>

                                {smartContext.reasoning && (
                                    <div className="info-box" style={{ marginTop: '1rem' }}>
                                        <strong>AI Reasoning:</strong>
                                        <span dangerouslySetInnerHTML={{ __html: ' ' + markdownToHtml(smartContext.reasoning) }} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="step-actions">
                            <button className="btn-secondary" onClick={() => setActiveStep(0)}>Back</button>
                            <button
                                className="btn-primary"
                                onClick={handleGenerateProposal}
                                disabled={isLoading}
                            >
                                {isLoading ? "Generating..." : "Next: Generate Proposal"}
                            </button>
                        </div>
                    </div>
                );
            case 2: // Proposal (Edit)
                if (!proposal) return <div>No proposal generated.</div>;
                const typeSchema = schema[proposal.type];

                return (
                    <div className="step-container fade-in">
                        <h3>Edit Proposal</h3>

                        <div className="editor-form" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            <div className="form-group">
                                <label>Name</label>
                                <input
                                    value={proposal.name}
                                    onChange={e => setProposal({ ...proposal, name: e.target.value })}
                                />
                            </div>

                            {typeSchema && (
                                <DynamicForm
                                    schema={typeSchema}
                                    value={proposal.content}
                                    onChange={val => setProposal({ ...proposal, content: val })}
                                    globalLists={globalLists}
                                />
                            )}
                        </div>

                        <div className="iteration-box">
                            <span className="subtext">Edit the fields above to refine the element.</span>
                        </div>

                        <div className="step-actions">
                            <button className="btn-secondary" onClick={() => setActiveStep(1)}>Back to Context</button>
                            <button className="btn-primary" onClick={() => setActiveStep(3)}>Next: Review</button>
                        </div>
                    </div>
                );
            case 3: // Review
                return (
                    <div className="step-container fade-in">
                        <h3>Review & Save</h3>

                        <div className="premium-card" style={{ margin: '0 auto', maxWidth: '400px' }}>
                            <div className="card-header">
                                <h3>{proposal.name}</h3>
                            </div>
                            <span className={`badge ${proposal.type}`}>{proposal.type}</span>
                            <div className="content-preview rich-text-preview"
                                dangerouslySetInnerHTML={{ __html: proposal.content?.description || 'No description' }}
                            />
                        </div>

                        <div className="step-actions">
                            <button className="btn-secondary" onClick={() => setActiveStep(2)}>Back to Edit</button>
                            <button className="btn-success" onClick={handleFinish}>Save Element</button>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <AssistModal
            steps={STEPS}
            activeStep={activeStep}
        >
            {renderStepContent()}
        </AssistModal>
    );
}
