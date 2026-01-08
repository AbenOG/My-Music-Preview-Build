import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Radio as RadioIcon, Plus, Heart, Trash2, Globe, Search, TrendingUp, Music, MapPin } from 'lucide-react';
import { radioApi, type RadioStation, type RadioStationCreate, type BrowseStation, type BrowseCountry, type BrowseGenre } from '../api/radio';
import { usePlayerStore } from '../stores/playerStore';
import { Modal } from '../components/ui/Modal';
import { cn } from '../lib/utils';

type TabType = 'my-stations' | 'browse' | 'search';

export function Radio() {
    const [stations, setStations] = useState<RadioStation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('my-stations');

    // Browse state
    const [topStations, setTopStations] = useState<BrowseStation[]>([]);
    const [browseCountries, setBrowseCountries] = useState<BrowseCountry[]>([]);
    const [browseGenres, setBrowseGenres] = useState<BrowseGenre[]>([]);
    const [selectedCountry, setSelectedCountry] = useState<string>('');
    const [selectedGenre, setSelectedGenre] = useState<string>('');
    const [countryStations, setCountryStations] = useState<BrowseStation[]>([]);
    const [genreStations, setGenreStations] = useState<BrowseStation[]>([]);
    const [browseLoading, setBrowseLoading] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<BrowseStation[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);

    // Player store for unified playback
    const { playRadio, stopRadio, currentRadioStation, isPlaying } = usePlayerStore();

    useEffect(() => {
        loadStations();
    }, []);

    // Load browse data when switching to browse tab
    useEffect(() => {
        if (activeTab === 'browse' && topStations.length === 0) {
            loadBrowseData();
        }
    }, [activeTab]);

    // Debounced search
    useEffect(() => {
        if (activeTab !== 'search') return;
        if (searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }

        setSearchLoading(true);
        const timer = setTimeout(async () => {
            try {
                const results = await radioApi.searchStations({ name: searchQuery, limit: 50 });
                setSearchResults(results);
            } catch (error) {
                console.error('Search failed:', error);
            } finally {
                setSearchLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, activeTab]);

    // Load stations by country when selected
    useEffect(() => {
        if (!selectedCountry) {
            setCountryStations([]);
            return;
        }
        loadStationsByCountry(selectedCountry);
    }, [selectedCountry]);

    // Load stations by genre when selected
    useEffect(() => {
        if (!selectedGenre) {
            setGenreStations([]);
            return;
        }
        loadStationsByGenre(selectedGenre);
    }, [selectedGenre]);

    const loadStations = async () => {
        try {
            await radioApi.init();
            const data = await radioApi.list();
            setStations(data);
        } catch (error) {
            console.error('Failed to load stations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadBrowseData = async () => {
        setBrowseLoading(true);
        try {
            const [top, countries, genres] = await Promise.all([
                radioApi.getTopStations(20),
                radioApi.getCountries(),
                radioApi.getGenres()
            ]);
            setTopStations(top);
            setBrowseCountries(countries);
            setBrowseGenres(genres);
        } catch (error) {
            console.error('Failed to load browse data:', error);
        } finally {
            setBrowseLoading(false);
        }
    };

    const loadStationsByCountry = async (country: string) => {
        try {
            const results = await radioApi.searchStations({ country, limit: 30 });
            setCountryStations(results);
        } catch (error) {
            console.error('Failed to load country stations:', error);
        }
    };

    const loadStationsByGenre = async (genre: string) => {
        try {
            const results = await radioApi.searchStations({ tag: genre, limit: 30 });
            setGenreStations(results);
        } catch (error) {
            console.error('Failed to load genre stations:', error);
        }
    };

    const handlePlayStation = (station: RadioStation | BrowseStation) => {
        // Check if this is the currently playing station
        const stationId = 'id' in station ? station.id : undefined;
        const stationUuid = 'stationuuid' in station ? station.stationuuid : undefined;

        const isCurrentStation = currentRadioStation && (
            (stationId && currentRadioStation.id === stationId) ||
            (stationUuid && currentRadioStation.stationuuid === stationUuid)
        );

        if (isCurrentStation && isPlaying) {
            stopRadio();
        } else {
            // Convert to unified format for playerStore
            const radioStation = {
                id: stationId,
                stationuuid: stationUuid,
                name: station.name,
                url: station.url,
                favicon: 'favicon' in station ? station.favicon : undefined,
                genre: 'tags' in station ? station.tags?.[0] : station.genre || undefined,
                country: station.country || undefined,
                logo_url: 'logo_url' in station ? (station.logo_url ?? undefined) : undefined,
            };

            playRadio(radioStation);

            // Register click for Radio Browser stations
            if (stationUuid) {
                radioApi.registerClick(stationUuid).catch(console.error);
            }
        }
    };

    const isStationPlaying = (station: RadioStation | BrowseStation): boolean => {
        if (!currentRadioStation || !isPlaying) return false;

        const stationId = 'id' in station ? station.id : undefined;
        const stationUuid = 'stationuuid' in station ? station.stationuuid : undefined;

        return Boolean(
            (stationId && currentRadioStation.id === stationId) ||
            (stationUuid && currentRadioStation.stationuuid === stationUuid)
        );
    };

    const toggleFavorite = async (station: RadioStation, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const result = await radioApi.toggleFavorite(station.id);
            setStations(prev =>
                prev.map(s => s.id === station.id ? { ...s, is_favorite: result.is_favorite } : s)
            );
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
        }
    };

    const deleteStation = async (station: RadioStation, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!station.is_custom) return;

        try {
            await radioApi.delete(station.id);
            setStations(prev => prev.filter(s => s.id !== station.id));
            if (currentRadioStation?.id === station.id) {
                stopRadio();
            }
        } catch (error) {
            console.error('Failed to delete station:', error);
        }
    };

    const handleAddStation = async (data: RadioStationCreate) => {
        try {
            const newStation = await radioApi.create(data);
            setStations(prev => [...prev, newStation]);
            setIsAddModalOpen(false);
        } catch (error) {
            console.error('Failed to add station:', error);
        }
    };

    const favoriteStations = stations.filter(s => s.is_favorite);
    const regularStations = stations.filter(s => !s.is_favorite);

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-white mb-2">Radio</h1>
                    <p className="text-white/50">Listen to internet radio stations</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-full transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Station
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2">
                <TabButton
                    active={activeTab === 'my-stations'}
                    onClick={() => setActiveTab('my-stations')}
                    icon={<Heart className="w-4 h-4" />}
                >
                    My Stations
                </TabButton>
                <TabButton
                    active={activeTab === 'browse'}
                    onClick={() => setActiveTab('browse')}
                    icon={<Globe className="w-4 h-4" />}
                >
                    Browse
                </TabButton>
                <TabButton
                    active={activeTab === 'search'}
                    onClick={() => setActiveTab('search')}
                    icon={<Search className="w-4 h-4" />}
                >
                    Search
                </TabButton>
            </div>

            {/* Tab Content */}
            {activeTab === 'my-stations' && (
                <MyStationsTab
                    favoriteStations={favoriteStations}
                    regularStations={regularStations}
                    isLoading={isLoading}
                    onPlay={handlePlayStation}
                    onFavorite={toggleFavorite}
                    onDelete={deleteStation}
                    isStationPlaying={isStationPlaying}
                />
            )}

            {activeTab === 'browse' && (
                <BrowseTab
                    topStations={topStations}
                    countries={browseCountries}
                    genres={browseGenres}
                    selectedCountry={selectedCountry}
                    selectedGenre={selectedGenre}
                    countryStations={countryStations}
                    genreStations={genreStations}
                    isLoading={browseLoading}
                    onSelectCountry={setSelectedCountry}
                    onSelectGenre={setSelectedGenre}
                    onPlay={handlePlayStation}
                    isStationPlaying={isStationPlaying}
                />
            )}

            {activeTab === 'search' && (
                <SearchTab
                    query={searchQuery}
                    onQueryChange={setSearchQuery}
                    results={searchResults}
                    isLoading={searchLoading}
                    onPlay={handlePlayStation}
                    isStationPlaying={isStationPlaying}
                />
            )}

            <AddStationModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={handleAddStation}
            />
        </div>
    );
}

function TabButton({ active, onClick, icon, children }: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all",
                active
                    ? "bg-pink-500 text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
            )}
        >
            {icon}
            {children}
        </button>
    );
}

