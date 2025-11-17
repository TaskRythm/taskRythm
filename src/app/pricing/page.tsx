import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';

export default function Pricing() {
  return (
    <div>
      <Navigation />
      <div style={{ padding: '80px 0', minHeight: '60vh' }}>
        <div className="container">
          <h1 style={{ fontSize: '48px', marginBottom: '24px' }}>Pricing</h1>
          <p style={{ fontSize: '18px', color: '#42526e' }}>
            Choose the plan that works best for your team.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}