import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';

export default function Features() {
  return (
    <div>
      <Navigation />
      <div style={{ padding: '80px 0', minHeight: '60vh' }}>
        <div className="container">
          <h1 style={{ fontSize: '48px', marginBottom: '24px' }}>Features</h1>
          <p style={{ fontSize: '18px', color: '#42526e' }}>
            Discover all the powerful features that make TaskRythm the best project management tool.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}