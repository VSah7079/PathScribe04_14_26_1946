// src/pages/PathologyWorkspacePage/PathologyWorkspacePage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// "Homepage Changes part 1" — direct request: "Create Pathology Workspace
// Tile on Home page and move the following into that: Cytology Workspace,
// Microtome Workstation - also rename Microtome Workspace, Embedding
// Station - also rename Embedding Workspace, Slide Distribution Station -
// rename Slide Distribution Workspace." This page is the real destination
// behind Home's new "Pathology Workspace" tile — a small, second-level hub
// grouping the four sub-workspaces the direct request named, rather than
// each one sitting as its own flat top-level Home tile.
//
// Real, direct follow-up (Sep 2026): a fifth tile, "Molecular Workspace"
// (renamed from the former standalone "Molecular" Home tile, same real
// /molecular route into MolecularWorkcenterPage.tsx, itself renamed from
// "Molecular Workcenter" to match), was added here too. Per direct
// guidance, this hub groups by domain ("pathology"), not by shared
// audience — Molecular Workspace's own molecular-tech bench workflow is
// genuinely distinct from the other four tiles' histology-bench/
// cytology-screening audiences, same as Cytology and Microtome already
// not sharing an audience within this same hub. Molecular Order Queue
// (a separate, deliberately-unmerged page — see services/molecularOrders/
// README.md) stays on Home, untouched — only "Molecular" itself moved.
//
// Deliberately reuses Home.tsx's own .ps-home-cards-grid/.ps-home-card
// visual language (same background image treatment, same keyboard
// accessibility — role="button"/tabIndex/onKeyDown — same hover-accent
// custom properties) rather than inventing a second card style, since
// these are literally the same four tiles relocated one level deeper, not
// a new kind of UI. Colors are the same ones each tile already carried on
// Home — no collision risk moving here, since Home's own regression guard
// (Home.test.tsx) only ever checked uniqueness among Home's own tiles.
//
// Built with i18n from the start (own "pathologyWorkspace" namespace,
// EN/FR/DE/NL/KO), per this repo's own standing i18n/README.md rule ("any
// new page or modal must not ship with hardcoded, user-facing strings") —
// even though the Cytology Workspace tile's own title/description were
// never i18n-converted on Home.tsx itself, this is genuinely new page
// content, not a copy-paste of the old hardcoded strings.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import '../../pathscribe.css';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { visibleTiles, type ScreenId } from '@/services/screens/screenAccess';
import { useCapabilities } from '@/hooks/useCapabilities';

interface SubTile {
  key: string;
  /** Batch 374: the screen it opens; shown only if the user may open it. */
  screen: ScreenId;
  title: string;
  description: string;
  route: string;
  color: string;
  image: string;
}

