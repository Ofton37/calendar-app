from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

import models
import schemas
from database import engine, get_db

# テーブルの自動作成
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# フロントエンドからのCORS許可（開発用）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/events", response_model=schemas.EventResponse)
def create_event(event: schemas.EventCreate, db: Session = Depends(get_db)):
    db_event = models.Event(**event.model_dump())
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

@app.get("/events", response_model=List[schemas.EventResponse])
def get_events(
    year: int = Query(..., description="年 (例: 2026)"),
    month: int = Query(..., description="月 (例: 11)"),
    db: Session = Depends(get_db)
):
    # 指定された年月の開始日と終了日を計算
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)

    # 該当月に含まれる予定を抽出
    events = db.query(models.Event).filter(
        models.Event.start_at >= start_date,
        models.Event.start_at < end_date
    ).all()
    
    return events

@app.delete("/events/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db)):
    db_event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    db.delete(db_event)
    db.commit()
    return {"message": "Deleted successfully"}