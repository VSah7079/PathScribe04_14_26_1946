import { useState, useEffect } from 'react';
import '../pathscribe.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@contexts/AuthContext";
import { useLogout } from '@hooks/useLogout';
import { WarningIcon } from '../components/Icons';
import CaseSearchBar from '../components/Search/CaseSearchBar';

export default function Home() {
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const handleLogout = useLogout();

  const [hoveredCard, setHoveredCard]       = useState<number | null>(null);
  const [isLoaded, setIsLoaded]             = useState(false);
  const [showWarning, setShowWarning]       = useState(false);
  const [showAbout, setShowAbout]           = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const cards = [
    { title: 'Worklist',       description: 'View and manage pending pathology cases',  route: '/worklist',      color: '#0891B2', image: '/worklist.webp' },
    { title: 'Configuration',  description: 'System settings and AI preferences',       route: '/configuration', color: '#F59E0B', image: '/config.webp' },
    { title: 'Search',         description: 'Search completed and in-progress cases',   route: '/search',        color: '#8B5CF6', image: '/search.webp' },
    { title: 'System Audit',   description: 'Review system activity and audit trails',  route: '/audit',         color: '#EF4444', image: '/logs.webp' },
    { title: 'My Contribution',description: 'Workload • Quality • TAT • Trends',        route: '/contribution',  color: '#0EA5E9', image: '/my_contributions.webp' },
  ];

  return (
    <div className="ps-page"
      style={{ backgroundColor: 'var(--bg-color, #000)', color: 'var(--text-color, #fff)',
               opacity: isLoaded ? 1 : 0, transition: 'opacity 0.8s ease' }}>

      {/* Background layers */}
      <div className="ps-page-bg"
        style={{ backgroundImage: 'url(/main_background.webp)', filter: 'var(--bg-filter, brightness(0.4))' }} />
      <div className="ps-page-gradient" />

      {/* Content */}
      <div className="ps-page-content">

        {/* Search strip */}
        <div className="ps-search-strip">
          <CaseSearchBar />
        </div>

        {/* Hero + Cards */}
        <main className="ps-home-main">
          <header className="ps-home-hero">
            <h1 className="ps-home-title">
              Welcome back,&nbsp;
              <span style={{ color: '#0891B2' }}>
                {user?.name ? user.name.split(',')[0] : 'Doctor'}
              </span>
              {(user as any)?.credentials && (
                <span style={{ fontWeight: 400, color: 'var(--text-secondary, #94a3b8)', marginLeft: 8, fontSize: '0.6em' }}>
                  {(user as any).credentials}
                </span>
              )}
            </h1>
            <p className="ps-home-subtitle">
              The AI models are updated and synchronized with the latest CAP protocols.
            </p>
          </header>

          <div className="ps-home-grid">
            {cards.map((card, index) => (
              <div
                key={card.title}
                className="ps-home-card"
                onClick={() => navigate(card.route)}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  border:     hoveredCard === index ? `2px solid ${card.color}` : '1px solid var(--border-color, rgba(255,255,255,0.1))',
                  boxShadow:  hoveredCard === index ? `0 8px 24px rgba(0,0,0,0.3), 0 0 0 1px ${card.color}40` : '0 2px 8px rgba(0,0,0,0.1)',
                }}
              >
                {card.image && (
                  <div className="ps-home-card-bg"
                    style={{ backgroundImage: `url(${card.image})` }} />
                )}
                <div className="ps-home-card-overlay" />
                <div className="ps-home-card-content">
                  <h3 className="ps-home-card-title">{card.title}</h3>
                  <p className="ps-home-card-desc">{card.description}</p>
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Footer */}
        <footer className="ps-home-footer">
          <div>© 2026 ForMedrix AI Systems • HIPAA Compliant</div>
          <div className="ps-home-footer-right">
            <span className="ps-home-status-dot" />
            <span>All systems operational</span>
            <span style={{ marginLeft: 16, cursor: 'pointer', color: '#94a3b8' }}
              onClick={() => setShowAbout(true)}>
              About
            </span>
          </div>
        </footer>
      </div>

      {/* Warning Modal */}
      {showWarning && (
        <div className="ps-overlay" onClick={() => setShowWarning(false)}>
          <div className="ps-modal ps-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="ps-modal-header" style={{ justifyContent: 'center' }}>
              <WarningIcon color="#F59E0B" />
            </div>
            <div className="ps-modal-body" style={{ textAlign: 'center' }}>
              <div className="ps-modal-title">Unsaved Data</div>
              <p className="ps-modal-subtitle" style={{ marginTop: 8 }}>
                You have an active session with unsaved changes. Logging out now will discard your current progress.
              </p>
            </div>
            <div className="ps-modal-footer" style={{ flexDirection: 'column', gap: 10 }}>
              <button className="ps-btn-primary" style={{ width: '100%' }}
                onClick={() => setShowWarning(false)} autoFocus>
                ← Return to Page
              </button>
              <button className="ps-btn-secondary" style={{ width: '100%', borderColor: '#F59E0B', color: '#F59E0B' }}
                onClick={handleLogout}>
                Log Out &amp; Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About Modal */}
      {showAbout && (
        <div className="ps-overlay" onClick={() => setShowAbout(false)}>
          <div className="ps-modal ps-modal-sm" onClick={e => e.stopPropagation()}
            style={{ textAlign: 'center' }}>
            <div className="ps-modal-body">
              <div className="ps-modal-title" style={{ fontSize: 28, marginBottom: 12 }}>
                PathScribe<span style={{ color: '#0891B2', fontSize: '0.5em', verticalAlign: 'super' }}>AI</span>
              </div>
              <p className="ps-modal-subtitle">v0.9.0 · © 2026 ForMedrix AI Systems</p>
              <p className="ps-modal-subtitle" style={{ marginTop: 6 }}>Developed by the ForMedrix AI Team</p>
            </div>
            <div className="ps-modal-footer" style={{ justifyContent: 'center' }}>
              <button className="ps-btn-secondary" onClick={() => setShowAbout(false)} autoFocus>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
