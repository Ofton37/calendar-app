from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from pydantic import BaseModel
import models
import schemas
import database

# データベースのテーブルを作成
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

# 静的ファイル（HTML/CSS/JS）の配信設定
app.mount("/static", StaticFiles(directory="static"), name="static")

# 月別の予定取得 (GET)
@app.get("/events", response_model=list[schemas.EventResponse])
def get_events(year: int, month: int, db: Session = Depends(database.get_db)):
    start_date = f"{year:04d}-{month:02d}-01"
    if month == 12:
        end_date = f"{year + 1:04d}-01-01"
    else:
        end_date = f"{year:04d}-{month + 1:02d}-01"
        
    events = db.query(models.Event).filter(
        models.Event.start_at >= start_date,
        models.Event.start_at < end_date
    ).all()
    return events

# 新規予定作成 (POST)
@app.post("/events", response_model=schemas.EventResponse)
def create_event(event: schemas.EventCreate, db: Session = Depends(database.get_db)):
    db_event = models.Event(**event.dict())
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

# 繰り返し予定用のリクエストスキーマ
class RecurringEventCreate(BaseModel):
    title: str
    description: str = ""
    start_time: str = "10:00:00"
    end_time: str = "11:00:00"
    category: str = ""
    target_weekday: int  # 0:月, 1:火, 2:水, 3:木, 4:金, 5:土, 6:日
    weeks_count: int = 4  # 何週間分繰り返すか

# 繰り返し予定の一括作成 (POST)
@app.post("/events/recurring")
def create_recurring_events(data: RecurringEventCreate, db: Session = Depends(database.get_db)):
    today = datetime.now().date()
    days_ahead = (data.target_weekday - today.weekday()) % 7
    first_occurrence = today + timedelta(days=days_ahead)

    created_events = []
    for i in range(data.weeks_count):
        target_date = first_occurrence + timedelta(weeks=i)
        start_at_dt = f"{target_date}T{data.start_time}"
        end_at_dt = f"{target_date}T{data.end_time}"

        db_event = models.Event(
            title=data.title,
            description=data.description,
            start_at=start_at_dt,
            end_at=end_at_dt,
            category=data.category
        )
        db.add(db_event)
        created_events.append(db_event)

    db.commit()
    return {"message": f"{len(created_events)}件の予定を作成しました", "count": len(created_events)}

# 予定の更新 (PUT)
@app.put("/events/{event_id}", response_model=schemas.EventResponse)
def update_event(event_id: int, event_update: schemas.EventCreate, db: Session = Depends(database.get_db)):
    db_event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    db_event.title = event_update.title
    db_event.description = event_update.description
    db_event.start_at = event_update.start_at
    db_event.end_at = event_update.end_at
    db_event.category = event_update.category
    
    db.commit()
    db.refresh(db_event)
    return db_event

# 予定の削除 (DELETE)
@app.delete("/events/{event_id}")
def delete_event(event_id: int, db: Session = Depends(database.get_db)):
    db_event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    db.delete(db_event)
    db.commit()
    return {"message": "Event deleted successfully"}