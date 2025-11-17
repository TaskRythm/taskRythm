export default function FeaturesSection() {
  const features = [
    {
      icon: '📊',
      title: 'Advanced Reporting',
      description: 'Get real-time insights into your team\'s performance with customizable dashboards.'
    },
    {
      icon: '🔗',
      title: 'Seamless Integration',
      description: 'Connect with your favorite tools and streamline your workflow.'
    },
    {
      icon: '⚡',
      title: 'Lightning Fast',
      description: 'Built for speed and performance, even with your largest projects.'
    },
    {
      icon: '🔒',
      title: 'Enterprise Security',
      description: 'Bank-level security to keep your data safe and compliant.'
    },
    {
      icon: '👥',
      title: 'Team Collaboration',
      description: 'Work together seamlessly with built-in communication tools.'
    },
    {
      icon: '📱',
      title: 'Mobile Ready',
      description: 'Manage your projects on the go with our mobile app.'
    }
  ];

  return (
    <section style={{ padding: '80px 0', background: '#f4f5f7' }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 style={{ 
            fontSize: '48px', 
            fontWeight: '600',
            marginBottom: '16px'
          }}>
            Everything your team needs
          </h2>
          <p style={{ 
            fontSize: '20px', 
            color: '#42526e',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            From agile boards to advanced reporting, TaskRythm has all the tools your team needs to succeed.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '32px'
        }}>
          {features.map((feature, index) => (
            <div key={index} style={{
              background: 'white',
              padding: '32px',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: '48px', 
                marginBottom: '16px' 
              }}>
                {feature.icon}
              </div>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: '600',
                marginBottom: '12px'
              }}>
                {feature.title}
              </h3>
              <p style={{ 
                color: '#42526e',
                lineHeight: '1.6'
              }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}