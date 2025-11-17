export default function Footer() {
  return (
    <footer style={{
      background: '#0747a6',
      color: 'white',
      padding: '60px 0 40px'
    }}>
      <div className="container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '40px',
          marginBottom: '40px'
        }}>
          <div>
            <h3 style={{ marginBottom: '16px' }}>TaskRythm</h3>
            <p style={{ opacity: '0.8' }}>
              The best project management tool for modern teams.
            </p>
          </div>
          
          <div>
            <h4 style={{ marginBottom: '16px' }}>Product</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <a href="#" style={{ color: 'white', opacity: '0.8', textDecoration: 'none' }}>Features</a>
              <a href="#" style={{ color: 'white', opacity: '0.8', textDecoration: 'none' }}>Pricing</a>
              <a href="#" style={{ color: 'white', opacity: '0.8', textDecoration: 'none' }}>Security</a>
            </div>
          </div>

          <div>
            <h4 style={{ marginBottom: '16px' }}>Resources</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <a href="#" style={{ color: 'white', opacity: '0.8', textDecoration: 'none' }}>Documentation</a>
              <a href="#" style={{ color: 'white', opacity: '0.8', textDecoration: 'none' }}>Community</a>
              <a href="#" style={{ color: 'white', opacity: '0.8', textDecoration: 'none' }}>Support</a>
            </div>
          </div>

          <div>
            <h4 style={{ marginBottom: '16px' }}>Company</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <a href="#" style={{ color: 'white', opacity: '0.8', textDecoration: 'none' }}>About</a>
              <a href="#" style={{ color: 'white', opacity: '0.8', textDecoration: 'none' }}>Blog</a>
              <a href="#" style={{ color: 'white', opacity: '0.8', textDecoration: 'none' }}>Careers</a>
            </div>
          </div>
        </div>
        
        <div style={{ 
          borderTop: '1px solid rgba(255,255,255,0.2)',
          paddingTop: '20px',
          textAlign: 'center',
          opacity: '0.8'
        }}>
          <p>&copy; 2025 TaskRythm. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}