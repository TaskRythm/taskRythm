import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';

export default function Resources() {
  return (
    <div>
      <Navigation />
      <div style={{ padding: '80px 0', minHeight: '60vh' }}>
        <div className="container">
          <h1 style={{ fontSize: '48px', marginBottom: '24px' }}>Resources</h1>
          <p style={{ fontSize: '18px', color: '#42526e' }}>
            Helpful resources to get the most out of TaskRythm.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}