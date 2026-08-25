import 'package:flutter_test/flutter_test.dart';
import 'package:healthnote/domain/enums.dart';
import 'package:healthnote/domain/field_identity.dart';
import 'package:healthnote/domain/models.dart';

/// Domain-level invariant coverage for record verification behavior.
void main() {
  final field = const FieldIdentity('blood_glucose');
  final now = DateTime.now();

  group('RecordEntry.verified invariants', () {
    test('originalSource requires a non-empty sourceAttachmentId', () {
      expect(
        () => RecordEntry.verified(
          id: 'a',
          controlNumber: 1,
          ingestionSequence: 1,
          fieldIdentity: field,
          rawValue: '100',
          addedAt: now,
          createdAt: now,
          dateProvenance: DateProvenance.dateFromSource,
          verificationMethod: VerificationMethod.originalSource,
          sourceAttachmentId: null,
          sourceType: SourceType.labReport,
        ),
        throwsA(isA<InvalidRecordStateException>()),
      );
    });

    test('originalSource with empty-string attachment id also fails', () {
      expect(
        () => RecordEntry.verified(
          id: 'a',
          controlNumber: 1,
          ingestionSequence: 1,
          fieldIdentity: field,
          rawValue: '100',
          addedAt: now,
          createdAt: now,
          dateProvenance: DateProvenance.dateFromSource,
          verificationMethod: VerificationMethod.originalSource,
          sourceAttachmentId: '   ',
          sourceType: SourceType.labReport,
        ),
        throwsA(isA<InvalidRecordStateException>()),
      );
    });

    test('systemTimestampedCapture requires observedAt', () {
      expect(
        () => RecordEntry.verified(
          id: 'a',
          controlNumber: 1,
          ingestionSequence: 1,
          fieldIdentity: field,
          rawValue: '100',
          addedAt: now,
          createdAt: now,
          dateProvenance: DateProvenance.systemObserved,
          verificationMethod: VerificationMethod.systemTimestampedCapture,
          observedAt: null,
          sourceType: SourceType.digitalMonitor,
        ),
        throwsA(isA<InvalidRecordStateException>()),
      );
    });

    test('verificationMethod.none is rejected by the verified factory', () {
      expect(
        () => RecordEntry.verified(
          id: 'a',
          controlNumber: 1,
          ingestionSequence: 1,
          fieldIdentity: field,
          rawValue: '100',
          addedAt: now,
          createdAt: now,
          dateProvenance: DateProvenance.dateUnknown,
          verificationMethod: VerificationMethod.none,
          sourceType: SourceType.manualEntry,
        ),
        throwsA(isA<InvalidRecordStateException>()),
      );
    });

    test('valid originalSource construction succeeds', () {
      final r = RecordEntry.verified(
        id: 'a',
        controlNumber: 1,
        ingestionSequence: 1,
        fieldIdentity: field,
        rawValue: '100',
        addedAt: now,
        createdAt: now,
        dateProvenance: DateProvenance.dateFromSource,
        verificationMethod: VerificationMethod.originalSource,
        sourceAttachmentId: 'doc_123',
        sourceType: SourceType.labReport,
      );
      expect(r.verificationState, VerificationState.verified);
      expect(r.isBaseline, isFalse); // never set by the factory — see
    });

    test('valid systemTimestampedCapture construction succeeds', () {
      final r = RecordEntry.verified(
        id: 'a',
        controlNumber: 1,
        ingestionSequence: 1,
        fieldIdentity: field,
        rawValue: '100',
        observedAt: now,
        addedAt: now,
        createdAt: now,
        dateProvenance: DateProvenance.systemObserved,
        verificationMethod: VerificationMethod.systemTimestampedCapture,
        sourceType: SourceType.digitalMonitor,
      );
      expect(r.verificationState, VerificationState.verified);
    });
  });

  group('RecordEntry.unverified invariants', () {
    test('always has verificationMethod.none regardless of caller', () {
      final r = RecordEntry.unverified(
        id: 'b',
        controlNumber: 2,
        ingestionSequence: 2,
        fieldIdentity: field,
        rawValue: '142',
        addedAt: now,
        createdAt: now,
        dateProvenance: DateProvenance.manuallyEntered,
        sourceType: SourceType.manualEntry,
      );
      expect(r.verificationMethod, VerificationMethod.none);
      expect(r.verificationState, VerificationState.unverified);
    });
  });

  group('effectiveChronologyTimestamp', () {
    test('prefers clinicalDate over observedAt', () {
      final clinical = now.subtract(const Duration(days: 1));
      final observed = now;
      final r = RecordEntry.unverified(
        id: 'c',
        controlNumber: 3,
        ingestionSequence: 3,
        fieldIdentity: field,
        rawValue: '1',
        clinicalDate: clinical,
        observedAt: observed,
        addedAt: now,
        createdAt: now,
        dateProvenance: DateProvenance.dateFromSource,
        sourceType: SourceType.labReport,
      );
      expect(r.effectiveChronologyTimestamp, clinical);
    });

    test('addedAt is never used as chronology even when it is the only date-like field', () {
      final r = RecordEntry.unverified(
        id: 'd',
        controlNumber: 4,
        ingestionSequence: 4,
        fieldIdentity: field,
        rawValue: '1',
        addedAt: now,
        createdAt: now,
        dateProvenance: DateProvenance.addedToHealthNote,
        sourceType: SourceType.manualEntry,
      );
      expect(r.effectiveChronologyTimestamp, isNull);
    });
  });
}
