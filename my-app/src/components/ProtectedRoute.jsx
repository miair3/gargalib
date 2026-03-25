import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

const API_BASE = "http://localhost:5000";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [banned, setBanned] = useState(false);

  const getStoredUser = () => {
    try {
      return JSON.parse(localStorage.getItem("currentUser"));
    } catch {
      return null;
    }
  };

  const getBanInfo = (user) => {
    if (!user) return { banned: false };

    const bannedFlag =
      user.isBanned === true ||
      Boolean(user.banUntil) ||
      Boolean(user.banned_until);

    if (!bannedFlag) {
      return { banned: false };
    }

    const until = user.banUntil || user.banned_until || null;

    if (!until) {
      return {
        banned: true,
        reason: user.banReason || user.ban_reason || "Без причины",
        until: null,
      };
    }

    const banEnd = new Date(until).getTime();

    if (Number.isNaN(banEnd)) {
      return {
        banned: true,
        reason: user.banReason || user.ban_reason || "Без причины",
        until,
      };
    }

    if (Date.now() >= banEnd) {
      return { banned: false, expired: true };
    }

    return {
      banned: true,
      reason: user.banReason || user.ban_reason || "Без причины",
      until,
    };
  };

  useEffect(() => {
    const checkAccess = async () => {
      if (!token) {
        setAllowed(false);
        setBanned(false);
        setChecking(false);
        return;
      }

      const storedUser = getStoredUser();

      if (!storedUser) {
        setAllowed(false);
        setBanned(false);
        setChecking(false);
        return;
      }

      try {
        const userId = storedUser.id || storedUser._id;

        if (!userId) {
          localStorage.removeItem("token");
          localStorage.removeItem("currentUser");
          setAllowed(false);
          setBanned(false);
          setChecking(false);
          return;
        }

        const onlineRes = await fetch(`${API_BASE}/api/users/online`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId }),
        });

        if (!onlineRes.ok) {
          console.log("ONLINE STATUS UPDATE ERROR");
        }

        const res = await fetch(`${API_BASE}/api/users/${userId}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          localStorage.removeItem("token");
          localStorage.removeItem("currentUser");
          setAllowed(false);
          setBanned(false);
          setChecking(false);
          return;
        }

        const freshUser = await res.json();

        const normalizedUser = {
          ...freshUser,
          id: freshUser.id || freshUser._id,
          isBanned:
            freshUser.isBanned === true ||
            Boolean(freshUser.banUntil) ||
            Boolean(freshUser.banned_until),
          banUntil: freshUser.banUntil || freshUser.banned_until || null,
          banReason: freshUser.banReason || freshUser.ban_reason || "",
        };

        const banInfo = getBanInfo(normalizedUser);

        if (banInfo.expired) {
          const clearedUser = {
            ...normalizedUser,
            isBanned: false,
            banUntil: null,
            banned_until: null,
            banReason: "",
            ban_reason: "",
          };

          localStorage.setItem("currentUser", JSON.stringify(clearedUser));
          window.dispatchEvent(new Event("userChanged"));

          setAllowed(true);
          setBanned(false);
          setChecking(false);
          return;
        }

        localStorage.setItem("currentUser", JSON.stringify(normalizedUser));
        window.dispatchEvent(new Event("userChanged"));

        if (banInfo.banned) {
          setAllowed(false);
          setBanned(true);
          setChecking(false);
          return;
        }

        setAllowed(true);
        setBanned(false);
        setChecking(false);
      } catch (err) {
        console.log("PROTECTED ROUTE ERROR:", err);
        setAllowed(false);
        setBanned(false);
        setChecking(false);
      }
    };

    checkAccess();
  }, [token]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#070b18] via-[#151a3d] to-[#3a0f5d] text-white">
        <div className="rounded-3xl border border-white/10 bg-white/10 px-8 py-5 backdrop-blur-xl">
          Проверка доступа...
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (banned) {
    return <Navigate to="/banned" replace />;
  }

  if (!allowed) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;