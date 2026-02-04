from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Any
import crud, models, database, json

app = FastAPI(title="Story Writing Agent API")

# Enable CORS for frontend interaction
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    database.create_db_and_tables()
    
    # Initialize default schemas
    from defaults import DEFAULT_LISTS, DEFAULT_SETTINGS
    
    # Seed default lists if not present
    for key, values in DEFAULT_LISTS.items():
        if not crud.get_global_setting(key):
            crud.set_global_setting(key, values)

    # Seed default settings if not present
    for key, value in DEFAULT_SETTINGS.items():
        if not crud.get_global_setting(key):
            crud.set_global_setting(key, value)

    # Fetch current genres for schema
    current_genres = crud.get_global_setting("genres")
    genre_options = json.loads(current_genres.value) if current_genres else DEFAULT_LISTS["genres"]

    # Initialize default schemas - SIMPLIFIED as per user request
    default_schema = {
        "story_settings": {
            "name": "Story Settings",
            "fields": [
                {"key": "genre", "label": "Genre", "type": "select", "options": genre_options},
                {"key": "description", "label": "Description", "type": "text"}
            ]
        },
        "character": {
            "name": "Character",
            "fields": [
                {"key": "description", "label": "Description", "type": "text"}
            ]
        },
        "location": {
            "name": "Location",
            "fields": [
                {"key": "description", "label": "Description", "type": "text"}
            ]
        },
        "arc": {
            "name": "Story Arc",
            "fields": [
                {"key": "description", "label": "Description", "type": "text"}
            ]
        },
        "timeline": {
            "name": "Timeline",
            "fields": [
                {"key": "description", "label": "Description", "type": "text"}
            ]
        }
    }
    
    existing = crud.get_global_setting("bible_schema")
    if not existing:
        crud.set_global_setting("bible_schema", default_schema)

@app.get("/stories", response_model=List[models.Story])
def read_stories():
    return crud.get_stories()

@app.post("/stories", response_model=models.Story)
def create_story(story: models.Story):
    return crud.create_story(story)

@app.get("/stories/{story_id}/bible", response_model=List[models.BibleElement])
def read_bible_elements(story_id: int):
    from sqlmodel import Session, select
    with Session(database.engine) as session:
        return session.exec(select(models.BibleElement).where(models.BibleElement.story_id == story_id, models.BibleElement.is_deleted == False)).all()

@app.post("/bible", response_model=models.BibleElement)
def create_bible_element(element: models.BibleElement):
    return crud.create_bible_element(element)

@app.put("/bible/{element_id}", response_model=models.BibleElement)
def update_bible_element(element_id: int, element: models.BibleElement):
    updated = crud.update_bible_element(element_id, element.name, element.content)
    if not updated:
        raise HTTPException(status_code=404, detail="Element not found")
    return updated

@app.get("/stories/{story_id}/chapters", response_model=List[models.Chapter])
def read_chapters(story_id: int):
    from sqlmodel import Session, select
    with Session(database.engine) as session:
        return session.exec(select(models.Chapter).where(models.Chapter.story_id == story_id, models.Chapter.is_deleted == False).order_by(models.Chapter.order)).all()

@app.post("/chapters", response_model=models.Chapter)
def create_chapter(chapter: models.Chapter):
    return crud.create_chapter(chapter)

@app.put("/chapters/{chapter_id}", response_model=models.Chapter)
def update_chapter(chapter_id: int, chapter: models.Chapter):
    updated = crud.update_chapter(chapter_id, chapter.title, chapter.content)
    if not updated:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return updated

@app.get("/chapters/{chapter_id}/history", response_model=List[models.VersionHistory])
def read_chapter_history(chapter_id: int):
    from sqlmodel import Session, select
    with Session(database.engine) as session:
        return session.exec(select(models.VersionHistory).where(models.VersionHistory.chapter_id == chapter_id).order_by(models.VersionHistory.version.desc())).all()

@app.get("/bible/{element_id}/history", response_model=List[models.VersionHistory])
def read_bible_history(element_id: int):
    from sqlmodel import Session, select
    with Session(database.engine) as session:
        return session.exec(select(models.VersionHistory).where(models.VersionHistory.bible_element_id == element_id).order_by(models.VersionHistory.version.desc())).all()

@app.delete("/stories/{story_id}")
def delete_story(story_id: int):
    if not crud.delete_story(story_id):
        raise HTTPException(status_code=404, detail="Story not found")
    return {"message": "Story deleted"}

@app.delete("/bible/{element_id}")
def delete_bible_element(element_id: int):
    if not crud.delete_bible_element(element_id):
        raise HTTPException(status_code=404, detail="Element not found")
    return {"message": "Element deleted"}

@app.delete("/chapters/{chapter_id}")
def delete_chapter(chapter_id: int):
    if not crud.delete_chapter(chapter_id):
        raise HTTPException(status_code=404, detail="Chapter not found")
    return {"message": "Chapter deleted"}

@app.get("/settings")
def read_all_settings():
    settings = crud.get_all_global_settings()
    result = {}
    for s in settings:
        try:
            result[s.key] = json.loads(s.value)
        except:
            result[s.key] = s.value
    return result

@app.get("/settings/{key}")
def read_setting(key: str):
    setting = crud.get_global_setting(key)
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    return json.loads(setting.value)

@app.post("/settings/{key}")
def update_setting(key: str, value: Any = Body(...)):
    print(f"DEBUG: Received update for setting '{key}': {value}")
    crud.set_global_setting(key, value)
    return {"message": "Setting updated"}

@app.post("/ai/generate-chapter")
async def generate_chapter(payload: dict):
    from fastapi.responses import StreamingResponse
    story_id = payload.get("story_id")
    description = payload.get("description")
    
    if not story_id or not description:
        raise HTTPException(status_code=400, detail="Missing story_id or description")
    
    # 1. Fetch Bible Context
    with models.Session(database.engine) as session:
        elements = session.exec(
            models.select(models.BibleElement).where(
                models.BibleElement.story_id == story_id, 
                models.BibleElement.is_deleted == False
            )
        ).all()
    
    bible_context = "\n".join([f"### {el.type.capitalize()}: {el.name}\n{el.content}" for el in elements])
    
    llm_url_setting = crud.get_global_setting("llm_url")
    system_prompt_setting = crud.get_global_setting("llm_system_prompt")
    
    def parse_setting(setting, default):
        if not setting: return default
        try:
            val = json.loads(setting.value)
            if isinstance(val, str):
                return val.strip('"').strip("'")
            return val if val else default
        except:
            if isinstance(setting.value, str):
                return setting.value.strip('"').strip("'")
            return setting.value if setting.value else default

    url = parse_setting(llm_url_setting, "http://localhost:1234/v1/chat/completions")
    sys_prompt = parse_setting(system_prompt_setting, "You are a creative writing assistant.")
    
    print(f"DEBUG: Using LLM URL for streaming: {url}")
    
    # 2. Construct Messages
    messages = [
        {"role": "system", "content": sys_prompt},
        {"role": "user", "content": f"STORY BIBLE CONTEXT:\n{bible_context}\n\nTASK:\nWrite a chapter based on this description: {description}"}
    ]
    
    async def sse_generator():
        import httpx
        try:
            async with httpx.AsyncClient() as client:
                async with client.stream("POST", url, json={
                    "model": "model-identifier",
                    "messages": messages,
                    "stream": True # Enable streaming
                }, timeout=120.0) as response:
                    
                    if response.status_code != 200:
                        yield f"data: {json.dumps({'error': f'LLM Error: {response.status_code}'})}\n\n"
                        return

                    async for line in response.aiter_lines():
                        if not line: continue
                        if line.startswith("data: "):
                            data_str = line[6:].strip()
                            if data_str == "[DONE]": break
                            try:
                                data = json.loads(data_str)
                                # OpenAI Streaming format: choices[0].delta.content
                                if "choices" in data and len(data["choices"]) > 0:
                                    delta = data["choices"][0].get("delta", {})
                                    if "content" in delta:
                                        yield f"data: {json.dumps({'content': delta['content']})}\n\n"
                            except Exception as e:
                                print(f"DEBUG: Parse Error in stream: {e} for line: {line}")
                                continue
        except Exception as e:
            print(f"ERROR in streaming generator: {str(e)}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(sse_generator(), media_type="text/event-stream")

# --- New Chapter Workflow Endpoints ---

from pydantic import BaseModel
from typing import Optional

class SmartContextRequest(BaseModel):
    story_id: int
    chapter_brief: str

@app.post("/ai/smart-context")
async def get_smart_context(payload: SmartContextRequest):
    story_id = payload.story_id
    brief = payload.chapter_brief
    
    # 1. Fetch Bible Elements and Story Settings
    from sqlmodel import select
    with models.Session(database.engine) as session:
        elements = session.exec(select(models.BibleElement).where(models.BibleElement.story_id == story_id, models.BibleElement.is_deleted == False)).all()
        chapters = session.exec(select(models.Chapter).where(models.Chapter.story_id == story_id, models.Chapter.is_deleted == False).order_by(models.Chapter.order)).all()
        
    bible_catalog = "\n".join([f"- {el.name} ({el.type})" for el in elements])
    
    # 2. Get Story So Far Summary (using last few chapters if available)
    if chapters:
        chapter_list = "\n".join([f"{c.order}. {c.title}" for c in chapters])
        last_chapter_content = chapters[-1].content
    else:
        chapter_list = "NONE (This is the first chapter)"
        last_chapter_content = "N/A"
    
    # 3. Construct Prompt
    llm_url = crud.get_global_setting("llm_url")
    # Helper to parse setting since it might be JSON string
    def parse_url(s): 
        if not s: return "http://localhost:1234/v1/chat/completions"
        try: 
            v = json.loads(s.value)
            return v if isinstance(v, str) else s.value
        except: return s.value
            
    url = parse_url(llm_url)
    
    system_prompt = """You are a story bible manager and continuity assistant. 
    Your job is to analyze a new chapter brief and the existing story context to:
    1. Write a "Story So Far" summary ensuring the new chapter fits the continuity.
       - IF there are no previous chapters, "story_so_far" MUST be exactly "Start of Story".
    2. Select relevant existing story bible elements that should be in the context.
    3. Suggest NEW story bible elements that should be created based on the brief.
    
    Return pure JSON with this structure:
    {
        "story_so_far": "High level summary of previous events...",
        "relevant_elements": ["Exact Name 1", "Exact Name 2"],
        "suggested_new_elements": [
            {"name": "New Character/Place", "type": "character|location|etc", "reason": "Why it is needed"}
        ]
    }"""
    
    user_prompt = f"""
    EXISTING BIBLE ELEMENTS:
    {bible_catalog}
    
    PREVIOUS CHAPTERS:
    {chapter_list}
    
    LAST CHAPTER CONTENT:
    {last_chapter_content}
    
    NEW CHAPTER BRIEF:
    {brief}
    """
    
    # Call LLM
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json={
                "model": "model-identifier",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.7,
                "stream": False 
            }, timeout=180.0)
            
            if resp.status_code != 200:
                raise HTTPException(status_code=500, detail=f"LLM Error: {resp.text}")
                
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            
            # extract JSON from content
            try:
                # Find first { and last }
                start = content.find('{')
                end = content.rfind('}') + 1
                if start != -1 and end != -1:
                    json_str = content[start:end]
                    return json.loads(json_str)
                else:
                    raise Exception("No JSON found")
            except Exception as e:
                # Fallback if specific schema fails
                return {
                    "story_so_far": "Could not generate summary.",
                    "relevant_elements": [],
                    "suggested_new_elements": [],
                    "raw_response": content
                }
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class GenerateOutlineRequest(BaseModel):
    story_id: int
    smart_context: dict
    chapter_brief: str
    current_outline: Optional[str] = None
    comments: Optional[str] = None

