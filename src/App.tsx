import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { ScrollToTop } from './components/ScrollToTop';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { Discover } from './pages/Discover';
import { Artists } from './pages/Artists';
import { ArtistDetail } from './pages/ArtistDetail';
import { Albums } from './pages/Albums';
import { AlbumDetail } from './pages/AlbumDetail';
import { LikedSongs } from './pages/LikedSongs';
import { SavedAlbums } from './pages/SavedAlbums';
import { Playlist } from './pages/Playlist';
import { Library } from './pages/Library';
import { Settings } from './pages/Settings';
import { Radio } from './pages/Radio';
import { Genre } from './pages/Genre';
import { Mood } from './pages/Mood';
import { Decade } from './pages/Decade';
import { Activity } from './pages/Activity';
import { Duplicates } from './pages/Duplicates';
import { MetadataFixer } from './pages/MetadataFixer';
import { LyricsFullScreen } from './components/ui/LyricsFullScreen';
import { AutoScanToast } from './components/ui/Toast';

function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="discover" element={<Discover />} />
            <Route path="browse" element={<Discover />} />
            <Route path="radio" element={<Radio />} />
            <Route path="artists" element={<Artists />} />
            <Route path="artist/:artistName" element={<ArtistDetail />} />
            <Route path="albums" element={<Albums />} />
            <Route path="album/:albumName" element={<AlbumDetail />} />
            <Route path="library" element={<Library />} />
            <Route path="genre/:genreName" element={<Genre />} />
            <Route path="mood/:moodName" element={<Mood />} />
            <Route path="decade/:decadeName" element={<Decade />} />
            <Route path="activity/:activityName" element={<Activity />} />
            <Route path="duplicates" element={<Duplicates />} />
            <Route path="metadata-fixer" element={<MetadataFixer />} />
            <Route path="liked" element={<LikedSongs />} />
            <Route path="saved-albums" element={<SavedAlbums />} />
            <Route path="playlist/:id" element={<Playlist />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Home />} />
          </Route>
        </Routes>
        <LyricsFullScreen />
        <AutoScanToast />
      </BrowserRouter>
    </QueryProvider>
  );
}

export default App;
