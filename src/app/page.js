import Link from 'next/link';

export default function Home() {
  return (
    <div className="container" style={{ marginTop: '4rem', maxWidth: '960px' }}>
      
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <p style={{ color: 'var(--accent-cyan)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
          Kautz-Uible Economics Institute · Agentic AI Challenge
        </p>
        <h1 style={{ marginBottom: '1rem' }}>AI-Powered Market Analysis Tool</h1>
        <p style={{ fontSize: '1.1rem', maxWidth: '650px', margin: '0 auto 2rem auto', lineHeight: 1.7 }}>
          Praxis Economics synthesizes autonomous research domains — from macroeconomic data 
          to competitor reviews — into a structured market viability report for <strong style={{ color: 'var(--text-primary)' }}>small businesses</strong>.
        </p>
        <Link href="/simulate" className="btn-primary" style={{ fontSize: '1.05rem', padding: '0.85rem 2.5rem' }}>
          Start Your Analysis →
        </Link>
      </div>

      {/* Economic Rationale */}
      <section className="glass-panel" style={{ marginBottom: '1.5rem' }}>
        <h2>Economic Rationale</h2>
        <div className="section-divider" style={{ margin: '0.75rem 0 1rem 0' }}></div>
        <p style={{ lineHeight: 1.8, marginBottom: '1rem' }}>
          Every small business owner faces the same fundamental economic challenge: balancing 
          <strong style={{ color: 'var(--text-primary)' }}> macroeconomic realities</strong> with 
          <strong style={{ color: 'var(--text-primary)' }}> hyper-local microeconomic conditions</strong>. 
          Whether you run a coffee shop, a boutique, a salon, or a restaurant, your pricing must account for 
          neighborhood demographics, competitor behavior, supply chain costs, and brand perception simultaneously.
        </p>
        <p style={{ lineHeight: 1.8 }}>
          Traditional pricing relies on gut instinct or simple cost-plus models. Praxis Economics applies 
          <strong style={{ color: 'var(--text-primary)' }}> Hedonic Pricing Theory</strong>, 
          <strong style={{ color: 'var(--text-primary)' }}> Hotelling's Spatial Competition</strong>, and 
          <strong style={{ color: 'var(--text-primary)' }}> dynamic Price Elasticity of Demand</strong> to 
          generate pricing models based on available data and economic frameworks.
        </p>
      </section>

      {/* How It Works */}
      <section className="glass-panel" style={{ marginBottom: '1.5rem' }}>
        <h2>How It Works</h2>
        <div className="section-divider" style={{ margin: '0.75rem 0 1rem 0' }}></div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
          {[
            { num: '1', title: 'Upload & Share', desc: 'Upload photos of your business, products, or branding. Optionally attach sales spreadsheets or financial records.' },
            { num: '2', title: 'Needfinding Interview', desc: 'Have a natural conversation with our AI consultant. It asks targeted questions to understand your business, market, and what specific decision you need help with.' },
            { num: '3', title: 'Autonomous Research', desc: 'Specialized modules search the web, analyze your data, and review the market while providing progress updates.' },
            { num: '4', title: 'Strategy Report + Q&A', desc: 'Receive a structured, sourced report. Ask follow-up questions — the system can process additional requests. Q&A is appended to the deliverable.' },
          ].map((s) => (
            <div key={s.num} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>{s.num}</div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>{s.title}</h3>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>8 Research Domains</h3>
        <div className="grid grid-cols-2" style={{ gap: '0.75rem' }}>
          {[
            { title: 'Brand & Aesthetics', desc: 'Visual analysis + hedonic pricing benchmarks for willingness-to-pay.' },
            { title: 'Local Demographics', desc: 'Census data for income, neighborhood profiles, and demographic segments.' },
            { title: 'Internal Data Analytics', desc: 'Data processing against uploaded/simulated databases.' },
            { title: 'Social Sentiment', desc: 'Review aggregation from various public platforms.' },
            { title: 'Macroeconomic Tracking', desc: 'Fed Funds Rate, CPI, consumer spending from FRED.' },
            { title: 'Supply Chain Costs', desc: 'Industry-specific commodity and wholesale cost analysis.' },
            { title: 'Urban Mobility', desc: 'Walk Score, transit, and nearby anchor analysis.' },
            { title: 'Competitive Intelligence', desc: 'Competitor mapping with prices, reviews, and SWOT analysis.' },
          ].map((item, i) => (
            <div key={i} className="feature-card">
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Key Differentiators */}
      <section className="glass-panel" style={{ marginBottom: '1.5rem' }}>
        <h2>Key Differentiators</h2>
        <div className="section-divider" style={{ margin: '0.75rem 0 1rem 0' }}></div>
        <ul style={{ lineHeight: 2, paddingLeft: '1.25rem' }}>
          <li><strong style={{ color: 'var(--text-primary)' }}>Iterative Needfinding:</strong> Instead of filling out a form, you have a real conversation. The system adapts its research based on your specific situation.</li>
          <li><strong style={{ color: 'var(--text-primary)' }}>Spatial Mismatch Detection:</strong> The system checks if your brand positioning is economically compatible with the local area before pricing.</li>
          <li><strong style={{ color: 'var(--text-primary)' }}>Code Execution:</strong> Writes and runs live scripts to parse transaction records for real Price Elasticity calculations.</li>
          <li><strong style={{ color: 'var(--text-primary)' }}>Every Claim Is Sourced:</strong> Each module returns URLs alongside findings. The report includes a full methodology appendix.</li>
          <li><strong style={{ color: 'var(--text-primary)' }}>Works for Any Business:</strong> Coffee shops, salons, boutiques, restaurants, auto shops — the platform adapts its research to your industry.</li>
        </ul>
      </section>

      <div style={{ textAlign: 'center', margin: '3rem 0 4rem 0' }}>
        <Link href="/simulate" className="btn-primary" style={{ padding: '0.85rem 2.5rem' }}>
          Try It Now →
        </Link>
      </div>
    </div>
  );
}
