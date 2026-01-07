import { useState } from 'react';
import { Modal } from './Modal';
import { useLibraryStore } from '../../stores/libraryStore';
import { ListMusic } from 'lucide-react';

interface CreatePlaylistModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated?: (playlistId: number) => void;
}

export function CreatePlaylistModal({ isOpen, onClose, onCreated }: CreatePlaylistModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const { createPlaylist } = useLibraryStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!name.trim()) {
            setError('Please enter a playlist name');
            return;
        }
        
        setIsLoading(true);
        setError('');
        
        try {
            const playlist = await createPlaylist(name.trim(), description.trim() || undefined);
            setName('');
            setDescription('');
            onClose();
            if (onCreated) {
                onCreated(playlist.id);
            }
        } catch (err) {
            setError('Failed to create playlist');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setName('');
        setDescription('');
        setError('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Create Playlist">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex justify-center mb-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-pink-500/30 to-purple-500/30 rounded-xl flex items-center justify-center">
                        <ListMusic className="w-12 h-12 text-white/60" />
                    </div>
                </div>
                
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-white/60 mb-2">
                        Name
                    </label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="My awesome playlist"
                        autoFocus
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-colors"
                    />
                </div>
                
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-white/60 mb-2">
                        Description (optional)
                    </label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Add a description..."
                        rows={3}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-colors resize-none"
                    />
                </div>
                
                {error && (
                    <p className="text-red-400 text-sm">{error}</p>
                )}
                
                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="flex-1 px-4 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading || !name.trim()}
                        className="flex-1 px-4 py-3 bg-pink-500 hover:bg-pink-600 disabled:bg-pink-500/50 disabled:cursor-not-allowed text-white rounded-xl transition-colors font-medium"
                    >
                        {isLoading ? 'Creating...' : 'Create'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
