from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
import httpx
from ...database import get_db
from ...models.radio import RadioStation

router = APIRouter(prefix="/radio", tags=["radio"])

RADIO_BROWSER_API = "https://de1.api.radio-browser.info/json"

class RadioStationCreate(BaseModel):
    name: str
    url: str
    genre: Optional[str] = None
    country: Optional[str] = None
    logo_url: Optional[str] = None

class RadioStationResponse(BaseModel):
    id: int
    name: str
    url: str
    genre: Optional[str]
    country: Optional[str]
    logo_url: Optional[str]
    is_favorite: bool
    is_custom: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

PRESET_STATIONS = [
    {"name": "Lofi Hip Hop Radio", "url": "https://streams.ilovemusic.de/iloveradio17.mp3", "genre": "Lo-Fi", "country": "Germany"},
    {"name": "Chillhop Radio", "url": "https://streams.fluxfm.de/Chillhop/mp3-320/streams.fluxfm.de/", "genre": "Chillhop", "country": "Germany"},
    {"name": "Jazz FM", "url": "https://edge-audio-03-gos2.sharp-stream.com/jazzfm.mp3", "genre": "Jazz", "country": "UK"},
    {"name": "Classical KING FM", "url": "https://classicalking.streamguys1.com/king-fm-aac-128k", "genre": "Classical", "country": "USA"},
    {"name": "SomaFM - Groove Salad", "url": "https://ice1.somafm.com/groovesalad-256-mp3", "genre": "Ambient", "country": "USA"},
    {"name": "SomaFM - Drone Zone", "url": "https://ice1.somafm.com/dronezone-256-mp3", "genre": "Ambient", "country": "USA"},
    {"name": "SomaFM - DEF CON Radio", "url": "https://ice1.somafm.com/defcon-256-mp3", "genre": "Electronic", "country": "USA"},
    {"name": "Radio Paradise", "url": "https://stream.radioparadise.com/aac-320", "genre": "Eclectic", "country": "USA"},
    {"name": "NTS Radio", "url": "https://stream-relay-geo.ntslive.net/stream", "genre": "Alternative", "country": "UK"},
    {"name": "KEXP", "url": "https://kexp-mp3-128.streamguys1.com/kexp128.mp3", "genre": "Indie", "country": "USA"},
]

@router.get("", response_model=List[RadioStationResponse])
async def list_radio_stations(db: Session = Depends(get_db)):
    stations = db.query(RadioStation).order_by(RadioStation.is_favorite.desc(), RadioStation.name).all()
    return stations

@router.post("/init")
async def init_preset_stations(db: Session = Depends(get_db)):
    existing_count = db.query(RadioStation).count()
    if existing_count > 0:
        return {"message": "Stations already initialized", "count": existing_count}
    
    for station_data in PRESET_STATIONS:
        station = RadioStation(**station_data, is_custom=False)
        db.add(station)
    
    db.commit()
    return {"message": "Preset stations initialized", "count": len(PRESET_STATIONS)}

@router.post("", response_model=RadioStationResponse)
async def create_radio_station(
    station_data: RadioStationCreate,
    db: Session = Depends(get_db)
):
    station = RadioStation(
        name=station_data.name,
        url=station_data.url,
        genre=station_data.genre,
        country=station_data.country,
        logo_url=station_data.logo_url,
        is_custom=True
    )
    db.add(station)
    db.commit()
    db.refresh(station)
    return station

@router.delete("/{station_id}")
async def delete_radio_station(station_id: int, db: Session = Depends(get_db)):
    station = db.query(RadioStation).filter(RadioStation.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    
    if not station.is_custom:
        raise HTTPException(status_code=400, detail="Cannot delete preset stations")
    
    db.delete(station)
    db.commit()
    return {"message": "Station deleted"}

@router.post("/{station_id}/favorite")
async def toggle_favorite(station_id: int, db: Session = Depends(get_db)):
    station = db.query(RadioStation).filter(RadioStation.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    
    station.is_favorite = not station.is_favorite
    db.commit()
    
    return {"is_favorite": station.is_favorite}

@router.get("/browse/countries")
async def get_countries():
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{RADIO_BROWSER_API}/countries", params={"order": "stationcount", "reverse": "true"})
            response.raise_for_status()
            data = response.json()
            return [{"name": c["name"], "station_count": c["stationcount"]} for c in data if c["stationcount"] > 100][:50]
    except Exception as e:
        return []

@router.get("/browse/genres")
async def get_genres():
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{RADIO_BROWSER_API}/tags", params={"order": "stationcount", "reverse": "true", "limit": 100})
            response.raise_for_status()
            data = response.json()
            return [{"name": t["name"], "station_count": t["stationcount"]} for t in data if t["stationcount"] > 50][:40]
    except Exception as e:
        return []

@router.get("/browse/top")
async def get_top_stations(limit: int = Query(50, ge=1, le=100)):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{RADIO_BROWSER_API}/stations/topvote", params={"limit": limit, "hidebroken": "true"})
            response.raise_for_status()
            return _format_stations(response.json())
    except Exception as e:
        return []

@router.get("/browse/search")
async def search_stations(
    name: Optional[str] = None,
    country: Optional[str] = None,
    tag: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100)
):
    params = {"limit": limit, "hidebroken": "true", "order": "votes", "reverse": "true"}
    if name:
        params["name"] = name
    if country:
        params["country"] = country
    if tag:
        params["tag"] = tag
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{RADIO_BROWSER_API}/stations/search", params=params)
            response.raise_for_status()
            return _format_stations(response.json())
    except Exception as e:
        return []

@router.post("/browse/{station_uuid}/click")
async def register_click(station_uuid: str):
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(f"{RADIO_BROWSER_API}/url/{station_uuid}")
        return {"success": True}
    except:
        return {"success": False}

def _format_stations(stations: list) -> list:
    return [{
        "stationuuid": s.get("stationuuid"),
        "name": s.get("name"),
        "url": s.get("url_resolved") or s.get("url"),
        "favicon": s.get("favicon"),
        "country": s.get("country"),
        "tags": s.get("tags", "").split(",")[:3] if s.get("tags") else [],
        "votes": s.get("votes", 0),
        "codec": s.get("codec"),
        "bitrate": s.get("bitrate", 0)
    } for s in stations if s.get("url_resolved") or s.get("url")]
