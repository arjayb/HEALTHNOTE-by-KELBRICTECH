import 'dart:async';
import '../../domain/audit.dart';
import '../../domain/field_identity.dart';
import '../../domain/models.dart';

/// Repository contract for record persistence. The concrete
/// implementation using encrypted local storage is not included in this
/// scaffold; see README.md. What is
/// written here, for real, is the transactional shape that the
/// concrete implementation must follow for baseline/control-number
/// allocation, because getting that shape wrong (e.g. read-then-write
/// without a transaction) is exactly how two concurrent captures could
/// both become BASELINE for the same field, or collide on a control
/// number.
abstract class RecordRepository {
  /// Ingests a new record. This is the ONLY sanctioned way a record
  /// enters the store — it always runs the allocation transaction in
  /// [ingestWithAllocation], so callers (OCR workflow, manual-entry
  /// workflow, import) never allocate control numbers or decide
  /// baseline status themselves.
  Future<RecordEntry> ingest({
    required FieldIdentity fieldIdentity,
    required RecordEntry Function(int controlNumber, int ingestionSequence) build,
  });

  Future<List<RecordEntry>> allRecordsForField(FieldIdentity fieldIdentity);
  Future<List<RecordEntry>> allRecords();
  Future<void> recordCorrection(String recordId, CorrectionHistoryEntry correction);
  Future<void> deleteRecord(String recordId, {required String reason});
  Future<List<AuditEvent>> auditHistory({String? recordId});
}

/// A transactional store abstraction the real repository depends on —
/// standing in for whatever the concrete drift/sqlite transaction API
/// actually is. Naming it explicitly here (rather than hiding a
/// transaction inside a single method) is deliberate: the earlier
/// scaffold's `BaselineAssigner` scanned an in-memory list after the
/// fact, which cannot prevent a race between two concurrent captures.
/// A real implementation must serialize allocation through this kind
/// of primitive, not through application-level sequencing.
abstract class TransactionalStore {
  Future<T> runInTransaction<T>(Future<T> Function() action);
  Future<int> nextControlNumber();
  Future<int> nextIngestionSequence();
  Future<bool> baselineExistsForField(FieldIdentity fieldIdentity);
  Future<void> persistRecord(RecordEntry record);
  Future<void> persistAuditEvent(AuditEvent event);
}

/// Reference implementation of the allocation transaction shape.
/// Depends on [TransactionalStore] rather than a concrete database so
/// it can be unit-tested against a fake — see
/// test/domain/baseline_allocation_test.dart for exactly that.
///
/// STATUS: this class is real, reviewable logic — not a stub — but it
/// has only been exercised against a fake in-memory TransactionalStore
/// in tests written in this pass, never against a real database. The
/// concurrency guarantee is only as strong as whatever
/// runInTransaction's real implementation actually provides; that must
/// be verified against the chosen database's actual isolation
/// guarantees before this is trusted under real concurrent writes.
class TransactionalRecordRepository implements RecordRepository {
  final TransactionalStore _store;
  int _idCounter = 0;

  TransactionalRecordRepository(this._store);

  @override
  Future<RecordEntry> ingest({
    required FieldIdentity fieldIdentity,
    required RecordEntry Function(int controlNumber, int ingestionSequence) build,
  }) {
    return _store.runInTransaction(() async {
      final controlNumber = await _store.nextControlNumber();
      final ingestionSequence = await _store.nextIngestionSequence();

      final alreadyHasBaseline = await _store.baselineExistsForField(fieldIdentity);

      var record = build(controlNumber, ingestionSequence);
      if (!alreadyHasBaseline) {
        record = record.withBaselineFlagFromRepository(true);
      }

      await _store.persistRecord(record);

      final now = DateTime.now();
      await _store.persistAuditEvent(RecordCreatedEvent(
        id: 'evt_${_idCounter++}',
        occurredAt: now,
        recordId: record.id,
        controlNumber: controlNumber,
        fieldIdentity: fieldIdentity,
      ));

      if (!alreadyHasBaseline) {
        await _store.persistAuditEvent(BaselineAssignedEvent(
          id: 'evt_${_idCounter++}',
          occurredAt: now,
          recordId: record.id,
          fieldIdentity: fieldIdentity,
        ));
      }

      return record;
    });
  }

  @override
  Future<void> deleteRecord(String recordId, {required String reason}) {
    // Real implementation: load the record inside a transaction, write
    // a DeletionTombstoneEvent preserving its controlNumber/fieldIdentity
    // /isBaseline, then remove it. Deliberately does NOT search for or
    // assign a replacement baseline — per, that requires a
    // separate, explicit product action, never an automatic side
    // effect of deletion.
    throw UnimplementedError(
      'Needs a concrete TransactionalStore — not implemented against a real '
      'database in this scaffold. Shape: load record, persist '
      'DeletionTombstoneEvent(controlNumber, fieldIdentity, wasBaseline, reason), '
      'then remove the record row, all inside one transaction.',
    );
  }

  @override
  Future<List<RecordEntry>> allRecordsForField(FieldIdentity fieldIdentity) {
    throw UnimplementedError('Needs a concrete TransactionalStore/query layer.');
  }

  @override
  Future<List<RecordEntry>> allRecords() {
    throw UnimplementedError('Needs a concrete TransactionalStore/query layer.');
  }

  @override
  Future<void> recordCorrection(String recordId, CorrectionHistoryEntry correction) {
    // Real implementation: inside a transaction, append to
    // correctionHistory, and if the corrected field is material (value,
    // unit, clinical date, patient-identity field, medication identity,
    // dosage) and the record is not still directly source-supported,
    // demote verificationState to unverified and persist a
    // VerificationStateChangedEvent — per.
    throw UnimplementedError('Needs a concrete TransactionalStore.');
  }

  @override
  Future<List<AuditEvent>> auditHistory({String? recordId}) {
    throw UnimplementedError('Needs a concrete TransactionalStore/query layer.');
  }
}
