import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, AlertCircle, Loader2, Wand2, Save, Music2 } from 'lucide-react';
import { libraryApi } from '../api/library';
import { cn } from '../lib/utils';

interface TrackIssue {
    track: {
        id: number;
        file_path: string;
        title: string;
        artist: string;
        album: string;
        year: number | null;
        track_number: number | null;
    };
    missing: string[];
    suggestions: {
        title?: string;
        artist?: string;
        album?: string;
        year?: number;
        track_number?: number;
    };
}

interface IssuesData {
    total_issues: number;
    issues: TrackIssue[];
}

export function MetadataFixer() {
    const [data, setData] = useState<IssuesData | null>(null);
    const [loading, setLoading] = useState(true);
    const [fixing, setFixing] = useState(false);
    const [editedValues, setEditedValues] = useState<Record<number, Record<string, any>>>({});
    const [fixedIds, setFixedIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        loadIssues();
    }, []);

    const loadIssues = async () => {
        setLoading(true);
        try {
            const result = await libraryApi.getMetadataIssues();
            setData(result);
            
            const initialEdits: Record<number, Record<string, any>> = {};
            for (const issue of result.issues) {
                initialEdits[issue.track.id] = { ...issue.suggestions };
            }
            setEditedValues(initialEdits);
        } catch (error) {
            console.error('Error loading metadata issues:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (trackId: number, field: string, value: string | number) => {
        setEditedValues(prev => ({
            ...prev,
            [trackId]: {
                ...prev[trackId],
                [field]: value
            }
        }));
    };

    const fixTrack = async (trackId: number) => {
        const edits = editedValues[trackId];
        if (!edits || Object.keys(edits).length === 0) return;
        
        try {
            await libraryApi.fixTrackMetadata(trackId, edits, false);
            setFixedIds(prev => new Set([...prev, trackId]));
        } catch (error) {
            console.error('Error fixing track:', error);
        }
    };

    const fixAll = async () => {
        setFixing(true);
        try {
            await libraryApi.fixAllMetadata(false);
            await loadIssues();
        } catch (error) {
            console.error('Error fixing all metadata:', error);
        } finally {
            setFixing(false);
        }
    };

    const getFileName = (filePath: string) => {
        return filePath.split('/').pop() || filePath;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold">Fix Metadata</h1>
                    <p className="text-white/50 mt-1">
                        {data?.total_issues || 0} tracks with missing or incomplete metadata
                    </p>
                </div>
                
                {data && data.issues.length > 0 && (
                    <button
                        onClick={fixAll}
                        disabled={fixing}
                        className="px-4 py-2 bg-pink-500 hover:bg-pink-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        {fixing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Wand2 className="w-4 h-4" />
                        )}
                        Auto-Fix All
                    </button>
                )}
            </div>

            {!data || data.issues.length === 0 ? (
                <div className="text-center py-16 bg-white/5 rounded-xl">
                    <Check className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">All Metadata Complete</h2>
                    <p className="text-white/50">No tracks with missing metadata found.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {data.issues.map((issue, index) => (
                        <motion.div
                            key={issue.track.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className={cn(
                                "bg-white/5 rounded-xl p-6 border transition-colors",
                                fixedIds.has(issue.track.id) 
                                    ? "border-emerald-500/50 bg-emerald-500/5" 
                                    : "border-white/5"
                            )}
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                    <Music2 className="w-6 h-6 text-white/20" />
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <p className="font-medium truncate">{getFileName(issue.track.file_path)}</p>
                                        {fixedIds.has(issue.track.id) && (
                                            <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded">
                                                <Check className="w-3 h-3" />
                                                Fixed
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-1 mb-4">
                                        {issue.missing.map(field => (
                                            <span 
                                                key={field}
                                                className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded"
                                            >
                                                <AlertCircle className="w-3 h-3" />
                                                Missing {field}
                                            </span>
                                        ))}
                                    </div>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-xs text-white/40 mb-1">Title</label>
                                            <input
                                                type="text"
                                                value={editedValues[issue.track.id]?.title ?? issue.track.title ?? ''}
                                                onChange={(e) => handleInputChange(issue.track.id, 'title', e.target.value)}
                                                placeholder="Enter title"
                                                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-white/40 mb-1">Artist</label>
                                            <input
                                                type="text"
                                                value={editedValues[issue.track.id]?.artist ?? issue.track.artist ?? ''}
                                                onChange={(e) => handleInputChange(issue.track.id, 'artist', e.target.value)}
                                                placeholder="Enter artist"
                                                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-white/40 mb-1">Album</label>
                                            <input
                                                type="text"
                                                value={editedValues[issue.track.id]?.album ?? issue.track.album ?? ''}
                                                onChange={(e) => handleInputChange(issue.track.id, 'album', e.target.value)}
                                                placeholder="Enter album"
                                                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-white/40 mb-1">Year</label>
                                            <input
                                                type="number"
                                                value={editedValues[issue.track.id]?.year ?? issue.track.year ?? ''}
                                                onChange={(e) => handleInputChange(issue.track.id, 'year', parseInt(e.target.value) || '')}
                                                placeholder="Year"
                                                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                <button
                                    onClick={() => fixTrack(issue.track.id)}
                                    disabled={fixedIds.has(issue.track.id)}
                                    className={cn(
                                        "px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                                        fixedIds.has(issue.track.id)
                                            ? "bg-emerald-500/20 text-emerald-400 cursor-not-allowed"
                                            : "bg-pink-500 hover:bg-pink-600"
                                    )}
                                >
                                    {fixedIds.has(issue.track.id) ? (
                                        <Check className="w-4 h-4" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    {fixedIds.has(issue.track.id) ? 'Fixed' : 'Save'}
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
