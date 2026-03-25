const Dashboard = () => {
  const user = JSON.parse(localStorage.getItem("currentUser"));

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("currentUser");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white bg-black">
      <h1 className="text-3xl mb-4">
        Добро пожаловать, {user?.username} 😏
      </h1>

      <button
        onClick={logout}
        className="px-6 py-3 bg-red-500 rounded-xl hover:scale-105 transition"
      >
        Выйти
      </button>
    </div>
  );
};

export default Dashboard;