@app.post("/ai/generate-outline")
async def generate_outline(payload: GenerateOutlineRequest):
    from sqlmodel import select
    # Retrieve full content of relevant bible elements
    with models.Session(database.engine) as session:
        elements = session.exec(select(models.BibleElement).where(models.BibleElement.story_id == payload.story_id, models.BibleElement.is_deleted == False)).all()
        
    # Filter elements if relevant_elements is provided in smart_context
    relevant_names = payload.smart_context.get("relevant_elements", [])
    relevant_context = ""
    if relevant_names:
        lower_names = [n.lower() for n in relevant_names]
        filtered = [el for el in elements if el.name.lower() in lower_names]
        relevant_context = "\n".join([f"### {el.type.capitalize()}: {el.name}\n{el.content}" for el in filtered])
    else:
        relevant_context = "\n".join([f"### {el.type.capitalize()}: {el.name}\n{el.content}" for el in elements])

    story_so_far = payload.smart_context.get("story_so_far", "")
    
    system_prompt = "You are an expert story outliner. Create a structured outline for the chapter."
    
    if payload.current_outline:
         user_prompt = f"""
        STORY SO FAR:
        {story_so_far}
        
        BIBLE CONTEXT:
        {relevant_context}
        
        CHAPTER BRIEF:
        {payload.chapter_brief}
        
        CURRENT OUTLINE:
        {payload.current_outline}
        
        USER FEEDBACK/INSTRUCTIONS:
        {payload.comments}
        
        TASK:
        Refine the current outline based on the feedback. Maintain the structure but improve the content.
        """
    else:
        user_prompt = f"""
        STORY SO FAR:
        {story_so_far}
        
        BIBLE CONTEXT:
        {relevant_context}
        
        CHAPTER BRIEF:
        {payload.chapter_brief}
        
        TASK:
        Create a detailed step-by-step outline for this chapter. 
        Focus on pacing, key beats, and character moments.
        """

    # Call LLM
    llm_url = crud.get_global_setting("llm_url")
    def parse_url(s): 
        if not s: return "http://localhost:1234/v1/chat/completions"
        try: 
            v = json.loads(s.value)
            return v if isinstance(v, str) else s.value
        except: return s.value
    url = parse_url(llm_url)

    import httpx
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json={
            "model": "model-identifier",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "stream": False
        }, timeout=180.0)
        
        if resp.status_code != 200:
            raise HTTPException(status_code=500, detail=resp.text)
            
        data = resp.json()
        return {"outline": data["choices"][0]["message"]["content"]}

