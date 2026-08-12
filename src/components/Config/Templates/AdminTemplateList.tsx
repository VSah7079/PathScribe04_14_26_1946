import React from "react";
import '../../../pathscribe.css';
import { useNavigate } from "react-router-dom";

<<<<<<< HEAD
type Template = {
  id: string;
  name: string;
  version: string;
  status: string;
};

const mockTemplates: Template[] = [
  {
    id: "breast_dcis_resection",
    name: "Breast DCIS – Resection",
    version: "4.4.0.0",
    status: "staged",
  },
=======
type Template = { id: string; name: string; version: string; status: string; };

const mockTemplates: Template[] = [
  { id: "generic_test_basic", name: "Generic Synoptic Test Form — Basic", version: "1.0", status: "staged" },
>>>>>>> upstream/main
];

export const AdminTemplateList: React.FC = () => {
  const navigate = useNavigate();
<<<<<<< HEAD

  return (
    <div style={{ padding: 24 }}>
      <h1>Template Review Queue</h1>

      {mockTemplates.map((t) => (
        <div
          key={t.id}
          style={{
            border: "1px solid #ccc",
            padding: 12,
            marginBottom: 12,
            cursor: "pointer",
            borderRadius: 6,
          }}
          onClick={() => navigate(`/template-review/${t.id}`)}
        >
          <div style={{ fontWeight: 600, fontSize: 18 }}>{t.name}</div>
          <div>Version: {t.version}</div>
          <div>Status: {t.status}</div>
=======
  return (
    <div className="ps-tmpl-list-wrap">
      <h1>Template Review Queue</h1>
      {mockTemplates.map(t => (
        <div key={t.id} className="ps-tmpl-list-card" onClick={() => navigate(`/template-review/${t.id}`)}>
          <div className="ps-tmpl-list-card-name">{t.name}</div>
          <div className="ps-tmpl-list-card-meta">Version: {t.version}</div>
          <div className="ps-tmpl-list-card-meta">Status: {t.status}</div>
>>>>>>> upstream/main
        </div>
      ))}
    </div>
  );
};