export default function PathologyWorkspacePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pushCrumb } = useBreadcrumb();

  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => { pushCrumb(t('pathologyWorkspace.pageTitle'), '/pathology-workspace'); }, [pushCrumb, t]);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => { clearTimeout(timer); };
  }, []);

  // Real, same colors each tile already carried as a flat Home tile —
  // see this file's own header for why no re-verification was needed.
  const capabilities = useCapabilities();
  const allTiles: SubTile[] = [
    // Batch 720 (Pete): Grossing runs on its own, here, for the PA and the grossing pathologist.
    {
      key: 'grossing',
      screen: 'grossing',
      title: t('pathologyWorkspace.grossingTile.title'),
      description: t('pathologyWorkspace.grossingTile.description'),
      route: '/workstations/grossing',
      color: '#E11D48',
      image: '/grossing.webp',
    },
    // Batch 720 (Pete): the Add-On Order Builder is a tile here too, so a PA or pathologist can place an order without opening a report first.
    {
      key: 'addOnOrders',
      screen: 'addOnOrders',
      title: t('pathologyWorkspace.addOnOrdersTile.title'),
      description: t('pathologyWorkspace.addOnOrdersTile.description'),
      route: '/add-on-orders',
      color: '#0EA5E9',
      image: '/add_on_orders.webp',
    },
    // Batch 721 (Pete, Oct 28): back under Pathology Workspace, beside Grossing and Add-On Orders, so a pathologist reaches it without a
    // Quality & Compliance tile on Home. No dedicated photo yet: reuses /deficiencies.webp (a disclosed placeholder).
    {
      key: 'marginExceptionReview',
      screen: 'marginExceptionReview',
      title: t('pathologyWorkspace.marginExceptionReviewTile.title'),
      description: t('pathologyWorkspace.marginExceptionReviewTile.description'),
      route: '/margin-exception-review',
      color: '#DC2626',
      image: '/deficiencies.webp',
    },
    {
      key: 'cytology',
      screen: 'cytologyWorkspace',
      title: t('pathologyWorkspace.cytologyTile.title'),
      description: t('pathologyWorkspace.cytologyTile.description'),
      route: '/cytology-worklist',
      color: '#009E73',
      image: '/cytology.webp',
    },
    // Batch 740 (fluid decision 1): fluids are prepared here; only a handed-off cell block goes to the Microtome.
    // No dedicated photo yet: reuses /cytology.webp (a disclosed placeholder).
    {
      key: 'cytologyPrep',
      screen: 'cytologyPrep',
      title: t('pathologyWorkspace.cytologyPrepTile.title'),
      description: t('pathologyWorkspace.cytologyPrepTile.description'),
      route: '/workstations/cytology-prep',
      color: '#0EA5A4',
      image: '/cytology.webp',
    },
    {
      key: 'microtomy',
      screen: 'microtomy',
      title: t('pathologyWorkspace.microtomyTile.title'),
      description: t('pathologyWorkspace.microtomyTile.description'),
      route: '/workstations/microtomy',
      color: '#56B4E9',
      image: '/microtomy.webp',
    },
    {
      key: 'embedding',
      screen: 'embedding',
      title: t('pathologyWorkspace.embeddingTile.title'),
      description: t('pathologyWorkspace.embeddingTile.description'),
      route: '/workstations/embedding',
      color: '#F97316',
      // Batch 484 (tracker Section B, "Case tile photo"): this tile was
      // still borrowing Worklist's image — the Sep 2026 tile-image
      // refresh gave Cytology/Microtomy/Slide Distribution/Molecular
      // their own real photo but missed this one (the referenced
      // UPDATE_288_SUMMARY.md doesn't exist in this repo — standing rule
      // #6, verify before repeating a claim). public/embedding.webp is a
      // locally generated placeholder (a paraffin-mold motif in this
      // tile's own #F97316), not a sourced photograph — swap in a real
      // one when photography is available.
      image: '/embedding.webp',
    },
    {
      key: 'slideDistribution',
      screen: 'slideDistribution',
      title: t('pathologyWorkspace.slideDistributionTile.title'),
      description: t('pathologyWorkspace.slideDistributionTile.description'),
      route: '/workstations/slide-distribution',
      color: '#14B8A6',
      image: '/slide_distribution.webp',
    },
    {
      key: 'molecular',
      screen: 'molecular',
      title: t('pathologyWorkspace.molecularTile.title'),
      description: t('pathologyWorkspace.molecularTile.description'),
      route: '/molecular',
      color: '#7C3AED',
      image: '/molecular.webp',
    },
    // Batch 375 (Pete): Batch Management moved here from the Home page.
    {
      key: 'batchManagement',
      screen: 'batchManagement',
      title: t('pathologyWorkspace.batchManagementTile.title'),
      description: t('pathologyWorkspace.batchManagementTile.description'),
      route: '/batch-management',
      color: '#D4A017',
      image: '/batch_management.webp',
    },
  ];
  // Batch 374: only the screens this user may open (services/screens/screenAccess.ts).
  const shown = new Set(visibleTiles(allTiles.map(x => x.screen), c => capabilities.has(c)));
  const tiles = allTiles.filter(x => shown.has(x.screen));

  return (
    <div className={`ps-page${isLoaded ? ' ps-page--loaded' : ''}`}>
      {/* Background — same treatment as Home.tsx */}
      <div className="ps-page-bg" />
      <div className="ps-page-gradient" />

      <div className="ps-page-content">
        <main className="ps-home-main">
          <header className="ps-home-header ps-home-header--split">
            <div>
              <h1 className="ps-home-title">{t('pathologyWorkspace.pageTitle')}</h1>
              <p className="ps-home-card-desc ps-mt-4">{t('pathologyWorkspace.pageSubtitle')}</p>
            </div>
            <button
              className="ps-btn-ghost-dark"
              onClick={() => navigate('/')}
            >
              {t('pathologyWorkspace.backToHome')}
            </button>
          </header>

          <div className="ps-home-cards-grid">
            {tiles.map((tile, index) => {
              const hovered = hoveredCard === index;
              return (
                <div
                  key={tile.key}
                  onClick={() => navigate(tile.route)}
                  onMouseEnter={() => setHoveredCard(index)}
                  onMouseLeave={() => setHoveredCard(null)}
                  onFocus={() => setHoveredCard(index)}
                  onBlur={() => setHoveredCard(null)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(tile.route);
                    }
                  }}
                  className={`ps-home-card${hovered ? ' ps-home-card--hovered' : ''}`}
                  style={{ '--card-accent': tile.color } as React.CSSProperties}
                >
                  {tile.image && (
                    <div className="ps-home-card-image" style={{ '--card-image': `url(${tile.image})` } as React.CSSProperties} />
                  )}
                  <div className="ps-home-card-overlay" />
                  <div className="ps-home-card-text">
                    <h3 className="ps-home-card-title">{tile.title}</h3>
                    <p className="ps-home-card-desc">{tile.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
