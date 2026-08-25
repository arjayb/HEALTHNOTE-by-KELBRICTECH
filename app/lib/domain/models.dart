import 'enums.dart';
import 'field_identity.dart';

class CorrectionHistoryEntry {
  final DateTime editedAt;
  final String fieldChanged;
  final String previousValue;
  final String newValue;
  final String? reason;

  const CorrectionHistoryEntry({
    required this.editedAt,
    required this.fieldChanged,
    required this.previousValue,
    required this.newValue,
    this.reason,
  });
}

/// Thrown when an attempt is made to construct a [RecordEntry] in a
/// state the domain forbids — see the architecture.
class InvalidRecordStateException implements Exception {
  final String message;
  const InvalidRecordStateException(this.message);
  @override
  String toString() => 'InvalidRecordStateException: $message';
}

/// One captured/entered health fact.
///
/// No public unnamed constructor — every instance is built through
/// [RecordEntry.verified] or [RecordEntry.unverified], which enforce
/// the domain invariants from the architecture before
/// the object can exist. Fixes the earlier scaffold, whose open
/// constructor allowed e.g. VERIFIED with no source and no observedAt.
///
/// controlNumber/ingestionSequence are still constructor parameters —
/// the *value* comes from the repository's atomic allocation.
/// This class only guarantees they can't be mutated afterward (no
/// setters); correct allocation is the repository's responsibility.
class RecordEntry {
  final String id;
  final int controlNumber;
  final int ingestionSequence;
  final FieldIdentity fieldIdentity;

  final String rawValue;
  final String? unit;

  final DateTime? clinicalDate;
  final DateTime? observedAt;
  final DateTime addedAt;
  final DateTime createdAt;
  final DateProvenance dateProvenance;

  final VerificationState verificationState;
  final VerificationMethod verificationMethod;
  final String? sourceAttachmentId;

  final SourceType sourceType;
  final bool isBaseline;

  final double? ocrConfidence;
  final String? originalExtractedText;
  final String? sourceImageRef;

  final List<CorrectionHistoryEntry> correctionHistory;

  const RecordEntry._({
    required this.id,
    required this.controlNumber,
    required this.ingestionSequence,
    required this.fieldIdentity,
    required this.rawValue,
    this.unit,
    this.clinicalDate,
    this.observedAt,
    required this.addedAt,
    required this.createdAt,
    required this.dateProvenance,
    required this.verificationState,
    required this.verificationMethod,
    this.sourceAttachmentId,
    required this.sourceType,
    required this.isBaseline,
    this.ocrConfidence,
    this.originalExtractedText,
    this.sourceImageRef,
    this.correctionHistory = const [],
  });

  /// VERIFIED requires EITHER a valid source attachment (original-source
  /// path) OR observedAt + capture provenance (system-timestamped path)
  /// — enforced here, not left to caller discipline. isBaseline is not
  /// a parameter: it's assigned only by the repository transaction
  ///, never at construction, so workflow/UI code can't set it.
  factory RecordEntry.verified({
    required String id,
    required int controlNumber,
    required int ingestionSequence,
    required FieldIdentity fieldIdentity,
    required String rawValue,
    String? unit,
    DateTime? clinicalDate,
    DateTime? observedAt,
    required DateTime addedAt,
    required DateTime createdAt,
    required DateProvenance dateProvenance,
    required VerificationMethod verificationMethod,
    String? sourceAttachmentId,
    required SourceType sourceType,
    double? ocrConfidence,
    String? originalExtractedText,
    String? sourceImageRef,
    List<CorrectionHistoryEntry> correctionHistory = const [],
  }) {
    if (verificationMethod == VerificationMethod.originalSource) {
      if (sourceAttachmentId == null || sourceAttachmentId.trim().isEmpty) {
        throw const InvalidRecordStateException(
          'VERIFIED via originalSource requires a non-empty sourceAttachmentId.',
        );
      }
    } else if (verificationMethod == VerificationMethod.systemTimestampedCapture) {
      if (observedAt == null) {
        throw const InvalidRecordStateException(
          'VERIFIED via systemTimestampedCapture requires observedAt to be set.',
        );
      }
    } else {
      throw const InvalidRecordStateException(
        'VERIFIED records must have verificationMethod originalSource or '
        'systemTimestampedCapture — user confirmation alone is not sufficient '
        '(the architecture).',
      );
    }

    return RecordEntry._(
      id: id,
      controlNumber: controlNumber,
      ingestionSequence: ingestionSequence,
      fieldIdentity: fieldIdentity,
      rawValue: rawValue,
      unit: unit,
      clinicalDate: clinicalDate,
      observedAt: observedAt,
      addedAt: addedAt,
      createdAt: createdAt,
      dateProvenance: dateProvenance,
      verificationState: VerificationState.verified,
      verificationMethod: verificationMethod,
      sourceAttachmentId: sourceAttachmentId,
      sourceType: sourceType,
      isBaseline: false,
      ocrConfidence: ocrConfidence,
      originalExtractedText: originalExtractedText,
      sourceImageRef: sourceImageRef,
      correctionHistory: correctionHistory,
    );
  }

