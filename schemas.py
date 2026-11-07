from datetime import datetime
from pydantic import BaseModel
from typing import Optional

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_at: datetime
    end_at: datetime
    category: Optional[str] = None

class EventResponse(EventCreate):
    id: int

    class Config:
      from_attributes = True