function MyStationsTab({
    favoriteStations,
    regularStations,
    isLoading,
    onPlay,
    onFavorite,
    onDelete,
    isStationPlaying
}: {
    favoriteStations: RadioStation[];
    regularStations: RadioStation[];
    isLoading: boolean;
    onPlay: (station: RadioStation) => void;
    onFavorite: (station: RadioStation, e: React.MouseEvent) => void;
    onDelete: (station: RadioStation, e: React.MouseEvent) => void;
    isStationPlaying: (station: RadioStation) => boolean;
}) {
    return (
        <div className="space-y-8">
            {favoriteStations.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <Heart className="w-5 h-5 text-pink-500 fill-current" />
                        Favorites
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {favoriteStations.map((station, i) => (
                            <LocalStationCard
                                key={station.id}
                                station={station}
                                isPlaying={isStationPlaying(station)}
                                onClick={() => onPlay(station)}
                                onFavorite={(e) => onFavorite(station, e)}
                                onDelete={(e) => onDelete(station, e)}
                                delay={i * 0.05}
                            />
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-white/60" />
                    All Stations
                </h2>
                {isLoading ? (
                    <div className="text-center py-12 text-white/50">Loading stations...</div>
                ) : regularStations.length === 0 && favoriteStations.length === 0 ? (
                    <div className="text-center py-12">
                        <RadioIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
                        <p className="text-white/50">No radio stations yet</p>
                        <p className="text-white/30 text-sm mt-2">Add your own or browse stations</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {regularStations.map((station, i) => (
                            <LocalStationCard
                                key={station.id}
                                station={station}
                                isPlaying={isStationPlaying(station)}
                                onClick={() => onPlay(station)}
                                onFavorite={(e) => onFavorite(station, e)}
                                onDelete={(e) => onDelete(station, e)}
                                delay={i * 0.03}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function BrowseTab({
    topStations,
    countries,
    genres,
    selectedCountry,
    selectedGenre,
    countryStations,
    genreStations,
    isLoading,
    onSelectCountry,
    onSelectGenre,
    onPlay,
    isStationPlaying
}: {
    topStations: BrowseStation[];
    countries: BrowseCountry[];
    genres: BrowseGenre[];
    selectedCountry: string;
    selectedGenre: string;
    countryStations: BrowseStation[];
    genreStations: BrowseStation[];
    isLoading: boolean;
    onSelectCountry: (country: string) => void;
    onSelectGenre: (genre: string) => void;
    onPlay: (station: BrowseStation) => void;
    isStationPlaying: (station: BrowseStation) => boolean;
}) {
    if (isLoading) {
        return <div className="text-center py-12 text-white/50">Loading stations...</div>;
    }

    return (
        <div className="space-y-8">
            {/* Top Stations */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-pink-500" />
                    Top Stations
                </h2>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10">
                    {topStations.map((station, i) => (
                        <BrowseStationCard
                            key={station.stationuuid}
                            station={station}
                            isPlaying={isStationPlaying(station)}
                            onClick={() => onPlay(station)}
                            delay={i * 0.03}
                            compact
                        />
                    ))}
                </div>
            </section>

            {/* By Country */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-400" />
                    By Country
                </h2>
                <select
                    value={selectedCountry}
                    onChange={(e) => onSelectCountry(e.target.value)}
                    className="px-4 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white focus:outline-none focus:border-pink-500/50 cursor-pointer"
                    style={{ colorScheme: 'dark' }}
                >
                    <option value="" className="bg-zinc-900 text-white">Select a country...</option>
                    {countries.map(c => (
                        <option key={c.name} value={c.name} className="bg-zinc-900 text-white">
                            {c.name} ({c.station_count.toLocaleString()} stations)
                        </option>
                    ))}
                </select>
                {countryStations.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {countryStations.map((station, i) => (
                            <BrowseStationCard
                                key={station.stationuuid}
                                station={station}
                                isPlaying={isStationPlaying(station)}
                                onClick={() => onPlay(station)}
                                delay={i * 0.03}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* By Genre */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Music className="w-5 h-5 text-purple-400" />
                    By Genre
                </h2>
                <div className="flex flex-wrap gap-2">
                    {genres.slice(0, 20).map(g => (
                        <button
                            key={g.name}
                            onClick={() => onSelectGenre(selectedGenre === g.name ? '' : g.name)}
                            className={cn(
                                "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                                selectedGenre === g.name
                                    ? "bg-pink-500 text-white"
                                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                            )}
                        >
                            {g.name}
                        </button>
                    ))}
                </div>
                {genreStations.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {genreStations.map((station, i) => (
                            <BrowseStationCard
                                key={station.stationuuid}
                                station={station}
                                isPlaying={isStationPlaying(station)}
                                onClick={() => onPlay(station)}
                                delay={i * 0.03}
                            />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

function SearchTab({
    query,
    onQueryChange,
    results,
    isLoading,
    onPlay,
    isStationPlaying
}: {
    query: string;
    onQueryChange: (q: string) => void;
    results: BrowseStation[];
    isLoading: boolean;
    onPlay: (station: BrowseStation) => void;
    isStationPlaying: (station: BrowseStation) => boolean;
}) {
    return (
        <div className="space-y-6">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                    type="text"
                    placeholder="Search radio stations..."
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    autoFocus
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-pink-500/50"
                />
            </div>

            {isLoading ? (
                <div className="text-center py-12 text-white/50">Searching...</div>
            ) : query.length < 2 ? (
                <div className="text-center py-12">
                    <Search className="w-16 h-16 text-white/20 mx-auto mb-4" />
                    <p className="text-white/50">Search thousands of radio stations</p>
                    <p className="text-white/30 text-sm mt-2">Enter at least 2 characters to search</p>
                </div>
            ) : results.length === 0 ? (
                <div className="text-center py-12">
                    <RadioIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
                    <p className="text-white/50">No stations found for "{query}"</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {results.map((station, i) => (
                        <BrowseStationCard
                            key={station.stationuuid}
                            station={station}
                            isPlaying={isStationPlaying(station)}
                            onClick={() => onPlay(station)}
                            delay={i * 0.02}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function LocalStationCard({
    station,
    isPlaying,
    onClick,
    onFavorite,
    onDelete,
    delay
}: {
    station: RadioStation;
    isPlaying: boolean;
    onClick: () => void;
    onFavorite: (e: React.MouseEvent) => void;
    onDelete: (e: React.MouseEvent) => void;
    delay: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            onClick={onClick}
            className={cn(
                "group relative p-4 rounded-xl cursor-pointer transition-all duration-200",
                isPlaying
                    ? "bg-pink-500/20 border border-pink-500/30"
                    : "bg-white/5 hover:bg-white/10 border border-transparent"
            )}
        >
            <div className="flex items-start gap-4">
                <div className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0",
                    isPlaying ? "bg-pink-500/30" : "bg-white/10"
                )}>
                    {station.logo_url ? (
                        <img src={station.logo_url} alt="" className="w-full h-full rounded-lg object-cover" />
                    ) : (
                        <RadioIcon className={cn("w-6 h-6", isPlaying ? "text-pink-500" : "text-white/40")} />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className={cn("font-medium truncate", isPlaying ? "text-pink-500" : "text-white")}>
                        {station.name}
                    </h3>
                    <p className="text-white/40 text-sm truncate">
                        {station.genre || 'Radio'} {station.country && `• ${station.country}`}
                    </p>
                </div>
            </div>

            {isPlaying && (
                <div className="absolute top-4 right-4">
                    <div className="flex items-end gap-0.5 h-4">
                        <span className="w-0.5 bg-pink-500 rounded-full animate-equalizer-1" />
                        <span className="w-0.5 bg-pink-500 rounded-full animate-equalizer-2" />
                        <span className="w-0.5 bg-pink-500 rounded-full animate-equalizer-3" />
                    </div>
                </div>
            )}

            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={onFavorite}
                    className={cn(
                        "p-1.5 rounded-full transition-colors",
                        station.is_favorite ? "text-pink-500" : "text-white/40 hover:text-white"
                    )}
                >
                    <Heart className={cn("w-4 h-4", station.is_favorite && "fill-current")} />
                </button>
                {station.is_custom && (
                    <button
                        onClick={onDelete}
                        className="p-1.5 rounded-full text-white/40 hover:text-red-500 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>
        </motion.div>
    );
}

function BrowseStationCard({
    station,
    isPlaying,
    onClick,
    delay,
    compact = false
}: {
    station: BrowseStation;
    isPlaying: boolean;
    onClick: () => void;
    delay: number;
    compact?: boolean;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            onClick={onClick}
            className={cn(
                "group relative p-4 rounded-xl cursor-pointer transition-all duration-200",
                isPlaying
                    ? "bg-pink-500/20 border border-pink-500/30"
                    : "bg-white/5 hover:bg-white/10 border border-transparent",
                compact && "flex-shrink-0 w-48"
            )}
        >
            <div className="flex items-start gap-4">
                <div className={cn(
                    "rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden",
                    isPlaying ? "bg-pink-500/30" : "bg-white/10",
                    compact ? "w-10 h-10" : "w-12 h-12"
                )}>
                    {station.favicon ? (
                        <img
                            src={station.favicon}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                    ) : null}
                    <RadioIcon className={cn(
                        station.favicon ? "hidden" : "",
                        isPlaying ? "text-pink-500" : "text-white/40",
                        compact ? "w-5 h-5" : "w-6 h-6"
                    )} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className={cn(
                        "font-medium truncate",
                        isPlaying ? "text-pink-500" : "text-white",
                        compact && "text-sm"
                    )}>
                        {station.name}
                    </h3>
                    <p className={cn(
                        "text-white/40 truncate",
                        compact ? "text-xs" : "text-sm"
                    )}>
                        {station.tags?.[0] || 'Radio'} {station.country && `• ${station.country}`}
                    </p>
                </div>
            </div>

            {isPlaying && (
                <div className="absolute top-4 right-4">
                    <div className="flex items-end gap-0.5 h-4">
                        <span className="w-0.5 bg-pink-500 rounded-full animate-equalizer-1" />
                        <span className="w-0.5 bg-pink-500 rounded-full animate-equalizer-2" />
                        <span className="w-0.5 bg-pink-500 rounded-full animate-equalizer-3" />
                    </div>
                </div>
            )}
        </motion.div>
    );
}

function AddStationModal({
    isOpen,
    onClose,
    onSubmit
}: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: RadioStationCreate) => void;
}) {
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [genre, setGenre] = useState('');
    const [country, setCountry] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !url.trim()) return;

        onSubmit({
            name: name.trim(),
            url: url.trim(),
            genre: genre.trim() || undefined,
            country: country.trim() || undefined,
        });

        setName('');
        setUrl('');
        setGenre('');
        setCountry('');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Radio Station">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-pink-500/30 to-purple-500/30 rounded-xl flex items-center justify-center">
                        <RadioIcon className="w-10 h-10 text-white/60" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-white/60 mb-2">
                        Station Name *
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="My Radio Station"
                        autoFocus
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-pink-500/50"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-white/60 mb-2">
                        Stream URL *
                    </label>
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://stream.example.com/radio.mp3"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-pink-500/50"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-white/60 mb-2">
                            Genre
                        </label>
                        <input
                            type="text"
                            value={genre}
                            onChange={(e) => setGenre(e.target.value)}
                            placeholder="Jazz"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-pink-500/50"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-white/60 mb-2">
                            Country
                        </label>
                        <input
                            type="text"
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            placeholder="USA"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-pink-500/50"
                        />
                    </div>
                </div>

                <div className="flex gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!name.trim() || !url.trim()}
                        className="flex-1 px-4 py-3 bg-pink-500 hover:bg-pink-600 disabled:bg-pink-500/50 disabled:cursor-not-allowed text-white rounded-xl transition-colors font-medium"
                    >
                        Add Station
                    </button>
                </div>
            </form>
        </Modal>
    );
}
