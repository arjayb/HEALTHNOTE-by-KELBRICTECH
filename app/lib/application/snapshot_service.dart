import '../domain/enums.dart';
import '../domain/field_identity.dart';
import '../domain/models.dart';

class FieldSnapshotResult {
  final FieldIdentity fieldIdentity;
  final RecordEntry mostRecentOnFile;
  final RecordEntry? mostRecentVerified;

  const FieldSnapshotResult({
    required this.fieldIdentity,
    required this.mostRecentOnFile,
    this.mostRecentVerified,
  });

  bool get needsVigilancePrompt =>
      mostRecentOnFile.verificationState == VerificationState.unverified &&
      mostRecentVerified != null;
}

/// The contexts in which a user's choice to attach a verified
/// companion record can independently apply.
/// rule 6: a user may want the comparison on a provider-facing PDF
/// without it cluttering the everyday dashboard.
enum VigilanceContext { snapshot, detailedReport, pdfExport, protectedShare }

/// Real, queryable state for "did the user choose to attach the most
/// recent verified companion record" — per field, per context. This
/// replaces the earlier scaffold's empty `onAttachVerified` callback,
/// which recorded nothing.
class VigilanceSelectionStore {
  final Map<String, Set<VigilanceContext>> _selections = {};

  String _key(FieldIdentity field) => field.canonicalKey;

  void attach(FieldIdentity field, VigilanceContext context) {
    _selections.putIfAbsent(_key(field), () => {}).add(context);
  }

  void detach(FieldIdentity field, VigilanceContext context) {
    _selections[_key(field)]?.remove(context);
  }

  bool isAttached(FieldIdentity field, VigilanceContext context) {
    return _selections[_key(field)]?.contains(context) ?? false;
  }
}

/// Which entries should show in a filtered dashboard/archive view.
/// Product rule: default is showAll; showVerifiedOnly is opt-in and
/// must not be the default lens.
enum RecordFilter { showAll, showVerifiedOnly }

class SnapshotService {
  FieldSnapshotResult rankField(
    FieldIdentity fieldIdentity,
    List<RecordEntry> records,
  ) {
    assert(records.isNotEmpty, 'rankField called with no records');
    assert(
      records.every((r) => r.fieldIdentity == fieldIdentity),
      'rankField received records from more than one field',
    );

    final sorted = [...records]..sort(_compareForRanking);
    final mostRecentOnFile = sorted.first;

    final verifiedOnly =
        sorted.where((r) => r.verificationState == VerificationState.verified).toList();
    final mostRecentVerified = verifiedOnly.isEmpty ? null : verifiedOnly.first;

    return FieldSnapshotResult(
      fieldIdentity: fieldIdentity,
      mostRecentOnFile: mostRecentOnFile,
      mostRecentVerified: mostRecentVerified,
    );
  }

  List<FieldSnapshotResult> buildSnapshot(List<RecordEntry> allRecords) {
    final byField = <FieldIdentity, List<RecordEntry>>{};
    for (final r in allRecords) {
      byField.putIfAbsent(r.fieldIdentity, () => []).add(r);
    }
    return byField.entries.map((e) => rankField(e.key, e.value)).toList(growable: false);
  }

  /// Applies a [RecordFilter] to a set of records for a field, WITHOUT
  /// changing ranking. Per: "Show all entries" must preserve
  /// permanent VERIFIED/UNVERIFIED labels — filtering only changes
  /// which records are included, never how they're labeled.
  List<RecordEntry> applyFilter(List<RecordEntry> records, RecordFilter filter) {
    if (filter == RecordFilter.showAll) return records;
    return records.where((r) => r.verificationState == VerificationState.verified).toList();
  }

  /// Comparator implementing rules 1-4, newest first.
  int _compareForRanking(RecordEntry a, RecordEntry b) {
    final aTs = a.effectiveChronologyTimestamp;
    final bTs = b.effectiveChronologyTimestamp;

    if (aTs != null && bTs != null) {
      final cmp = bTs.compareTo(aTs);
      if (cmp != 0) return cmp;
    } else if (aTs != null && bTs == null) {
      return -1;
    } else if (aTs == null && bTs != null) {
      return 1;
    }

    final createdCmp = b.createdAt.compareTo(a.createdAt);
    if (createdCmp != 0) return createdCmp;

    return b.controlNumber.compareTo(a.controlNumber);
    // Rules 5 & 6 (verification never alters chronology) are enforced
    // by never referencing verificationState in this comparator.
  }
}
