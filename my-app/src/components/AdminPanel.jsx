import { useEffect, useState } from "react";

const AdminPanel = ({ user }) => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch("https://gargalib-backend.onrender.com/api/users")
      .then(res => res.json())
      .then(data => setUsers(data));
  }, []);

  const makeAdmin = async (id) => {
    await fetch("https://gargalib-backend.onrender.com/api/make-admin", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        ownerId: user.id,
      }),
    });

    alert("Назначен админом");
  };

  const removeAdmin = async (id) => {
    await fetch("https://gargalib-backend.onrender.com/api/remove-admin", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        ownerId: user.id,
      }),
    });

    alert("Удалён админ");
  };

  return (
    <div className="space-y-4">
      {users.map((u) => (
        <div
          key={u.id}
          className="flex justify-between items-center bg-white/10 p-4 rounded-xl"
        >
          <div>
            <p>{u.username}</p>
            <p className="text-xs text-gray-400">{u.role}</p>
          </div>

          <div className="flex gap-2">
            {u.role !== "admin" && (
              <button
                onClick={() => makeAdmin(u.id)}
                className="bg-green-500 px-3 py-1 rounded"
              >
                Сделать админом
              </button>
            )}

            {u.role === "admin" && (
              <button
                onClick={() => removeAdmin(u.id)}
                className="bg-red-500 px-3 py-1 rounded"
              >
                Убрать
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminPanel;