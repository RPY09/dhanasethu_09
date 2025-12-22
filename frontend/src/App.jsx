import Navbar from "./components/layout/Navbar";
import AppRoutes from "./routes/AppRoutes";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  console.log("App rendered");

  return (
    <>
      <Navbar />
      <AppRoutes />
    </>
  );
}

export default App;
