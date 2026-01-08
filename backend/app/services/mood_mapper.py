from typing import Optional, List, Dict

MOOD_MAP: Dict[str, List[str]] = {
    "Chill": ["jazz", "ambient", "lofi", "lo-fi", "soul", "r&b", "rnb", "acoustic", "bossa", "downtempo", "chillout", "easy listening", "new age", "smooth jazz"],
    "Energetic": ["rock", "metal", "punk", "edm", "drum and bass", "dnb", "hard rock", "alternative rock", "grunge", "hardcore", "thrash", "power metal", "techno", "trance", "hardstyle"],
    "Melancholic": ["blues", "indie", "folk", "classical", "sad", "ballad", "acoustic", "singer-songwriter", "slowcore", "shoegaze", "post-rock", "darkwave"],
    "Happy": ["pop", "disco", "funk", "reggae", "ska", "dance", "house", "tropical", "latin", "salsa", "samba", "k-pop", "j-pop", "bubblegum"],
    "Intense": ["metal", "hardcore", "industrial", "dubstep", "death metal", "black metal", "grindcore", "noise", "screamo", "deathcore", "metalcore"],
    "Romantic": ["r&b", "rnb", "soul", "ballad", "love", "slow jam", "quiet storm", "adult contemporary", "soft rock", "crooner"],
    "Focus": ["classical", "ambient", "instrumental", "piano", "soundtrack", "score", "minimalist", "meditation", "study", "concentration"],
    "Party": ["dance", "edm", "house", "techno", "hip hop", "hip-hop", "rap", "club", "electro", "disco", "pop"],
}

ACTIVITY_MAP: Dict[str, Dict] = {
    "Workout": {
        "moods": ["Energetic", "Intense"],
        "genres": ["rock", "metal", "edm", "hip hop", "hip-hop", "drum and bass", "dubstep", "hardcore", "techno"],
    },
    "Studying": {
        "moods": ["Focus", "Chill"],
        "genres": ["classical", "ambient", "instrumental", "piano", "lo-fi", "lofi", "soundtrack", "jazz"],
    },
    "Sleep": {
        "moods": ["Chill", "Melancholic"],
        "genres": ["ambient", "classical", "acoustic", "piano", "meditation", "new age", "nature"],
    },
    "Driving": {
        "moods": ["Happy", "Energetic"],
        "genres": ["rock", "pop", "indie", "alternative", "electronic", "synthwave", "80s", "classic rock"],
    },
}


def get_mood_from_genre(genre: Optional[str]) -> Optional[str]:
    if not genre:
        return None
    
    genre_lower = genre.lower()
    
    for mood, genres in MOOD_MAP.items():
        for g in genres:
            if g in genre_lower:
                return mood
    
    return None


def get_decade_from_year(year: Optional[int]) -> Optional[str]:
    if not year or year < 1900 or year > 2100:
        return None
    
    decade_start = (year // 10) * 10
    return f"{decade_start}s"


def get_all_moods() -> List[str]:
    return list(MOOD_MAP.keys())


def get_all_activities() -> List[str]:
    return list(ACTIVITY_MAP.keys())


def get_activity_config(activity: str) -> Optional[Dict]:
    return ACTIVITY_MAP.get(activity)


def matches_activity(genre: Optional[str], mood: Optional[str], activity: str) -> bool:
    config = ACTIVITY_MAP.get(activity)
    if not config:
        return False
    
    if mood and mood in config.get("moods", []):
        return True
    
    if genre:
        genre_lower = genre.lower()
        for g in config.get("genres", []):
            if g in genre_lower:
                return True
    
    return False