class WriteChapterRequest(BaseModel):
    story_id: int
    smart_context: dict
    outline: str
    current_content: Optional[str] = None
    comments: Optional[str] = None

@app.post("/ai/write-chapter-v2")
async def write_chapter_v2(payload: WriteChapterRequest):
    from fastapi.responses import StreamingResponse
    from sqlmodel import select
    
    with models.Session(database.engine) as session:
        elements = session.exec(select(models.BibleElement).where(models.BibleElement.story_id == payload.story_id, models.BibleElement.is_deleted == False)).all()
        
    relevant_names = payload.smart_context.get("relevant_elements", [])
    relevant_context = ""
    # Always include Story Settings
    settings = next((el for el in elements if el.type == "story_settings"), None)
    if settings:
        relevant_context += f"### Story Settings\n{settings.content}\n\n"
        
    if relevant_names:
        lower_names = [n.lower() for n in relevant_names]
        filtered = [el for el in elements if el.name.lower() in lower_names]
        relevant_context += "\n".join([f"### {el.type.capitalize()}: {el.name}\n{el.content}" for el in filtered])
    else:
        # If no relevant elements selected, maybe include all? No, that's too much context usually.
        # But for 'write-chapter' we want to support user choice.
        # If the user selected nothing, we might fallback to all OR nothing.
        # Let's assume if the list is empty, we send everything (as per original logic kinda).
        pass 
        # Actually, let's just stick to what was filtered. If nothing filtered, check if relevant_elements key was even present?
        # If it was empty list, then truly nothing relevant.

    story_so_far = payload.smart_context.get("story_so_far", "")
    
    system_prompt = "You are a creative writing assistant. Write the chapter prose based on the outline."
    
    if payload.current_content:
        user_prompt = f"""
        STORY SO FAR:
        {story_so_far}
        
        BIBLE CONTEXT:
        {relevant_context}
        
        OUTLINE:
        {payload.outline}
        
        CURRENT DRAFT:
        {payload.current_content}
        
        USER COMMENTS/FEEDBACK:
        {payload.comments}
        
        TASK:
        Rewrite the chapter (or sections of it) to address the user feedback while adhering to the outline.
        """
    else:
        user_prompt = f"""
        STORY SO FAR:
        {story_so_far}
        
        BIBLE CONTEXT:
        {relevant_context}
        
        OUTLINE:
        {payload.outline}
        
        TASK:
        Write the full chapter prose. match the tone and style of the story.
        """

    llm_url = crud.get_global_setting("llm_url")
    def parse_url(s): 
        if not s: return "http://localhost:1234/v1/chat/completions"
        try: 
            v = json.loads(s.value)
            return v if isinstance(v, str) else s.value
        except: return s.value
    url = parse_url(llm_url)
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    async def sse_generator():
        import httpx
        try:
            async with httpx.AsyncClient() as client:
                async with client.stream("POST", url, json={
                    "model": "model-identifier",
                    "messages": messages,
                    "stream": True
                }, timeout=180.0) as response:
                    
                    if response.status_code != 200:
                        yield f"data: {json.dumps({'error': f'LLM Error: {response.status_code}'})}\n\n"
                        return

                    async for line in response.aiter_lines():
                        if not line: continue
                        if line.startswith("data: "):
                            data_str = line[6:].strip()
                            if data_str == "[DONE]": break
                            try:
                                data = json.loads(data_str)
                                if "choices" in data and len(data["choices"]) > 0:
                                    delta = data["choices"][0].get("delta", {})
                                    if "content" in delta:
                                        yield f"data: {json.dumps({'content': delta['content']})}\n\n"
                            except: pass
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(sse_generator(), media_type="text/event-stream")

