import React, { useState } from 'react';
import { Outlet, useNavigate, useParams, Link } from 'react-router-dom';
import Breadcrumbs from './Breadcrumbs';

function Layout({ stories, onCreateStory, onDeleteStory, currentStoryId, bibleElements, chapters }) {
    const navigate = useNavigate();
    const { storyId } = useParams();

    // Highlight "Global Settings" if path is /settings
    const isSettings = window.location.pathname.startsWith('/settings');

    return (
        <div className="layout">
            <aside className="sidebar glass">
                <div className="sidebar-header">
                    {/* Link to home instead of h2 text only */}
                    <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <h2>Chronolith</h2>
                    </Link>
                    <button className="btn-add" onClick={onCreateStory}>+ New Story</button>
                </div>
                <nav className="story-list">
                    {stories.map(s => (
                        <div
                            key={s.id}
                            className={`story-item-container ${String(currentStoryId) === String(s.id) ? 'active' : ''}`}
                            onClick={() => navigate(`/stories/${s.id}/bible`)}
                        >
                            <div className="story-item">
                                {s.title}
                            </div>
                            <button
                                className="btn-delete-icon"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteStory(s);
                                }}
                            >
                                &times;
                            </button>
                        </div>
                    ))}
                </nav>
                <div className="sidebar-footer">
                    <button
                        className={`btn-settings ${isSettings ? 'active' : ''}`}
                        onClick={() => navigate('/settings')}
                    >
                        ⚙️ Global Settings
                    </button>
                </div>
            </aside>

            <main className="content">
                <Breadcrumbs stories={stories} chapters={chapters} bibleElements={bibleElements} />
                <Outlet />
            </main>
        </div>
    );
}

export default Layout;
