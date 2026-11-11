import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import "./styles/theme.css";
import "./styles/layout.css";
import "./styles/pages.css";
import "./styles/admin.css";

import { ThemeProvider } from "./contexts/ThemeContext.jsx";
import { ToastProvider } from "./contexts/ToastContext.jsx";
import { OfflineProvider } from "./contexts/OfflineContext.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { ContentProvider } from "./contexts/ContentContext.jsx";
import { FavoritesProvider } from "./contexts/FavoritesContext.jsx";
import { PlayerProvider } from "./contexts/PlayerContext.jsx";

import Layout from "./components/Layout.jsx";
import RequireAuth from "./components/RequireAuth.jsx";

import HomePage from "./pages/HomePage.jsx";
import MusicPage from "./pages/MusicPage.jsx";
import AlbumsPage from "./pages/AlbumsPage.jsx";
import AlbumDetailPage from "./pages/AlbumDetailPage.jsx";
import SinglesPage from "./pages/SinglesPage.jsx";
import LyricsPage from "./pages/LyricsPage.jsx";
import SongDetailPage from "./pages/SongDetailPage.jsx";
import SingPage from "./pages/SingPage.jsx";
import DecodePage from "./pages/DecodePage.jsx";
import ExplorePage from "./pages/ExplorePage.jsx";
import FavoritesPage from "./pages/FavoritesPage.jsx";
import ArtistPage from "./pages/ArtistPage.jsx";
import OfflinePage from "./pages/OfflinePage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

import StudioLayout from "./pages/studio/StudioLayout.jsx";
import LoginPage from "./pages/studio/LoginPage.jsx";
import OverviewPage from "./pages/studio/OverviewPage.jsx";
import AlbumsAdminPage from "./pages/studio/AlbumsAdminPage.jsx";
import SongsAdminPage from "./pages/studio/SongsAdminPage.jsx";
import LyricsAdminPage from "./pages/studio/LyricsAdminPage.jsx";
import DecodeAdminPage from "./pages/studio/DecodeAdminPage.jsx";
import MediaAdminPage from "./pages/studio/MediaAdminPage.jsx";
import SettingsAdminPage from "./pages/studio/SettingsAdminPage.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="music" element={<MusicPage />} />
          <Route path="albums" element={<AlbumsPage />} />
          <Route path="albums/:slug" element={<AlbumDetailPage />} />
          <Route path="singles" element={<SinglesPage />} />
          <Route path="lyrics" element={<LyricsPage />} />
          <Route path="songs/:slug" element={<SongDetailPage />} />
          <Route path="sing" element={<SingPage />} />
          <Route path="decode" element={<DecodePage />} />
          <Route path="explore" element={<ExplorePage />} />
          <Route path="favorites" element={<FavoritesPage />} />
          <Route path="artist" element={<ArtistPage />} />
          <Route path="offline" element={<OfflinePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route path="/studio/login" element={<LoginPage />} />
        <Route
          path="/studio"
          element={
            <RequireAuth>
              <StudioLayout />
            </RequireAuth>
          }
        >
          <Route index element={<OverviewPage />} />
          <Route path="albums" element={<AlbumsAdminPage />} />
          <Route path="songs" element={<SongsAdminPage />} />
          <Route path="lyrics" element={<LyricsAdminPage />} />
          <Route path="decode" element={<DecodeAdminPage />} />
          <Route path="media" element={<MediaAdminPage />} />
          <Route path="settings" element={<SettingsAdminPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <OfflineProvider>
          <AuthProvider>
            <ContentProvider>
              <FavoritesProvider>
                <PlayerProvider>
                  <App />
                </PlayerProvider>
              </FavoritesProvider>
            </ContentProvider>
          </AuthProvider>
        </OfflineProvider>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);

// The offline shell (/sw.js) is registered by OfflineProvider.
