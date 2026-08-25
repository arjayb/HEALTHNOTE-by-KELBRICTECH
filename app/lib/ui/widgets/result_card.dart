import 'package:flutter/material.dart';
import '../../application/snapshot_service.dart';
import '../../theme/tokens.dart';
import 'status_badge.dart';

/// One card in the "Latest verified results" row. Despite the section
/// title inherited from the product specification, this card shows whatever
/// `FieldSnapshotResult.mostRecentOnFile` is — verified or not — per
/// the product rules: the newest record is never hidden just because
/// it's unverified.
class ResultCard extends StatelessWidget {
  final FieldSnapshotResult result;
  final String categoryLabel;
  final VoidCallback? onAttachVerified;
  final bool isAttached;

  const ResultCard({
    super.key,
    required this.result,
    required this.categoryLabel,
    this.onAttachVerified,
    this.isAttached = false,
  });

  @override
  Widget build(BuildContext context) {
    final record = result.mostRecentOnFile;
    return Container(
      width: 150,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: HNColors.navy850,
        borderRadius: BorderRadius.circular(HNRadii.standard),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          StatusBadge(
            verificationState: record.verificationState,
            isBaseline: record.isBaseline,
            compact: true,
          ),
          const SizedBox(height: 8),
          Text(
            categoryLabel,
            style: const TextStyle(
              fontFamily: HNType.uiFamily,
              fontSize: 11,
              color: HNColors.silver300,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            '${record.rawValue}${record.unit != null ? ' ${record.unit}' : ''}',
            style: const TextStyle(
              fontFamily: HNType.uiFamily,
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: HNColors.ivory50,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            _dateLabel(),
            style: const TextStyle(
              fontFamily: HNType.uiFamily,
              fontSize: 9.5,
              color: HNColors.slate500,
            ),
          ),
          if (result.needsVigilancePrompt)
            isAttached
                ? const Padding(
                    padding: EdgeInsets.only(top: 8),
                    child: Text(
                      '✓ Verified companion attached',
                      style: TextStyle(
                        fontFamily: HNType.uiFamily,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: HNColors.mint300,
                      ),
                    ),
                  )
                : VigilancePrompt(onAttach: onAttachVerified ?? () {}),
        ],
      ),
    );
  }

  String _dateLabel() {
    final ts = result.mostRecentOnFile.effectiveChronologyTimestamp;
    if (ts == null) return 'Date unknown';
    return '${ts.year}-${ts.month.toString().padLeft(2, '0')}-${ts.day.toString().padLeft(2, '0')}';
  }
}
