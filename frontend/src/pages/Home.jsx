import { Link } from "react-router-dom";

const Home = () => {
  return (
    <section style={{ padding: "80px 40px", textAlign: "center" }}>
      <h1>Track Your Money. Build Your Future.</h1>
      <p style={{ marginTop: "16px", color: "#555" }}>
        DhanaSethu helps you track daily expenses, cash & bank balance, and
        gives powerful monthly analytics.
      </p>

      <div style={{ marginTop: "32px" }}>
        <Link to="/login">
          <button style={{ padding: "12px 24px", marginRight: "12px" }}>
            Get Started
          </button>
        </Link>
        <button style={{ padding: "12px 24px" }}>Learn More</button>
      </div>
    </section>
  );
};

export default Home;
