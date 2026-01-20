import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useMatch, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import Settings from './pages/Settings';
import StoryDashboard from './pages/StoryDashboard';
import { Modal } from './components/Modal';

const API_BASE = 'http://localhost:8000';

function InnerApp() {
  const navigate = useNavigate();
  const match = useMatch('/stories/:storyId/*');
  const storyId = match?.params.storyId;

  // Global State
  const [stories, setStories] = useState([]);
  const [bibleSchema, setBibleSchema] = useState({});

  // Story-specific State (Lifted for Breadcrumbs access)
  const [currentStory, setCurrentStory] = useState(null);
  const [bibleElements, setBibleElements] = useState([]);
  const [chapters, setChapters] = useState([]);

  // Modals for global actions
  const [modalData, setModalData] = useState({});
  const [modalType, setModalType] = useState(null); // 'story', 'confirm'
  const [confirmAction, setConfirmAction] = useState(null);

  // Initial Fetch
  useEffect(() => {
    fetchStories();
    fetchSchema();
  }, []);

  // Sync currentStory and fetch details when URL changes
  useEffect(() => {
    if (storyId && stories.length > 0) {
      const story = stories.find(s => String(s.id) === String(storyId));
      if (story) {
        setCurrentStory(story);
        fetchBible(story.id);
        fetchChapters(story.id);
      }
    } else {
      setCurrentStory(null);
      setBibleElements([]);
      setChapters([]);
    }
  }, [storyId, stories]);

  // --- API Helpers ---

  const fetchSchema = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/bible_schema`);
      const data = await res.json();
      setBibleSchema(data);
    } catch (e) { console.error(e); }
  };

  const saveSchema = async (newSchema) => {
    await fetch(`${API_BASE}/settings/bible_schema`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSchema)
    });
    setBibleSchema(newSchema);
  };

  const fetchStories = async () => {
    try {
      const res = await fetch(`${API_BASE}/stories`);
      const data = await res.json();
      if (Array.isArray(data)) setStories(data);
    } catch (e) { console.error(e); }
  };

  const fetchBible = async (id = storyId) => {
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE}/stories/${id}/bible`);
      const data = await res.json();
      if (Array.isArray(data)) setBibleElements(data);
    } catch (e) { console.error(e); }
  };

  const fetchChapters = async (id = storyId) => {
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE}/stories/${id}/chapters`);
      const data = await res.json();
      if (Array.isArray(data)) setChapters(data);
    } catch (e) { console.error(e); }
  };

  // --- Action Handlers ---

  const createStory = async () => {
    if (!modalData.title) return;
    const res = await fetch(`${API_BASE}/stories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: modalData.title, description: '' })
    });
    const newStory = await res.json();
    await fetchStories(); // Ensure list is synced with backend
    setModalType(null);
    setModalData({});
    if (newStory && newStory.id) {
      navigate(`/stories/${newStory.id}/bible`);
    }
  };

  const deleteStory = async (id) => {
    await fetch(`${API_BASE}/stories/${id}`, { method: 'DELETE' });
    if (String(storyId) === String(id)) navigate('/');
    fetchStories();
    setModalType(null);
  };

  const createBibleElement = async (data) => {
    // data comes from StoryDashboard modal
    if (!storyId) return;
    await fetch(`${API_BASE}/bible`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ story_id: storyId, type: data.type, name: data.name, content: data.content || '' })
    });
    fetchBible(storyId);
  };

  const deleteBibleElement = async (el) => {
    // Instant delete for now, or could open global confirm. 
    // Let's pass a confirm handler? 
    // For simplicity/speed, I'll pass the GLOBAL confirm trigger down.
    openConfirm('Delete Element', `Are you sure you want to delete "${el.name}"?`, async () => {
      await fetch(`${API_BASE}/bible/${el.id}`, { method: 'DELETE' });
      fetchBible(storyId);
      setModalType(null);
    });
  };

  const createChapter = async (data) => {
    if (!storyId) return;
    await fetch(`${API_BASE}/chapters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ story_id: storyId, order: chapters.length + 1, title: data.title, content: '' })
    });
    fetchChapters(storyId);
  };

  const deleteChapter = async (ch) => {
    openConfirm('Delete Chapter', `Are you sure you want to delete "${ch.title}"?`, async () => {
      await fetch(`${API_BASE}/chapters/${ch.id}`, { method: 'DELETE' });
      fetchChapters(storyId);
      setModalType(null);
    });
  };

  const openConfirm = (title, message, onConfirm) => {
    setModalData({ title, message });
    setConfirmAction(() => onConfirm);
    setModalType('confirm');
  };

  return (
    <>
      <Routes>
        <Route path="/" element={
          <Layout
            stories={stories}
            onCreateStory={() => { setModalType('story'); setModalData({}); }}
            onDeleteStory={(s) => openConfirm('Delete Story', `Delete "${s.title}"?`, () => deleteStory(s.id))}
            currentStoryId={storyId}
            bibleElements={bibleElements}
            chapters={chapters}
          />
        }>
          <Route index element={
            <div className="empty-state">
              <h1>Welcome to Chronolith</h1>
              <p>Select or create a story to begin writing.</p>
            </div>
          } />
          <Route path="settings" element={
            <Settings schema={bibleSchema} onSave={saveSchema} />
          } />
          <Route path="stories/:storyId/*" element={
            <StoryDashboard
              story={currentStory}
              bibleElements={bibleElements}
              chapters={chapters}
              bibleSchema={bibleSchema}
              onRefreshBible={() => fetchBible(storyId)}
              onRefreshChapters={() => fetchChapters(storyId)}
              onCreateBibleElement={createBibleElement}
              onCreateChapter={createChapter}
              onDeleteBibleElement={deleteBibleElement}
              onDeleteChapter={deleteChapter}
            />
          } />
        </Route>
      </Routes>

      <Modal
        isOpen={modalType !== null}
        onClose={() => setModalType(null)}
        title={modalType === 'story' ? 'Create New Story' : modalType === 'confirm' ? modalData.title : ''}
      >
        {modalType === 'story' && (
          <div className="editor-form">
            <label>Story Title</label>
            <input
              autoFocus
              value={modalData.title || ''}
              onChange={e => setModalData({ ...modalData, title: e.target.value })}
            />
            <button className="btn-save" onClick={createStory}>Create Project</button>
          </div>
        )}
        {modalType === 'confirm' && (
          <div className="confirm-modal">
            <p>{modalData.message}</p>
            <div className="editor-actions" style={{ marginTop: '2rem' }}>
              <button className="btn-delete" onClick={confirmAction}>Delete</button>
              <button onClick={() => setModalType(null)}>Cancel</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <InnerApp />
    </BrowserRouter>
  );
}

export default App;
