// PathScribe — DemoDisplayTokensCard (Batch 747, Pete's seed row S8, Video 6)
// Configuration → Demo Reset → Testing & Demo Tools: issues the wall display and OR Suite tokens the demo needs after a
// Full Reset and shows them once (services/demoReset/demoDisplayTokens.ts decides and enforces; this only renders).
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authorizationService, auditService, displayAccessService, displayProfileService, orSuiteTerminalService } from '@/services/index';
import { issueDemoDisplayTokens, type DemoDisplayToken } from '@/services/demoReset/demoDisplayTokens';
import { useAuth } from '@/contexts/AuthContext';
import './DemoDisplayTokensCard.css';

const DemoDisplayTokensCard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tokens, setTokens] = useState<DemoDisplayToken[] | null>(null);
  const [problem, setProblem] = useState<'notPermitted' | 'issueFailed' | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const issue = async () => {
    setBusy(true);
    const res = await issueDemoDisplayTokens({
      authorization: authorizationService, displayAccess: displayAccessService, profiles: displayProfileService,
      terminals: orSuiteTerminalService, audit: auditService, user: user?.name ?? 'unknown',
    });
    setBusy(false);
    if (res.ok) { setTokens(res.tokens); setProblem(null); } else { setTokens(null); setProblem(res.reason); }
  };
  const copy = (token: string) => {
    void navigator.clipboard?.writeText(token).then(() => setCopied(token), () => setCopied(null));
  };

  return (
    <div className="comp-reset-card">
      <div className="ps-demoreset__card-row">
        <div>
          <div className="comp-reset-card-title">{t('demoResetTab.testingTools.displayTokensTitle')}</div>
          <div className="comp-reset-card-desc">{t('demoResetTab.testingTools.displayTokensDescription')}</div>
        </div>
        <button className="ps-conf-btn-secondary ps-demoreset__btn--nowrap" onClick={issue} disabled={busy}>
          🖥️ {t('demoResetTab.testingTools.issueTokensBtn')}
        </button>
      </div>
      {problem && <p role="alert" className="ps-demoreset__confirm-warning">{t(`demoResetTab.testingTools.tokens.${problem}`)}</p>}
      {tokens && (
        <>
          <p className="ps-demoreset__result-desc">{t('demoResetTab.testingTools.tokens.shownOnce')}</p>
          <table className="ps-demoreset__token-table">
            <thead>
              <tr>
                <th>{t('demoResetTab.testingTools.tokens.display')}</th>
                <th>{t('demoResetTab.testingTools.tokens.use')}</th>
                <th>{t('demoResetTab.testingTools.tokens.token')}</th>
                <th aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {tokens.map(tk => (
                <tr key={tk.subjectId}>
                  <td>{tk.name}</td>
                  <td>{t(`demoResetTab.testingTools.tokens.uses.${tk.use}`)}</td>
                  <td><code className="ps-demoreset__token">{tk.token}</code></td>
                  <td>
                    <button className="ps-btn-small" onClick={() => copy(tk.token)}>
                      {copied === tk.token ? t('demoResetTab.testingTools.tokens.copied') : t('demoResetTab.testingTools.tokens.copy')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

export default DemoDisplayTokensCard;
