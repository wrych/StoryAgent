import React from 'react';
import { useLocation, Link, useParams } from 'react-router-dom';

const Breadcrumbs = ({ stories = [], chapters = [], bibleElements = [] }) => {
    const location = useLocation();
    const pathnames = location.pathname.split('/').filter((x) => x);

    // Map of path keys to friendly names
    const nameMap = {
        stories: null, // Don't show "Stories" root if we don't want to, or keep it generic
        bible: 'Story Bible',
        chapters: 'Chapters',
        settings: 'Global Settings'
    };

    const getName = (segment, index, arr) => {
        // Check if it's a known static route
        if (nameMap[segment]) return nameMap[segment];

        // Check if it's a Story ID (preceded by 'stories')
        if (arr[index - 1] === 'stories') {
            const story = stories.find(s => String(s.id) === segment);
            return story ? story.title : segment;
        }

        // Check if it's a Chapter ID (preceded by 'chapters')
        if (arr[index - 1] === 'chapters') {
            const chapter = chapters.find(c => String(c.id) === segment);
            return chapter ? chapter.title : segment;
        }

        // Check if it's a Bible Element ID (preceded by 'bible')
        if (arr[index - 1] === 'bible') {
            const element = bibleElements.find(e => String(e.id) === segment);
            return element ? element.name : segment;
        }

        return segment.charAt(0).toUpperCase() + segment.slice(1);
    };

    return (
        <nav aria-label="breadcrumb" className="breadcrumb-nav">
            <ol className="breadcrumb-list">
                <li className="breadcrumb-item">
                    <Link to="/">Home</Link>
                </li>
                {pathnames.map((value, index) => {
                    const to = `/${pathnames.slice(0, index + 1).join('/')}`;
                    const isLast = index === pathnames.length - 1;

                    // Skip resolving "stories" segment if it's just a spacer for the ID
                    if (value === 'stories') return null;

                    // For the "edit window" logic, if we are at /bible/123, we want "Story Bible > [Element Name]"

                    const name = getName(value, index, pathnames);

                    return isLast ? (
                        <li className="breadcrumb-item active" aria-current="page" key={to}>
                            {name}
                        </li>
                    ) : (
                        <li className="breadcrumb-item" key={to}>
                            <Link to={to}>{name}</Link>
                        </li>
                    );
                })}
            </ol>
            <style>{`
        .breadcrumb-nav {
          padding: 0.5rem 1rem;
          background: rgba(0, 0, 0, 0.2);
          border-bottom: 1px solid var(--border-color);
          font-size: 0.9rem;
        }
        .breadcrumb-list {
          list-style: none;
          display: flex;
          flex-wrap: wrap;
          padding: 0;
          margin: 0;
        }
        .breadcrumb-item {
          display: flex;
          align-items: center;
        }
        .breadcrumb-item:not(:last-child)::after {
          content: '/';
          margin: 0 0.5rem;
          color: var(--text-secondary);
        }
        .breadcrumb-item a {
          color: var(--text-secondary);
          text-decoration: none;
        }
        .breadcrumb-item a:hover {
          color: var(--text-primary);
          text-decoration: underline;
        }
        .breadcrumb-item.active {
          color: var(--text-primary);
          font-weight: 500;
        }
      `}</style>
        </nav>
    );
};

export default Breadcrumbs;