class AnalyzeBibleBriefRequest(BaseModel):
    story_id: int
    user_brief: str
    element_type: str

@app.post("/ai/analyze-bible-brief")
async def analyze_bible_brief(payload: AnalyzeBibleBriefRequest):
    from sqlmodel import select
    import json
    
    with models.Session(database.engine) as session:
        elements = session.exec(select(models.BibleElement).where(models.BibleElement.story_id == payload.story_id, models.BibleElement.is_deleted == False)).all()
        
    bible_catalog = "\n".join([f"- {el.name} ({el.type})" for el in elements])
    
    system_prompt = """You are a continuity editor for a story bible.
    Analyze the user's brief for a new story element and identify which EXISTING elements are most relevant to it (e.g. related characters, locations, factions).
    
    Return VALID JSON with double quotes around all keys and strings:
    {
        "relevant_elements": ["Name of Element 1", "Name of Element 2"],
        "reasoning": "Brief explanation of why these are relevant."
    }
    """
    
    user_prompt = f"""
    EXISTING ELEMENTS:
    {bible_catalog}
    
    USER BRIEF ({payload.element_type}):
    {payload.user_brief}
    
    TASK:
    Identify relevant existing elements that should be considered when fleshing out this new element.
    """
    
    llm_url = crud.get_global_setting("llm_url")
    def parse_url(s): 
        if not s: return "http://localhost:1234/v1/chat/completions"
        try: 
            v = json.loads(s.value)
            return v if isinstance(v, str) else s.value
        except: return s.value
    url = parse_url(llm_url)
    
    import httpx
    import re
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json={
                "model": "model-identifier",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.3,
                "stream": False 
            }, timeout=30.0)
            
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            
            # Helper to strip code fences
            def clean_markdown_json(text):
                pattern = r"```(?:json)?\s*([\s\S]*?)\s*```"
                match = re.search(pattern, text)
                if match:
                    return match.group(1)
                return text.strip()

            cleaned_content = clean_markdown_json(content)

            try:
                start = cleaned_content.find('{')
                end = cleaned_content.rfind('}') + 1
                if start != -1 and end != -1:
                    json_str = cleaned_content[start:end]
                    # strict=False allows control characters/newlines in strings
                    return json.loads(json_str, strict=False)
                else:
                    raise Exception("No JSON braces found")
            except Exception as e:
                print(f"Smart Context Parse Error: {e} | Content: {cleaned_content}")
                # Fallback: Regex extract relevant_elements
                # Look for "relevant_elements": ["Item 1", "Item 2"]
                # This is a basic regex, might not catch everything but better than nothing.
                relevant = []
                try:
                    # Match header "relevant_elements": [
                    # Then capture everything until ]
                    match = re.search(r'"relevant_elements"\s*:\s*\[([\s\S]*?)\]', cleaned_content)
                    if match:
                        list_content = match.group(1)
                        # Find all "String" or 'String' inside
                        items = re.findall(r'"([^"]+)"', list_content)
                        if not items:
                            items = re.findall(r"'([^']+)'", list_content)
                        relevant = items[:5] # Limit just in case
                except: pass
                
                return {
                    "relevant_elements": relevant, 
                    "reasoning": f"Could not fully parse AI response, but found {len(relevant)} elements. (Raw: {content[:100]}...)"
                }
                
    except Exception as e:
        # Fallback
        return {"relevant_elements": [], "reasoning": f"Error: {str(e)}"}

class ProposeBibleElementRequest(BaseModel):
    story_id: int
    user_brief: str
    element_type: str
    relevant_elements: Optional[list[str]] = None

