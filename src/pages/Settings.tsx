import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderPlus,
  Trash2,
  RefreshCw,
  HardDrive,
  Music,
  Disc,
  User,
  Clock,
  Loader2,
  Volume2,
  Copy,
  FileEdit,
  Database,
  Shield,
  FolderOpen,
} from 'lucide-react';
import { useLibraryStore } from '../stores/libraryStore';
import { usePlayerStore } from '../stores/playerStore';
import { SettingsSidebar, type SettingsCategory } from '../components/ui/SettingsSidebar';
import { SettingsCard } from '../components/ui/SettingsCard';
import { ToggleSwitch } from '../components/ui/ToggleSwitch';
import { NormalizationSettings } from '../components/NormalizationSettings';
import { BatchMusicBrainzLookup } from '../components/MusicBrainzLookup';

export function Settings() {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('library');
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
    getScanStatus,
  } = useLibraryStore();

  const {
    normalizationEnabled,
    toggleNormalization,
    limiterEnabled,
    toggleLimiter,
    limiterCeiling,
    setLimiterCeiling,
    targetLufs,
    setTargetLufs,
  } = usePlayerStore();

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
  }, [getScanStatus]);

  const handleAddFolder = async () => {
    if (!newFolderPath.trim()) return;

    setIsAdding(true);
    try {
      await addFolder(newFolderPath.trim());
      setNewFolderPath('');
      setTimeout(() => getScanStatus(), 100);
    } catch (error) {
      const errorMessage = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : 'Failed to add folder';
      alert(errorMessage || 'Failed to add folder');
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

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-black/50 backdrop-blur-xl">
      <SettingsSidebar
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        isMobile={isMobile}
      />

      <div className="flex-1 overflow-y-auto p-6 md:p-12 relative">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-pink-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {activeCategory === 'library' && (
                <div className="space-y-10">
                  <header>
                    <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Library</h1>
                    <p className="text-lg text-white/50">Manage your music folders and view library statistics</p>
                  </header>

                  {/* Scan Progress */}
                  {isScanning && scanProgress && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/5 border border-white/10 rounded-2xl p-8 relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 to-purple-500/5" />
                      
                      <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="p-3 bg-pink-500/10 rounded-xl">
                            <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">Scanning in progress...</h3>
                            <p className="text-white/50">{scanProgress.current_file || 'Initializing scan...'}</p>
                          </div>
                        </div>
                        
                        <div className="h-4 bg-white/5 rounded-full overflow-hidden mb-4 ring-1 ring-white/10">
                          <motion.div
                            className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${scanProgress.progress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        
                        <div className="flex justify-between items-center text-sm font-medium">
                          <span className="text-white/40">
                            {scanProgress.processed} / {scanProgress.total} files processed
                          </span>
                          <span className="text-pink-400">{Math.round(scanProgress.progress)}%</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Add New Folder */}
                  <SettingsCard
                    title="Add Music Folder"
                    description="Add a folder containing your music files to the library"
                    icon={<FolderPlus className="w-6 h-6" />}
                    gradient="from-pink-500/10 to-rose-500/10"
                  >
                    <div className="flex gap-4 mt-6">
                      <div className="flex-1 relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <input
                          type="text"
                          placeholder="Enter folder path (e.g., /home/user/Music)"
                          value={newFolderPath}
                          onChange={(e) => setNewFolderPath(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddFolder()}
                          className="relative w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all"
                        />
                      </div>
                      <button
                        onClick={handleAddFolder}
                        disabled={isAdding || !newFolderPath.trim()}
                        className="px-8 py-4 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-pink-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {isAdding ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <FolderPlus className="w-5 h-5" />
                        )}
                        Add Folder
                      </button>
                    </div>
                  </SettingsCard>

                  {/* Music Folders */}
                  <section>
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                      <HardDrive className="w-5 h-5 text-pink-500" />
                      Music Folders
                    </h2>
                    <div className="grid grid-cols-1 gap-4">
                      {folders.length === 0 ? (
                        <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FolderOpen className="w-8 h-8 text-white/20" />
                          </div>
                          <p className="text-white/50 text-lg">No folders added yet</p>
                          <p className="text-white/30 mt-1">Add a folder above to start scanning your music</p>
                        </div>
                      ) : (
                        folders.map((folder) => (
                          <motion.div
                            key={folder.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="group flex items-center gap-6 p-6 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/[0.07] hover:border-white/10 transition-all"
                          >
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-800 to-black flex items-center justify-center border border-white/10 shadow-lg">
                              <HardDrive className="w-6 h-6 text-white/70" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-lg text-white truncate mb-1">{folder.name}</p>
                              <p className="text-sm text-white/40 truncate font-mono bg-black/30 px-2 py-1 rounded inline-block">{folder.path}</p>
                              <div className="flex items-center gap-4 mt-3 text-xs font-medium text-white/30 uppercase tracking-wider">
                                <span>{folder.track_count} tracks</span>
                                <span className="w-1 h-1 bg-white/20 rounded-full" />
                                <span>
                                  Last scanned: {folder.last_scanned_at
                                    ? new Date(folder.last_scanned_at).toLocaleString()
                                    : 'Never'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 duration-300">
                              <button
                                onClick={() => handleScanFolder(folder.id)}
                                disabled={isScanning}
                                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                                title="Rescan folder"
                              >
                                <RefreshCw
                                  className={`w-5 h-5 ${
                                    isScanning && scanProgress?.folder_id === folder.id ? 'animate-spin' : ''
                                  }`}
                                />
                              </button>
                              <button
                                onClick={() => handleRemoveFolder(folder.id, folder.name)}
                                className="p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all hover:scale-105 active:scale-95 border border-transparent hover:border-red-500/20"
                                title="Remove folder"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </section>

                  {/* Library Statistics */}
                  {stats && (
                    <section>
                      <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                        <Database className="w-5 h-5 text-purple-500" />
                        Library Statistics
                      </h2>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <SettingsCard 
                          icon={<Music className="w-6 h-6" />} 
                          gradient="from-pink-500/20 to-rose-500/20"
                          className="md:col-span-1"
                        >
                          <div className="mt-2">
                            <p className="text-3xl font-bold text-white mb-1">{stats.total_tracks}</p>
                            <p className="text-white/50 text-sm font-medium uppercase tracking-wider">Tracks</p>
                          </div>
                        </SettingsCard>
                        <SettingsCard 
                          icon={<Disc className="w-6 h-6" />} 
                          gradient="from-purple-500/20 to-indigo-500/20"
                        >
                          <div className="mt-2">
                            <p className="text-3xl font-bold text-white mb-1">{stats.total_albums}</p>
                            <p className="text-white/50 text-sm font-medium uppercase tracking-wider">Albums</p>
                          </div>
                        </SettingsCard>
                        <SettingsCard 
                          icon={<User className="w-6 h-6" />} 
                          gradient="from-blue-500/20 to-cyan-500/20"
                        >
                          <div className="mt-2">
                            <p className="text-3xl font-bold text-white mb-1">{stats.total_artists}</p>
                            <p className="text-white/50 text-sm font-medium uppercase tracking-wider">Artists</p>
                          </div>
                        </SettingsCard>
                        <SettingsCard 
                          icon={<Clock className="w-6 h-6" />} 
                          gradient="from-emerald-500/20 to-teal-500/20"
                        >
                          <div className="mt-2">
                            <p className="text-3xl font-bold text-white mb-1">{formatDuration(stats.total_duration_ms)}</p>
                            <p className="text-white/50 text-sm font-medium uppercase tracking-wider">Duration</p>
                          </div>
                        </SettingsCard>
                      </div>
                      <SettingsCard
                        icon={<HardDrive className="w-6 h-6" />}
                        gradient="from-orange-500/20 to-amber-500/20"
                        className="mt-4"
                      >
                        <div className="flex items-center justify-between mt-2">
                          <div>
                            <p className="text-3xl font-bold text-white mb-1">{formatBytes(stats.total_size_bytes)}</p>
                            <p className="text-white/50 text-sm font-medium uppercase tracking-wider">Storage Used</p>
                          </div>
                          {stats.total_size_bytes > 0 && (
                            <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-orange-500 to-amber-500 w-full rounded-full opacity-75" />
                            </div>
                          )}
                        </div>
                      </SettingsCard>
                    </section>
                  )}
                </div>
              )}

              {activeCategory === 'audio' && (
                <div className="space-y-10">
                  <header>
                    <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Audio Settings</h1>
                    <p className="text-lg text-white/50">Configure audio playback and volume normalization</p>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SettingsCard
                      title="Volume Normalization"
                      description="Automatically adjust volume using per-track loudness data (EBU R128)"
                      icon={<Volume2 className="w-6 h-6" />}
                      gradient="from-purple-500/20 to-pink-500/20"
                    >
                      <ToggleSwitch enabled={normalizationEnabled} onChange={toggleNormalization} color="purple" />
                    </SettingsCard>

                    <SettingsCard
                      title="Hard Limiter"
                      description="Prevent clipping with a brick-wall ceiling (protects against loud tracks)"
                      icon={<Shield className="w-6 h-6" />}
                      gradient="from-emerald-500/20 to-teal-500/20"
                    >
                      <ToggleSwitch enabled={limiterEnabled} onChange={toggleLimiter} color="emerald" />
                    </SettingsCard>
                  </div>

                  {/* Volume Normalization Settings */}
                  <AnimatePresence>
                    {normalizationEnabled && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: -20 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <SettingsCard
                          title="Target Loudness"
                          description="Reference level for normalization"
                          icon={<Volume2 className="w-6 h-6" />}
                          gradient="from-purple-500/10 to-indigo-500/10"
                        >
                          <div className="grid grid-cols-3 gap-4 mt-6">
                            {[
                              { value: -14, label: '-14 LUFS', desc: 'Spotify Standard' },
                              { value: -16, label: '-16 LUFS', desc: 'Apple Music' },
                              { value: -23, label: '-23 LUFS', desc: 'Broadcast Standard' },
                            ].map((option) => (
                              <button
                                key={option.value}
                                onClick={() => setTargetLufs(option.value)}
                                className={`
                                  relative p-4 rounded-xl border transition-all duration-200 group
                                  ${targetLufs === option.value
                                    ? 'bg-purple-500/20 border-purple-500/50 shadow-lg shadow-purple-500/10'
                                    : 'bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10'
                                  }
                                `}
                              >
                                {targetLufs === option.value && (
                                  <motion.div
                                    layoutId="lufsActive"
                                    className="absolute inset-0 border-2 border-purple-500 rounded-xl"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                  />
                                )}
                                <span className={`block text-lg font-bold mb-1 ${targetLufs === option.value ? 'text-white' : 'text-white/70'}`}>
                                  {option.label}
                                </span>
                                <span className={`text-xs ${targetLufs === option.value ? 'text-purple-200' : 'text-white/40'}`}>
                                  {option.desc}
                                </span>
                              </button>
                            ))}
                          </div>
                        </SettingsCard>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Hard Limiter Settings */}
                  <AnimatePresence>
                    {limiterEnabled && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: -20 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <SettingsCard
                          title="Ceiling Level"
                          description="Maximum output level (lower = more headroom)"
                          icon={<Shield className="w-6 h-6" />}
                          gradient="from-emerald-500/10 to-teal-500/10"
                        >
                          <div className="grid grid-cols-3 gap-4 mt-6">
                            {[
                              { value: -0.1, label: '-0.1 dB', desc: 'Maximum Loudness' },
                              { value: -1, label: '-1 dB', desc: 'Balanced' },
                              { value: -3, label: '-3 dB', desc: 'Maximum Safety' },
                            ].map((option) => (
                              <button
                                key={option.value}
                                onClick={() => setLimiterCeiling(option.value)}
                                className={`
                                  relative p-4 rounded-xl border transition-all duration-200
                                  ${limiterCeiling === option.value
                                    ? 'bg-emerald-500/20 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                                    : 'bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10'
                                  }
                                `}
                              >
                                {limiterCeiling === option.value && (
                                  <motion.div
                                    layoutId="ceilingActive"
                                    className="absolute inset-0 border-2 border-emerald-500 rounded-xl"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                  />
                                )}
                                <span className={`block text-lg font-bold mb-1 ${limiterCeiling === option.value ? 'text-white' : 'text-white/70'}`}>
                                  {option.label}
                                </span>
                                <span className={`text-xs ${limiterCeiling === option.value ? 'text-emerald-200' : 'text-white/40'}`}>
                                  {option.desc}
                                </span>
                              </button>
                            ))}
                          </div>
                        </SettingsCard>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {activeCategory === 'tools' && (
                <div className="space-y-10">
                  <header>
                    <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Library Tools</h1>
                    <p className="text-lg text-white/50">Organize, clean up, and fix your music library</p>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Link to="/duplicates" className="group">
                      <SettingsCard
                        className="h-full hover:scale-[1.02] transition-transform duration-300"
                        gradient="from-emerald-500/20 to-teal-500/20"
                      >
                        <div className="flex items-start gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors shadow-lg shadow-emerald-500/10">
                            <Copy className="w-7 h-7 text-emerald-500" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">Find Duplicates</h3>
                            <p className="text-white/50 leading-relaxed">Scan your library for duplicate tracks and merge play history automatically.</p>
                          </div>
                        </div>
                      </SettingsCard>
                    </Link>

                    <Link to="/metadata-fixer" className="group">
                      <SettingsCard
                        className="h-full hover:scale-[1.02] transition-transform duration-300"
                        gradient="from-blue-500/20 to-indigo-500/20"
                      >
                        <div className="flex items-start gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors shadow-lg shadow-blue-500/10">
                            <FileEdit className="w-7 h-7 text-blue-500" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">Fix Metadata</h3>
                            <p className="text-white/50 leading-relaxed">Auto-fix missing or incorrect tags using online databases like MusicBrainz.</p>
                          </div>
                        </div>
                      </SettingsCard>
                    </Link>
                  </div>

                  <SettingsCard
                    title="Batch MusicBrainz Lookup"
                    description="Look up all tracks in your library against MusicBrainz to enrich metadata. This process runs in the background."
                    icon={<Database className="w-6 h-6" />}
                    gradient="from-indigo-500/20 to-violet-500/20"
                  >
                    <div className="mt-8 bg-black/20 rounded-xl p-6 border border-white/5">
                      <BatchMusicBrainzLookup />
                    </div>
                  </SettingsCard>
                </div>
              )}

              {activeCategory === 'metadata' && (
                <div className="space-y-10">
                  <header>
                    <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Metadata Management</h1>
                    <p className="text-lg text-white/50">Normalize and enrich your library metadata</p>
                  </header>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <NormalizationSettings />
                    
                    <div className="space-y-6">
                      <SettingsCard
                        title="Metadata Tools"
                        description="Understand how metadata is processed"
                        icon={<Database className="w-6 h-6" />}
                        gradient="from-blue-500/20 to-cyan-500/20"
                      >
                        <div className="mt-6 space-y-4">
                          <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex gap-4">
                            <div className="p-2 bg-blue-500/20 rounded-lg h-fit">
                              <Database className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-sm mb-1">MusicBrainz Integration</h4>
                              <p className="text-sm text-white/60">We use MusicBrainz acoustic fingerprinting to identify tracks even without any metadata.</p>
                            </div>
                          </div>
                          
                          <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex gap-4">
                            <div className="p-2 bg-purple-500/20 rounded-lg h-fit">
                              <FileEdit className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-sm mb-1">Standardization</h4>
                              <p className="text-sm text-white/60">Normalization ensures consistent formatting for artists, albums, and titles across your entire library.</p>
                            </div>
                          </div>
                        </div>
                      </SettingsCard>
                    </div>
                  </div>
                </div>
              )}

              {activeCategory === 'about' && (
                <div className="space-y-10">
                  <header>
                    <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">About</h1>
                    <p className="text-lg text-white/50">System information and credits</p>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <SettingsCard
                      title="Open Source Music Player"
                      description="A beautiful, local-first music player built with React and Python."
                      icon={<Music className="w-6 h-6" />}
                      gradient="from-pink-500/20 to-rose-500/20"
                    >
                      <div className="mt-6 pt-6 border-t border-white/10">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-white/50">Version</span>
                          <span className="font-mono bg-white/10 px-3 py-1 rounded-lg text-sm">v1.0.0-beta</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white/50">Build Date</span>
                          <span className="text-white/80">Jan 2026</span>
                        </div>
                      </div>
                    </SettingsCard>

                    <SettingsCard
                      title="Features"
                      icon={<Database className="w-6 h-6" />}
                      gradient="from-gray-500/20 to-zinc-500/20"
                    >
                      <div className="mt-6 space-y-3">
                        {[
                          "Local-first music library management",
                          "Automatic metadata extraction & fixing",
                          "Real-time folder monitoring",
                          "Smart playlists and radio generation",
                          "High-quality audio pipeline with normalization"
                        ].map((feature, i) => (
                          <div key={i} className="flex items-center gap-3 text-sm text-white/70">
                            <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                            {feature}
                          </div>
                        ))}
                      </div>
                    </SettingsCard>
                  </div>
                  
                  <div className="text-center text-white/20 text-sm py-10">
                    <p>Crafted with care for music lovers.</p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
