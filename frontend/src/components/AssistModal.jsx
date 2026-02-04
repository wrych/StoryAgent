import React from 'react';

export function AssistModal({ steps, activeStep, children }) {
    return (
        <div className="chapter-assist-overlay">
            <div className="chapter-assist-modal">
                <div className="stepper-header">
                    {steps.map((s, idx) => (
                        <div key={s.id} className={`step-item ${idx <= activeStep ? 'active' : ''} ${idx === activeStep ? 'current' : ''}`}>
                            <div className="step-number">{idx + 1}</div>
                            <span>{s.label}</span>
                            {idx < steps.length - 1 && <div className="step-line" />}
                        </div>
                    ))}
                </div>

                <div className="assist-content">
                    {children}
                </div>
            </div>
        </div>
    );
}