@app.post("/ai/propose-bible-element")
async def propose_bible_element(payload: ProposeBibleElementRequest):
    from sqlmodel import select
    import re
    # 1. Fetch Context
    with models.Session(database.engine) as session:
        elements = session.exec(select(models.BibleElement).where(models.BibleElement.story_id == payload.story_id, models.BibleElement.is_deleted == False)).all()
        
    # Filter context if relevant_elements provided
    if payload.relevant_elements:
        lower_rels = [r.lower() for r in payload.relevant_elements]
        # Include Story Settings always if exists
        filtered_elements = [el for el in elements if el.name.lower() in lower_rels or el.type == 'story_settings']
        # Also maybe include few others randomly or generic? No, strict is better for 'smart' context.
        # But if list is empty, maybe fallback to all?
        if not filtered_elements:
             filtered_elements = elements
    else:
        filtered_elements = elements

    # Create a concise catalog of existing elements to avoid duplicates
    # For the proposal, we might want MORE than just name/type for the relevant ones.
    # Let's give name, type, and short excerpt of content? 
    # For now, let's stick to the catalog format but maybe add description?
    # The original prompt used name and type. Let's try to add the 'content' description if available for relevant ones.
    
    catalog_lines = []
    for el in filtered_elements:
        desc = ""
        try:
            c = json.loads(el.content) if isinstance(el.content, str) else el.content
            if isinstance(c, dict) and "description" in c:
                desc = f": {str(c['description'])[:100]}..."
        except: pass
        catalog_lines.append(f"- {el.name} ({el.type}){desc}")

    bible_catalog = "\n".join(catalog_lines)
    
    # 2. Construct Prompt
    system_prompt = """You are a creative writing assistant specializing in world-building. 
    Your task is to take a concise description of exactly one story element (Character, Location, etc.) and generate a detailed, structured profile for it.
    
    Return VALID JSON with this structure:
    {
        "name": "Creative Name",
        "type": "character|location|arc|timeline", 
        "content": {
            "description": "Rich detailed description. MUST be a single string. Newlines should be escaped as \\n.",
        }
    }
    
    CRITICAL Rules
    1. Return EXACTLY ONE story bible element.
    1. Output MUST be valid JSON.
    2. Use double quotes for all keys and strings.
    3. Escape all newlines and special characters in strings.
    4. Do not include comments in the JSON.
    """
    
    user_prompt = f"""
    EXISTING ELEMENTS:
    {bible_catalog}
    
    USER REQUEST ({payload.element_type}):
    {payload.user_brief}
    
    TASK:
    Create a robust profile for this new element. Make it fit the existing world. Keep it below 250 words.
    """
    
    # 3. Call LLM
    llm_url = crud.get_global_setting("llm_url")
    def parse_url(s): 
        if not s: return "http://localhost:1234/v1/chat/completions"
        try: 
            v = json.loads(s.value)
            return v if isinstance(v, str) else s.value
        except: return s.value
    url = parse_url(llm_url)
    
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json={
                "model": "model-identifier",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.7,
                "stream": False 
            }, timeout=60.0)
            
            if resp.status_code != 200:
                raise HTTPException(status_code=500, detail=f"LLM Error: {resp.text}")
                
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            
            # Helper to strip code fences
            def clean_markdown_json(text):
                pattern = r"```(?:json)?\s*([\s\S]*?)\s*```"
                match = re.search(pattern, text)
                if match:
                    return match.group(1)
                return text.strip()

            cleaned_content = clean_markdown_json(content)
            
            # extract JSON
            try:
                # Find first { and last }
                start = cleaned_content.find('{')
                end = cleaned_content.rfind('}') + 1
                if start != -1 and end != -1:
                    json_str = cleaned_content[start:end]
                    # strict=False allows control characters (newlines) in strings
                    data_obj = json.loads(json_str, strict=False)
                    
                    # Post-processing: Flatten description if it's an object/dict
                    def flatten_to_markdown(val, depth=0):
                        if isinstance(val, dict):
                            lines = []
                            for k, v in val.items():
                                prefix = "#" * (depth + 3) # start at h3
                                lines.append(f"{prefix} {k}")
                                lines.append(flatten_to_markdown(v, depth + 1))
                            return "\n\n".join(lines)
                        elif isinstance(val, list):
                            return "\n".join([f"- {flatten_to_markdown(item, depth)}" for item in val])
                        else:
                            return str(val)

                    if "content" in data_obj and "description" in data_obj["content"]:
                        desc = data_obj["content"]["description"]
                        if isinstance(desc, (dict, list)):
                            data_obj["content"]["description"] = flatten_to_markdown(desc)
                    
                    return data_obj
                else:
                    raise Exception("No JSON braces found")
            except Exception as e:
                print(f"JSON Parse Error: {e}")
                # Fallback: Try regex to at least get the Name if parsable
                fallback_name = "New Element"
                try:
                    name_match = re.search(r'"name":\s*"([^"]+)"', cleaned_content)
                    if name_match:
                        fallback_name = name_match.group(1)
                except: pass

                return {
                    "name": fallback_name,
                    "type": payload.element_type,
                    "content": { "description": cleaned_content }
                }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
