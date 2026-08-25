import 'field_identity.dart';

/// Immutable audit log entry. Every material state change produces one
/// — see the architecture. These are append-only: the
/// repository must never update or delete an AuditEvent, only add new
/// ones (including for deletions of the thing being audited).
sealed class AuditEvent {
  final String id;
  final DateTime occurredAt;
  final String recordId; // the RecordEntry.id this event concerns

  const AuditEvent({
    required this.id,
    required this.occurredAt,
    required this.recordId,
  });
}

class RecordCreatedEvent extends AuditEvent {
  final int controlNumber;
  final FieldIdentity fieldIdentity;
  const RecordCreatedEvent({
    required super.id,
    required super.occurredAt,
    required super.recordId,
    required this.controlNumber,
    required this.fieldIdentity,
  });
}

class VerificationStateChangedEvent extends AuditEvent {
  final String fromState;
  final String toState;
  final String reason;
  const VerificationStateChangedEvent({
    required super.id,
    required super.occurredAt,
    required super.recordId,
    required this.fromState,
    required this.toState,
    required this.reason,
  });
}

class MaterialCorrectionEvent extends AuditEvent {
  final String fieldChanged;
  final String previousValue;
  final String newValue;
  const MaterialCorrectionEvent({
    required super.id,
    required super.occurredAt,
    required super.recordId,
    required this.fieldChanged,
    required this.previousValue,
    required this.newValue,
  });
}

class SourceAttachedEvent extends AuditEvent {
  final String sourceAttachmentId;
  const SourceAttachedEvent({
    required super.id,
    required super.occurredAt,
    required super.recordId,
    required this.sourceAttachmentId,
  });
}

class SourceRemovedEvent extends AuditEvent {
  final String previousSourceAttachmentId;
  const SourceRemovedEvent({
    required super.id,
    required super.occurredAt,
    required super.recordId,
    required this.previousSourceAttachmentId,
  });
}

class BaselineAssignedEvent extends AuditEvent {
  final FieldIdentity fieldIdentity;
  const BaselineAssignedEvent({
    required super.id,
    required super.occurredAt,
    required super.recordId,
    required this.fieldIdentity,
  });
}

/// A baseline replacement only ever happens via explicit product
/// action — see. This event exists so that action is auditable;
/// nothing in the repository should ever emit this automatically.
class BaselineReplacedEvent extends AuditEvent {
  final FieldIdentity fieldIdentity;
  final String previousBaselineRecordId;
  final String initiatedByAction;
  const BaselineReplacedEvent({
    required super.id,
    required super.occurredAt,
    required super.recordId,
    required this.fieldIdentity,
    required this.previousBaselineRecordId,
    required this.initiatedByAction,
  });
}

/// Deletion tombstone. Per: deleting a record — baseline or
/// not — never silently removes it from history, and a deleted
/// baseline's field simply has no baseline afterward (no
/// auto-promotion). controlNumber is preserved here specifically so it
/// can never be reused.
class DeletionTombstoneEvent extends AuditEvent {
  final int controlNumber;
  final FieldIdentity fieldIdentity;
  final bool wasBaseline;
  final String reason;
  const DeletionTombstoneEvent({
    required super.id,
    required super.occurredAt,
    required super.recordId,
    required this.controlNumber,
    required this.fieldIdentity,
    required this.wasBaseline,
    required this.reason,
  });
}

class ExportCreatedEvent extends AuditEvent {
  final String exportKind; // 'pdf' | 'protected_share'
  final List<String> includedRecordIds;
  const ExportCreatedEvent({
    required super.id,
    required super.occurredAt,
    required super.recordId,
    required this.exportKind,
    required this.includedRecordIds,
  });
}
