import 'package:flutter_test/flutter_test.dart';
import 'package:healthnote/domain/audit.dart';
import 'package:healthnote/domain/enums.dart';
import 'package:healthnote/domain/field_identity.dart';
import 'package:healthnote/domain/models.dart';
import 'package:healthnote/data/repository/record_repository.dart';

/// In-memory fake for [TransactionalStore], used only to test
/// [TransactionalRecordRepository]'s allocation logic in isolation from
/// any real database. This fake's `runInTransaction` is NOT actually
/// atomic against concurrent Dart isolates — it only proves the
/// allocation *logic* is correct given a serialized call order. Real
/// concurrency safety depends on the concrete database's isolation
/// guarantees and is explicitly NOT proven by these tests — see
/// record_repository.dart's class doc comment.
class FakeTransactionalStore implements TransactionalStore {
  int _controlNumberCounter = 0;
  int _ingestionSequenceCounter = 0;
  final Set<String> _fieldsWithBaseline = {};
  final List<RecordEntry> persistedRecords = [];
  final List<AuditEvent> persistedEvents = [];

  @override
  Future<T> runInTransaction<T>(Future<T> Function() action) => action();

  @override
  Future<int> nextControlNumber() async => ++_controlNumberCounter;

  @override
  Future<int> nextIngestionSequence() async => ++_ingestionSequenceCounter;

  @override
  Future<bool> baselineExistsForField(FieldIdentity fieldIdentity) async =>
      _fieldsWithBaseline.contains(fieldIdentity.canonicalKey);

  @override
  Future<void> persistRecord(RecordEntry record) async {
    persistedRecords.add(record);
    if (record.isBaseline) {
      _fieldsWithBaseline.add(record.fieldIdentity.canonicalKey);
    }
  }

  @override
  Future<void> persistAuditEvent(AuditEvent event) async {
    persistedEvents.add(event);
  }
}

void main() {
  final field = const FieldIdentity('blood_glucose');
  final now = DateTime.now();

  RecordEntry Function(int, int) buildUnverified(String id) {
    return (controlNumber, ingestionSequence) => RecordEntry.unverified(
          id: id,
          controlNumber: controlNumber,
          ingestionSequence: ingestionSequence,
          fieldIdentity: field,
          rawValue: '100',
          addedAt: now,
          createdAt: now,
          dateProvenance: DateProvenance.manuallyEntered,
          sourceType: SourceType.manualEntry,
        );
  }

  test('first record for a field is assigned BASELINE', () async {
    final store = FakeTransactionalStore();
    final repo = TransactionalRecordRepository(store);

    final r = await repo.ingest(fieldIdentity: field, build: buildUnverified('r1'));

    expect(r.isBaseline, isTrue);
    expect(store.persistedEvents.whereType<BaselineAssignedEvent>().length, 1);
  });

  test('second record for the same field is NOT assigned BASELINE', () async {
    final store = FakeTransactionalStore();
    final repo = TransactionalRecordRepository(store);

    await repo.ingest(fieldIdentity: field, build: buildUnverified('r1'));
    final second = await repo.ingest(fieldIdentity: field, build: buildUnverified('r2'));

    expect(second.isBaseline, isFalse);
    expect(store.persistedEvents.whereType<BaselineAssignedEvent>().length, 1);
  });

  test('control numbers are sequential and never reused within a session', () async {
    final store = FakeTransactionalStore();
    final repo = TransactionalRecordRepository(store);

    final a = await repo.ingest(fieldIdentity: field, build: buildUnverified('a'));
    final b = await repo.ingest(fieldIdentity: field, build: buildUnverified('b'));

    expect(a.controlNumber, isNot(equals(b.controlNumber)));
    expect(b.controlNumber, greaterThan(a.controlNumber));
  });

  test('baseline is per-field: a different field gets its own baseline', () async {
    final store = FakeTransactionalStore();
    final repo = TransactionalRecordRepository(store);
    const otherField = FieldIdentity('weight');

    final glucose = await repo.ingest(fieldIdentity: field, build: buildUnverified('g1'));
    final weight = await repo.ingest(
      fieldIdentity: otherField,
      build: (cn, seq) => RecordEntry.unverified(
        id: 'w1',
        controlNumber: cn,
        ingestionSequence: seq,
        fieldIdentity: otherField,
        rawValue: '70',
        addedAt: now,
        createdAt: now,
        dateProvenance: DateProvenance.manuallyEntered,
        sourceType: SourceType.manualEntry,
      ),
    );

    expect(glucose.isBaseline, isTrue);
    expect(weight.isBaseline, isTrue);
  });

  test('every ingest produces a RecordCreatedEvent', () async {
    final store = FakeTransactionalStore();
    final repo = TransactionalRecordRepository(store);

    await repo.ingest(fieldIdentity: field, build: buildUnverified('a'));
    await repo.ingest(fieldIdentity: field, build: buildUnverified('b'));

    expect(store.persistedEvents.whereType<RecordCreatedEvent>().length, 2);
  });
}
