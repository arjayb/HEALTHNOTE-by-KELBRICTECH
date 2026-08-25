import React, { useEffect, useState, useCallback } from "react";
import MainScreen from "./screens/MainScreen.jsx";
import DedicationScreen from "./screens/DedicationScreen.jsx";
import DashboardScreen from "./screens/DashboardScreen.jsx";
import ArchiveScreen from "./screens/ArchiveScreen.jsx";
import CaptureScreen from "./screens/CaptureScreen.jsx";
import ShareScreen from "./screens/ShareScreen.jsx";
import SettingsScreen from "./screens/SettingsScreen.jsx";
import RecordDetailScreen from "./screens/RecordDetailScreen.jsx";
import SummaryScreen from "./screens/SummaryScreen.jsx";
import BottomNav from "./components/BottomNav.jsx";
import { archiveExists, createArchive, getDb, CANONICAL_FIELDS } from "./data/db.js";
import { computeSnapshot } from "./lib/chronology.js";
import { deleteSourceDocument } from "./lib/saveFlow.js";

/** Primary application routes for the public prototype. */
const PRIMARY_NAV_ROUTES = ["dashboard", "archive", "capture", "share", "settings"];

export default function App() {
  const [route, setRoute] = useState("loading");
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [archivePresent, setArchivePresent] = useState(false);
  const [filter, setFilter] = useState("all");
  const [recentRecords, setRecentRecords] = useState([]);
  const [allObservations, setAllObservations] = useState([]);
  const [allCorrections, setAllCorrections] = useState([]);
  const [snapshotRows, setSnapshotRows] = useState([]);

  useEffect(() => {
    (async () => {
      const exists = await archiveExists();
      setArchivePresent(exists);
      setRoute("main");
    })();
  }, []);

  const refreshDashboardData = useCallback(async () => {
    const db = await getDb();
    const sourceDocs = await db.getAll("sourceDocument");
    const observations = await db.getAll("observation");
    const corrections = await db.getAll("correctionAudit");

    const byField = {};
    for (const field of CANONICAL_FIELDS) byField[field.id] = [];
    for (const obs of observations) {
      if (byField[obs.canonicalFieldId]) byField[obs.canonicalFieldId].push(obs);
    }

    setSnapshotRows(computeSnapshot(byField, CANONICAL_FIELDS));
    setRecentRecords(sourceDocs.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt)));
    setAllObservations(observations);
    setAllCorrections(corrections);
  }, []);

  const handleCreate = () => setRoute("dedication");

  const handleDedicationContinue = async () => {
    await createArchive();
    setArchivePresent(true);
    await refreshDashboardData();
    setRoute("dashboard");
  };

  const handleUnlock = async () => {
    await refreshDashboardData();
    setRoute("dashboard");
  };

  const handleForgotPassword = () => setRoute("forgot-password-status");

  const handleNavigate = async (target, recordId) => {
    if (target === "record" && recordId) setSelectedRecordId(recordId);
    if (["dashboard", "archive", "summary"].includes(target)) {
      await refreshDashboardData();
    }
    setRoute(target);
  };

  const handleCaptureSaved = async (newRecordId) => {
    await refreshDashboardData();
    setSelectedRecordId(newRecordId);
    setRoute("record");
  };

  const handleDeleteRecord = async (sourceDocumentId) => {
    await deleteSourceDocument(sourceDocumentId);
    await refreshDashboardData();
  };

  const handleViewSource = (sourceDocument) => {
    if (!sourceDocument?.sourceBlob) return;
    const url = URL.createObjectURL(sourceDocument.sourceBlob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const handleDataCleared = async () => {
    setArchivePresent(false);
    setSnapshotRows([]);
    setRecentRecords([]);
    setAllObservations([]);
    setAllCorrections([]);
    setRoute("main");
  };

  if (route === "loading") {
    return <div className="hn-app-frame" />;
  }

  const selectedSourceDocument = recentRecords.find((d) => d.id === selectedRecordId) || null;
  const selectedObservations = allObservations.filter((o) => o.sourceDocumentId === selectedRecordId);
  const correctionAuditsByObservationId = {};
  for (const obs of selectedObservations) {
    correctionAuditsByObservationId[obs.id] = allCorrections.filter((c) =>
      (obs.correctionHistory || []).includes(c.id)
    );
  }

  return (
    <div className="hn-app-frame">
      <div className="hn-prototype-banner">
        PROTOTYPE — synthetic data only. Not for real medical information. Application security is not enabled.
      </div>

      {route === "main" && (
        <MainScreen
          archiveAlreadyExists={archivePresent}
          onCreate={handleCreate}
          onUnlock={handleUnlock}
          onForgotPassword={handleForgotPassword}
        />
      )}

      {route === "dedication" && <DedicationScreen onContinue={handleDedicationContinue} />}

      {route === "dashboard" && (
        <DashboardScreen
          snapshotRows={snapshotRows}
          recentRecords={recentRecords}
          filter={filter}
          onFilterChange={setFilter}
          onNavigate={handleNavigate}
          onOpenRecord={(id) => handleNavigate("record", id)}
        />
      )}

      {route === "archive" && (
        <ArchiveScreen
          sourceDocuments={recentRecords}
          onOpenRecord={(id) => handleNavigate("record", id)}
          onDelete={handleDeleteRecord}
          onBack={() => handleNavigate("dashboard")}
        />
      )}

      {route === "capture" && (
        <CaptureScreen onSaved={handleCaptureSaved} onBack={() => handleNavigate("dashboard")} />
      )}

      {route === "record" && (
        <RecordDetailScreen
          sourceDocument={selectedSourceDocument}
          observations={selectedObservations}
          correctionAuditsByObservationId={correctionAuditsByObservationId}
          onBack={() => handleNavigate("archive")}
          onViewSource={() => handleViewSource(selectedSourceDocument)}
        />
      )}

      {route === "summary" && (
        <SummaryScreen
          snapshotRows={snapshotRows}
          onOpenRecord={(id) => handleNavigate("record", id)}
          onBack={() => handleNavigate("dashboard")}
        />
      )}

      {route === "share" && (
        <ShareScreen
          snapshotRows={snapshotRows}
          observations={allObservations}
          sourceDocuments={recentRecords}
          onBack={() => handleNavigate("dashboard")}
        />
      )}

      {route === "settings" && (
        <SettingsScreen
          onBack={() => handleNavigate("dashboard")}
          onDataCleared={handleDataCleared}
          onOpenAbout={() => setRoute("dedication")}
        />
      )}

      {PRIMARY_NAV_ROUTES.includes(route) && (
        <BottomNav activeRoute={route} onNavigate={handleNavigate} />
      )}

      {route === "forgot-password-status" && (
        <PlaceholderScreen
          title="Forgot password"
          message="Available in security release."
          onBack={() => setRoute("main")}
        />
      )}
    </div>
  );
}

function PlaceholderScreen({ title, message, onBack }) {
  return (
    <div className="hn-placeholder-screen">
      <h2>{title}</h2>
      <p>{message}</p>
      <button type="button" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
