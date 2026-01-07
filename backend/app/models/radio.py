from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime
from ..database import Base

class RadioStation(Base):
    __tablename__ = "radio_stations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    url = Column(String, nullable=False)
    genre = Column(String, nullable=True)
    country = Column(String, nullable=True)
    logo_url = Column(String, nullable=True)
    is_favorite = Column(Boolean, default=False)
    is_custom = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
