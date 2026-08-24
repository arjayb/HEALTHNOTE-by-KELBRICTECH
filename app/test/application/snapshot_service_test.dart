import 'package:flutter_test/flutter_test.dart';
import 'package:healthnote/domain/enums.dart';
import 'package:healthnote/domain/field_identity.dart';
import 'package:healthnote/domain/models.dart';
import 'package:healthnote/application/snapshot_service.dart';

/// STATUS: written, unrun — see record_entry_invariants_test.dart header.
void main() {
  final field = const FieldIdentity('blood_glucose');
  final service = SnapshotService();
  final now = DateTime.now();

  RecordEntry unverified({
    required String id,
    required int controlNumber,
    DateTime? clinicalDate,
    DateTime? observedAt,
    DateTime? createdAt,
  }) =>
      RecordEntry.unverified(
        id: id,
        controlNumber: controlNumber,
        ingestionSequence: controlNumber,
        fieldIdentity: field,
        rawValue: '$controlNumber',
        clinicalDate: clinicalDate,
        observedAt: observedAt,
        addedAt: now,
        createdAt: createdAt ?? now,
        dateProvenance:
            clinicalDate != null ? DateProvenance.dateFromSource : DateProvenance.dateUnknown,
        sourceType: SourceType.manualEntry,
      );

  RecordEntry verified({
    required String id,
    required int controlNumber,
    DateTime? clinicalDate,
    DateTime? observedAt,
    DateTime? createdAt,
  }) =>
      RecordEntry.verified(
        id: id,
        controlNumber: controlNumber,
        ingestionSequence: controlNumber,
        fieldIdentity: field,
        rawValue: '$controlNumber',
        clinicalDate: clinicalDate,
        observedAt: observedAt,
        addedAt: now,
        createdAt: createdAt ?? now,
        dateProvenance: DateProvenance.dateFromSource,
        verificationMethod: VerificationMethod.originalSource,
        sourceAttachmentId: 'doc_$id',
        sourceType: SourceType.labReport,
      );

  test('dated record outranks an undated record regardless of createdAt (§3.3 rule 2)', () {
    final dated = verified(
      id: 'dated',
      controlNumber: 1,
      clinicalDate: now.subtract(const Duration(days: 30)),
      createdAt: now.subtract(const Duration(days: 30)),
    );
    final undatedButRecentlyAdded = unverified(
      id: 'undated',
      controlNumber: 2,
      createdAt: now, // added just now, but has no clinical/observed date
    );

    final result = service.rankField(field, [dated, undatedButRecentlyAdded]);
    expect(result.mostRecentOnFile.id, 'dated');
  });

  test('newest stays newest even when unverified (§3.3 rule 4)', () {
    final olderVerified = verified(
      id: 'old_v',
      controlNumber: 1,
      clinicalDate: now.subtract(const Duration(days: 3)),
    );
    final newerUnverified = unverified(
      id: 'new_u',
      controlNumber: 2,
      clinicalDate: now.subtract(const Duration(hours: 1)),
    );

    final result = service.rankField(field, [olderVerified, newerUnverified]);
    expect(result.mostRecentOnFile.id, 'new_u');
    expect(result.mostRecentVerified?.id, 'old_v');
    expect(result.needsVigilancePrompt, isTrue);
  });

  test('no vigilance prompt when the newest record is itself verified', () {
    final onlyVerified = verified(id: 'v1', controlNumber: 1, clinicalDate: now);
    final result = service.rankField(field, [onlyVerified]);
    expect(result.needsVigilancePrompt, isFalse);
  });

  test('identical effective timestamps break tie on createdAt, then controlNumber', () {
    final sameClinical = now.subtract(const Duration(days: 1));
    final a = unverified(
      id: 'a',
      controlNumber: 1,
      clinicalDate: sameClinical,
      createdAt: now.subtract(const Duration(minutes: 5)),
    );
    final b = unverified(
      id: 'b',
      controlNumber: 2,
      clinicalDate: sameClinical,
      createdAt: now, // more recently created -> wins the tie
    );
    final result = service.rankField(field, [a, b]);
    expect(result.mostRecentOnFile.id, 'b');
  });

  test('applyFilter(showVerifiedOnly) excludes unverified but preserves labels on what remains', () {
    final v = verified(id: 'v', controlNumber: 1, clinicalDate: now);
    final u = unverified(id: 'u', controlNumber: 2, clinicalDate: now);
    final filtered = service.applyFilter([v, u], RecordFilter.showVerifiedOnly);
    expect(filtered.map((r) => r.id), ['v']);
    expect(filtered.first.displayLabel, contains('VERIFIED'));
  });

  test('applyFilter(showAll) is the default and returns everything unfiltered', () {
    final v = verified(id: 'v', controlNumber: 1, clinicalDate: now);
    final u = unverified(id: 'u', controlNumber: 2, clinicalDate: now);
    final filtered = service.applyFilter([v, u], RecordFilter.showAll);
    expect(filtered.length, 2);
  });

  test('VigilanceSelectionStore tracks attachment independently per context', () {
    final store = VigilanceSelectionStore();
    expect(store.isAttached(field, VigilanceContext.snapshot), isFalse);

    store.attach(field, VigilanceContext.snapshot);
    expect(store.isAttached(field, VigilanceContext.snapshot), isTrue);
    expect(store.isAttached(field, VigilanceContext.pdfExport), isFalse);

    store.attach(field, VigilanceContext.pdfExport);
    expect(store.isAttached(field, VigilanceContext.pdfExport), isTrue);

    store.detach(field, VigilanceContext.snapshot);
    expect(store.isAttached(field, VigilanceContext.snapshot), isFalse);
    expect(store.isAttached(field, VigilanceContext.pdfExport), isTrue);
  });
}
