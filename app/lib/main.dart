import 'package:flutter/material.dart';
import 'domain/enums.dart';
import 'domain/field_identity.dart';
import 'domain/models.dart';
import 'application/snapshot_service.dart';
import 'ui/screens/dedication_screen.dart';
import 'ui/screens/main_screen.dart';
import 'ui/screens/dashboard_screen.dart';

/// STATUS: wires the three screens together with illustrative fixture
/// data so the flow can be reviewed end to end. Not run — no Flutter
/// SDK in this sandbox (see README.md). Real data comes from the
/// (not-yet-implemented against a real DB) TransactionalRecordRepository.
void main() {
  runApp(const HealthNoteApp());
}

class HealthNoteApp extends StatelessWidget {
  const HealthNoteApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'HealthNote',
      debugShowCheckedModeBanner: false,
      home: const _FlowRoot(),
    );
  }
}

class _FlowRoot extends StatefulWidget {
  const _FlowRoot();
  @override
  State<_FlowRoot> createState() => _FlowRootState();
}

enum _Screen { dedication, main, dashboard }

class _FlowRootState extends State<_FlowRoot> {
  _Screen _screen = _Screen.dedication;
  bool _hasProfile = false;

  final _fieldRegistry = FieldRegistry();
  final _vigilanceStore = VigilanceSelectionStore();

  @override
  Widget build(BuildContext context) {
    switch (_screen) {
      case _Screen.dedication:
        return DedicationScreen(onContinue: () => setState(() => _screen = _Screen.main));
      case _Screen.main:
        return MainScreen(
          hasProfile: _hasProfile,
          onCreate: () => setState(() {
            _hasProfile = true;
            _screen = _Screen.dashboard;
          }),
          onUnlock: () => setState(() => _screen = _Screen.dashboard),
          onForgotPassword: () {},
        );
      case _Screen.dashboard:
        final snapshot = _sampleSnapshot();
        return DashboardScreen(
          snapshotResults: snapshot,
          fieldRegistry: _fieldRegistry,
          recentRecords: snapshot.map((r) => r.mostRecentOnFile).toList(),
          vigilanceStore: _vigilanceStore,
        );
    }
  }

  /// Illustrative fixture data built through the validated factories —
  /// deliberately includes a field (blood_glucose) where the newest
  /// record is UNVERIFIED with an older VERIFIED record available, to
  /// exercise the §3.3 vigilance prompt and the new attach-state wiring.
  List<FieldSnapshotResult> _sampleSnapshot() {
    final now = DateTime.now();
    final service = SnapshotService();

    final glucoseNewUnverified = RecordEntry.unverified(
      id: 'r1',
      controlNumber: 3,
      ingestionSequence: 3,
      fieldIdentity: const FieldIdentity('blood_glucose'),
      rawValue: '142',
      unit: 'mg/dL',
      clinicalDate: now.subtract(const Duration(hours: 2)),
      addedAt: now,
      createdAt: now,
      dateProvenance: DateProvenance.manuallyEntered,
      sourceType: SourceType.manualEntry,
    );

    final glucoseOldVerified = RecordEntry.verified(
      id: 'r0',
      controlNumber: 1,
      ingestionSequence: 1,
      fieldIdentity: const FieldIdentity('blood_glucose'),
      rawValue: '108',
      unit: 'mg/dL',
      observedAt: now.subtract(const Duration(days: 3)),
      addedAt: now.subtract(const Duration(days: 3)),
      createdAt: now.subtract(const Duration(days: 3)),
      dateProvenance: DateProvenance.systemObserved,
      verificationMethod: VerificationMethod.systemTimestampedCapture,
      sourceType: SourceType.digitalMonitor,
    ).withBaselineFlagFromRepository(true); // illustrating repository-assigned baseline

    return [
      service.rankField(
        const FieldIdentity('blood_glucose'),
        [glucoseNewUnverified, glucoseOldVerified],
      ),
    ];
  }
}
