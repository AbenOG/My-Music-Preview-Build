import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FolderPlus, Trash2, RefreshCw, HardDrive, Music, Disc, User, Clock, Loader2, Volume2, Copy, FileEdit, Database } from 'lucide-react';
import { useLibraryStore } from '../stores/libraryStore';
import { usePlayerStore } from '../stores/playerStore';
import { NormalizationSettings } from '../components/NormalizationSettings';
import { BatchMusicBrainzLookup } from '../components/MusicBrainzLookup';

export function Settings() {
    const [newFolderPath, setNewFolderPath] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    
    const { 
        folders, 
        stats, 
        isScanning, 
        scanProgress,
        addFolder, 
        removeFolder, 
        scanFolder,
        getScanStatus
    } = useLibraryStore();

    const { normalizationEnabled, toggleNormalization } = usePlayerStore();

    useEffect(() => {
        if (isScanning) {
            pollingRef.current = setInterval(() => {
                getScanStatus();
            }, 500);
        } else {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        }

        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
            }
        };
    }, [isScanning, getScanStatus]);

    useEffect(() => {
        getScanStatus();
    }, []);

    const handleAddFolder = async () => {
        if (!newFolderPath.trim()) return;
        
        setIsAdding(true);
        try {
            await addFolder(newFolderPath.trim());
            setNewFolderPath('');
            setTimeout(() => getScanStatus(), 100);
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Failed to add folder');
        } finally {
            setIsAdding(false);
        }
    };

    const handleRemoveFolder = async (id: number, name: string) => {
        if (confirm(`Remove folder "${name}" and all its tracks from library?`)) {
            await removeFolder(id);
        }
    };

    const handleScanFolder = async (id: number) => {
        await scanFolder(id);
        setTimeout(() => getScanStatus(), 100);
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDuration = (ms: number) => {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes} minutes`;
    };

    return (
        <div className="p-8 space-y-10 w-full">
            <h1 className="text-4xl font-bold">Settings</h1>

            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">Music Folders</h2>
                        <p className="text-white/50 text-sm mt-1">Add folders containing your music files</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <input
                        type="text"
                        placeholder="Enter folder path (e.g., /home/user/Music)"
                        value={newFolderPath}
                        onChange={(e) => setNewFolderPath(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddFolder()}
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500 transition-colors"
                    />
                    <button
                        onClick={handleAddFolder}
                        disabled={isAdding || !newFolderPath.trim()}
                        className="px-6 py-3 bg-pink-500 text-white font-semibold rounded-lg hover:bg-pink-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isAdding ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <FolderPlus className="w-5 h-5" />
                        )}
                        Add Folder
                    </button>
                </div>

                {isScanning && scanProgress && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-pink-500/10 border border-pink-500/20 rounded-lg p-4"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <Loader2 className="w-5 h-5 text-pink-500 animate-spin" />
                            <span className="font-medium">Scanning in progress...</span>
                        </div>
                        <p className="text-sm text-white/60 mb-3 truncate">
                            {scanProgress.current_file || 'Initializing scan...'}
                        </p>
                        <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                            <motion.div 
                                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${scanProgress.progress}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                        <div className="flex justify-between items-center mt-2">
                            <p className="text-xs text-white/40">
                                {scanProgress.processed} / {scanProgress.total} files processed
                            </p>
                            <p className="text-xs text-white/60 font-medium">
                                {Math.round(scanProgress.progress)}%
                            </p>
                        </div>
                    </motion.div>
                )}

                <div className="space-y-3">
                    {folders.length === 0 ? (
                        <div className="text-center py-12 bg-white/5 rounded-xl border border-white/5">
                            <HardDrive className="w-12 h-12 text-white/20 mx-auto mb-4" />
                            <p className="text-white/50">No folders added yet</p>
                            <p className="text-white/30 text-sm mt-1">Add a folder above to start scanning your music</p>
                        </div>
                    ) : (
                        folders.map((folder) => (
                            <div 
                                key={folder.id}
                                className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors"
                            >
                                <HardDrive className="w-8 h-8 text-pink-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-white truncate">{folder.name}</p>
                                    <p className="text-sm text-white/40 truncate">{folder.path}</p>
                                    <p className="text-xs text-white/30 mt-1">
                                        {folder.track_count} tracks • 
                                        Last scanned: {folder.last_scanned_at 
                                            ? new Date(folder.last_scanned_at).toLocaleString()
                                            : 'Never'
                                        }
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleScanFolder(folder.id)}
                                        disabled={isScanning}
                                        className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors disabled:opacity-50"
                                        title="Rescan folder"
                                    >
                                        <RefreshCw className={`w-5 h-5 ${isScanning && scanProgress?.folder_id === folder.id ? 'animate-spin' : ''}`} />
                                    </button>
                                    <button
                                        onClick={() => handleRemoveFolder(folder.id, folder.name)}
                                        className="p-2 rounded-lg hover:bg-red-500/20 text-white/60 hover:text-red-500 transition-colors"
                                        title="Remove folder"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            <section className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold">Playback</h2>
                    <p className="text-white/50 text-sm mt-1">Audio playback settings</p>
                </div>
                
                <div className="bg-white/5 rounded-xl p-6 border border-white/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Volume2 className="w-8 h-8 text-pink-500" />
                            <div>
                                <h3 className="font-medium text-white">Volume Normalization</h3>
                                <p className="text-white/50 text-sm mt-1">
                                    Automatically adjust volume levels for consistent playback
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={toggleNormalization}
                            className={`w-12 h-6 rounded-full transition-colors relative ${
                                normalizationEnabled ? 'bg-pink-500' : 'bg-white/20'
                            }`}
                        >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                normalizationEnabled ? 'translate-x-7' : 'translate-x-1'
                            }`} />
                        </button>
                    </div>
                </div>
            </section>

            <section className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold">Library Tools</h2>
                    <p className="text-white/50 text-sm mt-1">Organize and clean up your music library</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link
                        to="/duplicates"
                        className="bg-white/5 rounded-xl p-6 border border-white/5 hover:bg-white/10 transition-colors group"
                    >
                        <div className="flex items-center gap-4">
                            <Copy className="w-8 h-8 text-orange-500" />
                            <div>
                                <h3 className="font-medium text-white group-hover:text-pink-400 transition-colors">Find Duplicates</h3>
                                <p className="text-white/50 text-sm mt-1">
                                    Detect and remove duplicate tracks
                                </p>
                            </div>
                        </div>
                    </Link>
                    
                    <Link
                        to="/metadata-fixer"
                        className="bg-white/5 rounded-xl p-6 border border-white/5 hover:bg-white/10 transition-colors group"
                    >
                        <div className="flex items-center gap-4">
                            <FileEdit className="w-8 h-8 text-blue-500" />
                            <div>
                                <h3 className="font-medium text-white group-hover:text-pink-400 transition-colors">Fix Metadata</h3>
                                <p className="text-white/50 text-sm mt-1">
                                    Auto-fix missing track information
                                </p>
                            </div>
                        </div>
                    </Link>
                </div>
            </section>

            <section className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold">Metadata Management</h2>
                    <p className="text-white/50 text-sm mt-1">Normalize and enrich your library metadata</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <NormalizationSettings />
                    <BatchMusicBrainzLookup />
                </div>
            </section>

            {stats && (
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold">Library Statistics</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/5 rounded-xl p-6 border border-white/5">
                            <Music className="w-8 h-8 text-pink-500 mb-3" />
                            <p className="text-3xl font-bold">{stats.total_tracks}</p>
                            <p className="text-white/50 text-sm">Tracks</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-6 border border-white/5">
                            <Disc className="w-8 h-8 text-purple-500 mb-3" />
                            <p className="text-3xl font-bold">{stats.total_albums}</p>
                            <p className="text-white/50 text-sm">Albums</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-6 border border-white/5">
                            <User className="w-8 h-8 text-blue-500 mb-3" />
                            <p className="text-3xl font-bold">{stats.total_artists}</p>
                            <p className="text-white/50 text-sm">Artists</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-6 border border-white/5">
                            <Clock className="w-8 h-8 text-emerald-500 mb-3" />
                            <p className="text-3xl font-bold">{formatDuration(stats.total_duration_ms)}</p>
                            <p className="text-white/50 text-sm">Total Duration</p>
                        </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-6 border border-white/5">
                        <HardDrive className="w-8 h-8 text-orange-500 mb-3" />
                        <p className="text-3xl font-bold">{formatBytes(stats.total_size_bytes)}</p>
                        <p className="text-white/50 text-sm">Storage Used</p>
                    </div>
                </section>
            )}

            <section className="space-y-6">
                <h2 className="text-2xl font-bold">About</h2>
                <div className="bg-white/5 rounded-xl p-6 border border-white/5">
                    <h3 className="font-bold text-lg mb-2">Open Source Music Player</h3>
                    <p className="text-white/60 text-sm mb-4">
                        A beautiful, local-first music player built with React and Python.
                    </p>
                    <p className="text-white/40 text-xs">Version 1.0.0</p>
                </div>
            </section>
        </div>
    );
}