  /// UNVERIFIED. verificationMethod is forced to `none` — an unverified
  /// record cannot simultaneously claim a verification method.
  factory RecordEntry.unverified({
    required String id,
    required int controlNumber,
    required int ingestionSequence,
    required FieldIdentity fieldIdentity,
    required String rawValue,
    String? unit,
    DateTime? clinicalDate,
    DateTime? observedAt,
    required DateTime addedAt,
    required DateTime createdAt,
    required DateProvenance dateProvenance,
    String? sourceAttachmentId,
    required SourceType sourceType,
    double? ocrConfidence,
    String? originalExtractedText,
    String? sourceImageRef,
    List<CorrectionHistoryEntry> correctionHistory = const [],
  }) {
    return RecordEntry._(
      id: id,
      controlNumber: controlNumber,
      ingestionSequence: ingestionSequence,
      fieldIdentity: fieldIdentity,
      rawValue: rawValue,
      unit: unit,
      clinicalDate: clinicalDate,
      observedAt: observedAt,
      addedAt: addedAt,
      createdAt: createdAt,
      dateProvenance: dateProvenance,
      verificationState: VerificationState.unverified,
      verificationMethod: VerificationMethod.none,
      sourceAttachmentId: sourceAttachmentId,
      sourceType: sourceType,
      isBaseline: false,
      ocrConfidence: ocrConfidence,
      originalExtractedText: originalExtractedText,
      sourceImageRef: sourceImageRef,
      correctionHistory: correctionHistory,
    );
  }

  /// Only for repository use, immediately after the transactional
  /// baseline check in. Nothing outside the repository should call
  /// this — see the extension below and its doc comment.
  RecordEntry withBaselineFlagFromRepository(bool value) => RecordEntry._(
        id: id,
        controlNumber: controlNumber,
        ingestionSequence: ingestionSequence,
        fieldIdentity: fieldIdentity,
        rawValue: rawValue,
        unit: unit,
        clinicalDate: clinicalDate,
        observedAt: observedAt,
        addedAt: addedAt,
        createdAt: createdAt,
        dateProvenance: dateProvenance,
        verificationState: verificationState,
        verificationMethod: verificationMethod,
        sourceAttachmentId: sourceAttachmentId,
        sourceType: sourceType,
        isBaseline: value,
        ocrConfidence: ocrConfidence,
        originalExtractedText: originalExtractedText,
        sourceImageRef: sourceImageRef,
        correctionHistory: correctionHistory,
      );

  /// clinicalDate wins; observedAt is valid only for a contemporaneous
  /// system-timestamped capture; addedAt is NEVER used.
  DateTime? get effectiveChronologyTimestamp => clinicalDate ?? observedAt;

  String get displayLabel {
    final parts = <String>[
      verificationState == VerificationState.verified ? 'VERIFIED' : 'UNVERIFIED',
    ];
    if (isBaseline) parts.add('BASELINE');
    return parts.join(' · ');
  }
}

class Profile {
  final DateTime birthdate;
  final String securityQuestionId;
  final String securityAnswerHashB64;
  final bool biometricEnrolled;

  final String wrappedDekViaPasswordB64;
  final String wrappedDekViaRecoveryB64;
  final String? wrappedDekViaBiometricRef;

  const Profile({
    required this.birthdate,
    required this.securityQuestionId,
    required this.securityAnswerHashB64,
    required this.biometricEnrolled,
    required this.wrappedDekViaPasswordB64,
    required this.wrappedDekViaRecoveryB64,
    this.wrappedDekViaBiometricRef,
  });
}
