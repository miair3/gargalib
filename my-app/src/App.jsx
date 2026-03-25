import { BrowserRouter, Routes, Route } from "react-router-dom";
import { getStorage } from "./storage";

import HomeLogin from "./pages/HomeLogin";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Home from "./pages/Home";
import AnimePage from "./pages/AnimePage";
import AnimesPage from "./pages/AnimesPage";
import Upload from "./pages/Upload";
import AddEpisode from "./pages/AddEpisode";
import ChatPage from "./pages/ChatPage";

import AdminPanel from "./components/AdminPanel";
import ProtectedRoute from "./components/ProtectedRoute";
import Header from "./components/Header";
import BannedScreen from "./components/BannedScreen";

export default function App() {
  const currentUser = getStorage("currentUser", null);
  const reason = currentUser?.banReason || "Без причины";
  const until = currentUser?.banUntil || null;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeLogin />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/banned"
          element={<BannedScreen reason={reason} until={until} />}
        />

        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Header>
                <Home />
              </Header>
            </ProtectedRoute>
          }
        />

        <Route
          path="/animes"
          element={
            <ProtectedRoute>
              <Header>
                <AnimesPage />
              </Header>
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Header>
                <Profile />
              </Header>
            </ProtectedRoute>
          }
        />

        <Route
          path="/user/:id"
          element={
            <ProtectedRoute>
              <Header>
                <UserProfile />
              </Header>
            </ProtectedRoute>
          }
        />

        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Header>
                <ChatPage />
              </Header>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Header>
                <Dashboard />
              </Header>
            </ProtectedRoute>
          }
        />

        <Route
          path="/anime/:id"
          element={
            <ProtectedRoute>
              <Header>
                <AnimePage />
              </Header>
            </ProtectedRoute>
          }
        />

        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <Header>
                <Upload />
              </Header>
            </ProtectedRoute>
          }
        />

        <Route
          path="/add-episode/:id"
          element={
            <ProtectedRoute>
              <Header>
                <AddEpisode />
              </Header>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Header>
                <AdminPanel />
              </Header>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}