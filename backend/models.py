from datetime import datetime
from typing import List, Optional
from sqlmodel import Field, Relationship, SQLModel, create_engine, Session, select

class GlobalSetting(SQLModel, table=True):
    key: str = Field(primary_key=True)
    value: str  # JSON string

class Story(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_deleted: bool = Field(default=False)
    
    bible_elements: List["BibleElement"] = Relationship(back_populates="story")
    chapters: List["Chapter"] = Relationship(back_populates="story")

class BibleElement(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    story_id: int = Field(foreign_key="story.id")
    type: str  # character, location, arc, timeline_event
    name: str
    content: str
    version: int = Field(default=1)
    is_deleted: bool = Field(default=False)
    
    story: Story = Relationship(back_populates="bible_elements")
    history: List["VersionHistory"] = Relationship(back_populates="bible_element")

class Chapter(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    story_id: int = Field(foreign_key="story.id")
    order: int
    title: str
    content: str
    version: int = Field(default=1)
    is_deleted: bool = Field(default=False)
    
    story: Story = Relationship(back_populates="chapters")
    history: List["VersionHistory"] = Relationship(back_populates="chapter")

class VersionHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    bible_element_id: Optional[int] = Field(default=None, foreign_key="bibleelement.id")
    chapter_id: Optional[int] = Field(default=None, foreign_key="chapter.id")
    version: int
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    bible_element: Optional[BibleElement] = Relationship(back_populates="history")
    chapter: Optional[Chapter] = Relationship(back_populates="history")
