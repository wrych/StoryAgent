import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import BibleView from '../components/BibleView';
import ChaptersView from '../components/ChaptersView';

function Modal({ title, isOpen, onClose, children }) {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button className="btn-close" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
}

// Minimal re-definition if not importing, but better to import from App/shared if generic.
// Since App.jsx had it, I should have extracted it.
// I'll assume I can extract it or duplicate for now. Duplicating small modal wrapper for safety.

function StoryDashboard({
    story,
    bibleElements,
    chapters,
    bibleSchema,
    onRefreshBible,
    onRefreshChapters,
    onCreateBibleElement,
    onCreateChapter,
    onDeleteBibleElement,
    onDeleteChapter
}) {
    const location = useLocation();
    const navigate = useNavigate();

    // Local state for creation modals ONLY
    const [modalType, setModalType] = useState(null); // 'bible', 'chapter'
    const [modalData, setModalData] = useState({});

    if (!story) {
        return <div className="loading">Loading story...</div>;
    }

    const activeTab = location.pathname.includes('/chapters') ? 'chapters' : 'bible';

    const handleCreateBible = async () => {
        await onCreateBibleElement(modalData);
        setModalType(null);
        setModalData({});
    };

    const handleCreateChapter = async () => {
        await onCreateChapter(modalData);
        setModalType(null);
        setModalData({});
    };

    return (
        <div className="story-dashboard">
            <header className="content-header glass">
                <h1>{story.title}</h1>
                <div className="tabs">
                    <Link
                        to={`/stories/${story.id}/bible`}
                        className={activeTab === 'bible' ? 'active' : ''}
                    >
                        <button className={activeTab === 'bible' ? 'active' : ''}>Story Bible</button>
                    </Link>
                    <Link
                        to={`/stories/${story.id}/chapters`}
                        className={activeTab === 'chapters' ? 'active' : ''}
                    >
                        <button className={activeTab === 'chapters' ? 'active' : ''}>Chapters</button>
                    </Link>
                </div>
            </header>

            <section className="main-view">
                <Routes>
                    <Route path="bible" element={
                        <BibleView
                            storyId={story.id}
                            elements={bibleElements}
                            schema={bibleSchema}
                            onRefresh={onRefreshBible}
                            onAdd={(type) => {
                                setModalType('bible');
                                setModalData({ type, name: '', content: '' });
                            }}
                            onDelete={onDeleteBibleElement}
                        />
                    } />
                    <Route path="bible/:elementId" element={
                        <BibleView
                            storyId={story.id}
                            elements={bibleElements}
                            schema={bibleSchema}
                            onRefresh={onRefreshBible}
                            onAdd={(type) => {
                                setModalType('bible');
                                setModalData({ type, name: '', content: '' });
                            }}
                            onDelete={onDeleteBibleElement}
                        />
                    } />
                    <Route path="chapters" element={
                        <ChaptersView
                            storyId={story.id}
                            chapters={chapters}
                            onRefresh={onRefreshChapters}
                            bibleElements={bibleElements}
                            onAdd={() => {
                                setModalType('chapter');
                                setModalData({ title: '' });
                            }}
                            onDelete={onDeleteChapter}
                        />
                    } />
                    <Route path="chapters/:chapterId" element={
                        <ChaptersView
                            storyId={story.id}
                            chapters={chapters}
                            onRefresh={onRefreshChapters}
                            bibleElements={bibleElements}
                            onAdd={() => {
                                setModalType('chapter');
                                setModalData({ title: '' });
                            }}
                            onDelete={onDeleteChapter}
                        />
                    } />
                    <Route path="*" element={<Navigate to="bible" replace />} />
                </Routes>
            </section>

            {/* Local Modals for Creation */}
            <Modal
                isOpen={modalType !== null}
                onClose={() => setModalType(null)}
                title={modalType === 'bible' ? `Add ${modalData.type}` : 'Add Chapter'}
            >
                {modalType === 'bible' && (
                    <div className="editor-form">
                        <label>Name</label>
                        <input
                            autoFocus
                            value={modalData.name || ''}
                            onChange={e => setModalData({ ...modalData, name: e.target.value })}
                        />
                        {/* Note: Simplified creation modal - just name/type usually, detailed edit later? 
                Existing App.jsx had helper inputs. I'll rely on the user editing after create 
                OR generic input. But App.jsx passed `SlashEditor`. 
                I need SlashEditor here if I want to support content on creation.
                I'll leave it as name only for now to encourage creating then editing in the main view,
                OR I import SlashEditor. Let's import SlashEditor implicitly via passing children?
                No, I'll just skip complex content on create for simplicity in this refactor, 
                as the user can edit immediately. 
            */}
                        <button className="btn-save" onClick={handleCreateBible}>Add to Bible</button>
                    </div>
                )}
                {modalType === 'chapter' && (
                    <div className="editor-form">
                        <label>Chapter Title</label>
                        <input
                            autoFocus
                            value={modalData.title || ''}
                            onChange={e => setModalData({ ...modalData, title: e.target.value })}
                        />
                        <button className="btn-save" onClick={handleCreateChapter}>Initialize Chapter</button>
                    </div>
                )}
            </Modal>
        </div>
    );
}

export default StoryDashboard;
